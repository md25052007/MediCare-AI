from transformers import pipeline
import torch

class MedicalSLM:
    def __init__(self):
        # Llama-3.2-1B is incredibly fast and fits in ~2GB of RAM
        self.model_id = "meta-llama/Llama-3.2-1B-Instruct"
        self.pipe = pipeline(
            "text-generation",
            model=self.model_id,
            torch_dtype=torch.bfloat16,
            device_map="auto",
        )

    def generate_summary(self, diagnosis, treatment):
        prompt = f"""
        <|begin_of_text|><|start_header_id|>system<|end_header_id|>
        You are a medical assistant. Summarize the following case in one sentence for a doctor's quick review.
        <|start_header_id|>user<|end_header_id|>
        Diagnosis: {diagnosis}
        Treatment: {treatment}
        <|end_header_id|>
        <|start_header_id|>assistant<|end_header_id|>
        """
        outputs = self.pipe(prompt, max_new_tokens=50, do_sample=False)
        return outputs[0]["generated_text"].split("<|assistant|>")[-1].strip()

# Initialize once to avoid reloading on every request
ai_assistant = MedicalSLM()