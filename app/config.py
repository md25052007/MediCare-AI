# config.py
import os

# --- Security & Auth Settings (Required for Login) ---
SECRET_KEY = "super-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- Database Paths ---
DATA_FOLDER = "./datasetkaggle"
OUTPUT_CSV = "patient_structured_data.csv"
CHROMA_DB_PATH = "./medical_db"
COLLECTION_NAME = "ehr_collection"

# --- External APIs ---
# Optional: If you use an external API for LLMs later
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")