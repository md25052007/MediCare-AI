import chromadb
import sys
import os
import torch
from transformers import pipeline
from datetime import datetime


# Add parent directory to path to ensure scripts and app modules are findable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from . import config
from .rbac import create_filter
from scripts.medical_encoder import MedicalBERT

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline, BitsAndBytesConfig

from groq import Groq
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

if not os.getenv("GROQ_API_KEY"):
    parent_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    load_dotenv(dotenv_path=parent_env_path)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class EHRQueryEngine:
    def __init__(self):
        # 1. Initialize ChromaDB (Keep your original persistent logic)
        try:
            self.client = chromadb.PersistentClient(path=config.CHROMA_DB_PATH)
            self.collection = self.client.get_collection(name=config.COLLECTION_NAME)
        except Exception as e:
            print(f"⚠️ Warning: ChromaDB not found: {e}")
            self.collection = None

        # 2. Load Medical BERT for Search
        self.encoder = MedicalBERT()


        # 3. Initialize API Client (Instead of loading 5GB of model into RAM)
        # Get your API key from https://console.groq.com/
        self.api_key = GROQ_API_KEY
        if not self.api_key or not self.api_key.startswith("gsk_"):
            print("❌ ERROR: Valid Groq API Key not found!")

            
        self.api_client = Groq(api_key=self.api_key)
        self.model_name = "llama-3.1-8b-instant" # Very fast API model
        
        print("✅ API Client Initialized ")



      #########################################################################################
        # Optimized config for 3.6GB VRAM
        # 3. Load LLM on CPU (Optimized for AMD/Generic Hardware)
        # print("📥 Loading Llama-3.2-1B-Instruct on CPU...")
        # model_id = "meta-llama/Llama-3.2-1B-Instruct"
        
        # try:
        #     self.tokenizer = AutoTokenizer.from_pretrained(model_id)
            
        #     # Note: We REMOVE BitsAndBytesConfig because it requires NVIDIA
        #     # We load in float16 to keep memory usage low on your RAM
        #     self.model = AutoModelForCausalLM.from_pretrained(
        #         model_id,
        #         torch_dtype=torch.float16, 
        #         device_map="cpu",         # Force it to ignore the AMD GPU
        #         low_cpu_mem_usage=True
        #     )

        #     self.tokenizer.pad_token = self.tokenizer.eos_token

        #     self.chat_pipeline = pipeline(
        #         "text-generation",
        #         model=self.model,
        #         tokenizer=self.tokenizer,
        #         max_new_tokens=256, 
        #         temperature=0.1
        #     )
        #     print("✅ LLM Loaded successfully on CPU")
        # except Exception as e:
        #     print(f"❌ Critical: LLM Failed to load: {e}")
        #     self.chat_pipeline = None

    #########################################################################################################


    def global_secure_query(self, query_text, user_role, auth_id):
        """Search across ALL patients the doctor has access to"""
        if not self.collection:
            return {"error": "Database not initialized."}

        # Use None for patient_id to trigger "Global" filter in your RBAC logic
        filter_result = create_filter(user_role, auth_id, target_patient_id=None)
        
        if isinstance(filter_result, str):
            return {"error": filter_result}

        query_vector = self.encoder.get_embedding(query_text)
        
        # Increase n_results to 10 or 15 to get a broader list
        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=10, 
            where=filter_result or None,  # doctors' global search has no filter
            include=["documents", "metadatas"]
        )

        formatted = []
        if results and results["documents"][0]:
            for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
                formatted.append({
                    "patient_id": meta.get("patient_id"), # Crucial for global lists
                    "date": meta.get("visit_date"),
                    "text": doc,
                    "diagnosis": meta.get("diagnosis")
                })
        return {"status": "success", "results": formatted}
    



    def secure_query(self, query_text, user_role, auth_id, patient_id, visit_dates=None):
        """Standard Semantic Search in ChromaDB"""
        if not self.collection:
            return {"error": "Database not initialized."}

        filter_result = create_filter(user_role, auth_id, patient_id)
        if isinstance(filter_result, str):
            return {"error": filter_result}

        query_vector = self.encoder.get_embedding(query_text)
        
        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=3,
            where=filter_result,
            include=["documents", "metadatas"]
        )

        formatted = []
        if results and results["documents"][0]:
            for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
                formatted.append({
                    "date": meta.get("visit_date"),
                    "text": doc,
                    "diagnosis": meta.get("diagnosis")
                })
        return {"status": "success", "results": formatted}

    def generate_chat_response(self, query_text, user_role, auth_id, patient_id=None, visit_dates=None):
        """Supports both Single Patient and Global Clinic Search with LLM reasoning"""
        today = datetime.now().strftime("%B %d, %Y")
        # 1. Retrieval Logic
        is_global = patient_id is None or str(patient_id).lower() in ["all", "none", ""]
        filter_result = create_filter(user_role, auth_id, patient_id if not is_global else None)
        
        if isinstance(filter_result, str): return {"error": filter_result}

        query_vector = self.encoder.get_embedding(query_text)
        n_results = 10 if is_global else 3
        
        # Prepare query arguments
        query_args = {
            "query_embeddings": [query_vector],
            "n_results": n_results,
            "include": ["documents", "metadatas"]
        }

        # ONLY add 'where' if filter_result is not empty
        if filter_result and len(filter_result) > 0:
            query_args["where"] = filter_result

        # Execute query with unpacked arguments
        results = self.collection.query(**query_args)

        data = []
        if results and results["documents"][0]:
            for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
                data.append({
                    "patient": meta.get("patient_name") or "Unknown",
                    "patient_id": meta.get("patient_id") or "Unknown",
                    "date": meta.get("visit_date"),
                    "text": doc
                })

        if not data:
            return {"answer": "No matching records found in the clinic database.", "context": []}

        # 2. CONTEXT BUILDING
        context_str = "\n".join([f"- Patient: {r['patient']} (ID: {r['patient_id']}), Visit Date: {r['date']}\n  Records: {r['text']}" for r in data])


        formatting_rules = (
            "\n\n### Formatting Requirements:\n"
            "- Use **Bold** for medical terms, diagnoses, and crucial values.\n"
            "- Use bullet points or numbered lists for readability.\n"
            "- Use a double line break between paragraphs.\n"
            "- If responding as a doctor's assistant, provide a summary table if multiple patient data is present."
        )
        # 3. DEFINE THE ROLE-BASED INSTRUCTIONS
        if user_role.lower() == "doctor":
            system_instructions = (
                f"You are a highly skilled clinical assistant. Today's date is {today}. "
                "Provide technical, precise, and concise medical summaries. "
                "Use standard medical terminology (e.g., ICD codes, clinical jargon). "
                "Focus on diagnostic findings and quantitative data from the context. "
                "You are currently analyzing records. Provide precise summaries. "
                "If asked to list patients, scan the birthdates in the context and provide a clear list."
                + formatting_rules
            )
        else:
            system_instructions = (
                f"You are a helpful and empathetic patient assistant. Today's date is {today}. "
                "Explain medical terms in simple, everyday language that a patient can easily understand. "
                "Do not use jargon without explaining it. "
                "Focus on what the information means for the patient's daily health and reassure them using only the provided facts."
                + formatting_rules
            )

        try:
            chat_completion = self.api_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_instructions},
                    {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {query_text}"}
                ],
                model=self.model_name,
                temperature=0.1, # Keep it factual
            )
            answer = chat_completion.choices[0].message.content
        except Exception as e:
            answer = f"❌ API Error: {str(e)}"

        return {"answer": answer, "context": data}

       ##################################################################################################################################################################
        # 2. PLUG INTO THE MESSAGE TEMPLATE
        # messages = [
        #     {"role": "system", "content": system_instructions},
        #     {"role": "user", "content": f"Contextual Records:\n{context_str}\n\nQuestion: {query_text}"}
        # ]

        # 3. GENERATE AS USUAL
        # if self.chat_pipeline:
        #     prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        #     outputs = self.chat_pipeline(prompt, max_new_tokens=512, do_sample=False, pad_token_id=self.tokenizer.eos_token_id, return_full_text=False)
            
        #     raw_text = outputs[0]["generated_text"]
        #     if "<|start_header_id|>assistant<|end_header_id|>" in raw_text:
        #         answer = raw_text.split("<|start_header_id|>assistant<|end_header_id|>")[-1].strip()
        #     else:
        #         answer = raw_text.split("<|assistant|>")[-1].strip()
        #     answer = answer.replace("<|eot_id|>", "").replace("<|end_of_text|>", "").strip()
        # else:
        #     answer = "[LLM Offline] Data retrieved, but the inference engine is not ready."

        # return {"answer": answer, "context": data}
    #######################################################################################################################################################################


    def get_available_dates(self, user_role, auth_id, patient_id):
        """Retrieves all unique visit dates for a specific patient from ChromaDB"""
        if not self.collection:
            return []

        # 1. Create the security filter (ensure the user has permission for this patient)
        filter_result = create_filter(user_role, auth_id, patient_id)
        if isinstance(filter_result, str):
            return [] # Or raise an exception if preferred

        # 2. Query ChromaDB for all records of this patient
        # We set n_results high to ensure we catch every visit
        results = self.collection.get(
            where=filter_result,
            include=["metadatas"]
        )

        # 3. Extract unique dates from metadata
        if results and results["metadatas"]:
            # Use a 'set' to automatically handle duplicates (multiple records on same day)
            dates = {meta.get("visit_date") for meta in results["metadatas"] if meta.get("visit_date")}
            # Return as a sorted list for a better UI experience
            return sorted(list(dates), reverse=True)
        
        return []