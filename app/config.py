# config.py
import os
import warnings

from dotenv import load_dotenv

# Load .env from app/ first, then the project root
_APP_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_APP_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(_APP_DIR), ".env"))

# --- Security & Auth Settings (Required for Login) ---
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = "dev-only-insecure-key"
    warnings.warn("SECRET_KEY is not set in .env; using an insecure development key.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- Database Paths ---
DATA_FOLDER = "./datasetkaggle"
OUTPUT_CSV = "patient_structured_data.csv"
CHROMA_DB_PATH = "./medical_db"
COLLECTION_NAME = "ehr_collection"

# --- Demo accounts ---
# Password given to auto-created patient accounts. Demo default only; set it in .env.
DEMO_PATIENT_PASSWORD = os.getenv("DEMO_PATIENT_PASSWORD", "patient123")

# --- External APIs ---
# Optional: If you use an external API for LLMs later
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")