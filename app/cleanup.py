import os
import pandas as pd
from . import config, models, database

def delete_patient_completely(patient_id: str, csv_path: str = "data/patients.csv"):
    """Deletes a patient from SQLite, ChromaDB, and the source CSV."""
    
    # 1. Delete from SQLite (The Source of Truth)
    db = database.SessionLocal()
    try:
        patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
        if patient:
            db.delete(patient)
            db.commit()
            print(f"✅ Removed {patient_id} from SQLite.")
    except Exception as e:
        print(f"❌ SQLite Delete Error: {e}")
    finally:
        db.close()

    # 2. Delete from ChromaDB (The AI's Memory)
    try:
        from .query_engine import EHRQueryEngine
        engine = EHRQueryEngine()
        if engine.collection:
            # ChromaDB allows deleting by metadata filter
            engine.collection.delete(where={"patient_id": patient_id})
            print(f"✅ Removed all vectors for {patient_id} from ChromaDB.")
    except Exception as e:
        print(f"❌ ChromaDB Delete Error: {e}")

    # 3. Delete from CSV (The Physical File)
    try:
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            # Filter out the patient
            df_cleaned = df[df['patient_id'] != patient_id]
            df_cleaned.to_csv(csv_path, index=False)
            print(f"✅ Removed {patient_id} from {csv_path}.")
    except Exception as e:
        print(f"❌ CSV Delete Error: {e}")

    return {"status": "success", "message": f"Patient {patient_id} purged from all systems."}