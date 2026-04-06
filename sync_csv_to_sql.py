import pandas as pd
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, config
import os

print("🔄 Syncing Kaggle CSV to SQLite Database...")

# 1. Path to your dataset (Using paths from your config.py)
csv_path = config.OUTPUT_CSV

if not os.path.exists(csv_path):
    print(f"❌ Could not find CSV at {csv_path}")
    print("Please make sure your dataset folder and CSV file exist!")
    exit()

# 2. Read the CSV
print(f"📂 Reading data from {csv_path}...")
df = pd.read_csv(csv_path)

# Add these two lines to debug! 👇
print(f"📊 Columns found in CSV: {list(df.columns)}")
print(f"🔢 Total rows found: {len(df)}")

# 3. Open Database Session
db = SessionLocal()
added_count = 0
skipped_count = 0

try:
    for index, row in df.iterrows():
        # Try to find the patient ID column (Handles different possible column names)
        p_id = str(row.get('patient_id', '')).strip()
        
        if not p_id or p_id == 'nan':
            continue

        # Check if they already exist in the SQL database
        exists = db.query(models.PatientEHR).filter(models.PatientEHR.patient_id == p_id).first()
        
        if not exists:
            # Create a basic record for the SQL Dashboard
            new_record = models.PatientEHR(
                patient_id=p_id,
                patient_name=f"Patient {p_id[:4]}", # Gives them a generic name like "Patient 2e75"
                diagnosis=str(row.get('Diagnosis', 'Imported from AI Dataset')),
                treatment_plan="See AI Search for detailed clinical history."
            )
            db.add(new_record)
            added_count += 1
        else:
            skipped_count += 1

    # Save all the new patients to the database
    db.commit()
    print(f"✅ Success! Added {added_count} new patients to the SQLite database.")
    print(f"⏩ Skipped {skipped_count} patients (they were already in the database).")
    print("🏥 Your Doctor Dashboard will now find all these patients!")

except Exception as e:
    print(f"❌ Error while syncing: {e}")
finally:
    db.close()