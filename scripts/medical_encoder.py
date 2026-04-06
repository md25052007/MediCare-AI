import torch
from transformers import AutoTokenizer, AutoModel

class MedicalBERT:
    def __init__(self, model_name='emilyalsentzer/Bio_ClinicalBERT'):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)

    def get_embedding(self, text):
        inputs = self.tokenizer(text, return_tensors='pt', truncation=True, padding=True, max_length=128)
        with torch.no_grad():
            outputs = self.model(**inputs)
        # ChromaDB requires a list of floats, not a numpy array
        return outputs.last_hidden_state.mean(dim=1).tolist()[0]
