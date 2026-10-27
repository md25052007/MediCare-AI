import os
import csv
import sys
import time
from sqlalchemy import insert 

# Add the root directory to the python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash
from app.config import DEMO_PATIENT_PASSWORD

CSV_FILE_PATH = os.path.join(BASE_DIR, "patient_structured_data.csv") 
PATIENT_ID_COLUMN = "patient_id" 

def seed_patients_bulk():
    if not os.path.exists(CSV_FILE_PATH):
        print(f"❌ Error: Could not find CSV file at {CSV_FILE_PATH}")
        return

    db = SessionLocal()
    start_time = time.time()
    
    print("🔍 Checking database for existing patients...")
    existing_users = {user[0] for user in db.query(User.username).all()}
    print(f"✅ Found {len(existing_users)} patients already in the database. They will be skipped.")
    
    unique_patient_ids = set()

    print(f"📖 Reading 120,000+ rows from CSV...")
    try:
        with open(CSV_FILE_PATH, mode='r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            for row in reader:
                pid = row.get(PATIENT_ID_COLUMN)
                if pid and pid.strip() not in existing_users:
                    unique_patient_ids.add(pid.strip())
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return

    if not unique_patient_ids:
        print("✅ No new patients to add! Everyone is already in the database.")
        db.close()
        return

    print(f"⚙️ Preparing to insert {len(unique_patient_ids)} NEW patients...")
    universal_hashed_pw = get_password_hash(DEMO_PATIENT_PASSWORD)

    new_users_data = [
        {
            "username": pid,
            "hashed_password": universal_hashed_pw,
            "role": "patient"
        }
        for pid in unique_patient_ids
    ]

    print("🚀 Injecting patients into database in safe batches...")
    
    # --- THE FIX: Feed the database 5000 rows at a time ---
    BATCH_SIZE = 5000
    
    for i in range(0, len(new_users_data), BATCH_SIZE):
        batch = new_users_data[i : i + BATCH_SIZE]
        stmt = insert(User).prefix_with("OR IGNORE").values(batch)
        db.execute(stmt)
        # Print our progress so we know it hasn't frozen!
        print(f"   ... Saved {min(i + BATCH_SIZE, len(new_users_data))} / {len(new_users_data)}")
        
    db.commit()
    # --------------------------------------------------------
    
    db.close()
    
    end_time = time.time()
    print(f"\n🎉 DONE! Successfully added {len(unique_patient_ids)} new patients in {round(end_time - start_time, 2)} seconds!")
    print("⚠️ REMINDER: Every patient's password is the DEMO_PATIENT_PASSWORD from .env (default: patient123)")

if __name__ == "__main__":
    seed_patients_bulk()