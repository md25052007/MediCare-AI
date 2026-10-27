import sqlite3
import bcrypt
from app.auth import get_password_hash
from app.config import DEMO_PATIENT_PASSWORD

# Configuration
DB_PATH = "./medical_system.db"
# You can pull these IDs from your ChromaDB or your CSV
PATIENT_IDS = ["bb357dc7", "a1b2c3d4"] # Replace with your actual list

def create_patient_accounts():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for pid in PATIENT_IDS:
        username = pid
        password = DEMO_PATIENT_PASSWORD
        hashed_pw = get_password_hash(password)
        
        try:
            cursor.execute(
                "INSERT INTO users (username, hashed_password, role) VALUES (?, ?, ?)",
                (username, hashed_pw, "patient")
            )
            print(f"✅ Created account for: {username}")
        except sqlite3.IntegrityError:
            print(f"⚠️ User {username} already exists.")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    create_patient_accounts()