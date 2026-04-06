from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import bcrypt
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import csv
import json
import sqlite3
from . import auth, models, database, query_engine
from typing import Optional, List, Dict, Any
from passlib.context import CryptContext
import os
from contextlib import asynccontextmanager
from .cleanup import delete_patient_completely
from .query_engine import EHRQueryEngine

engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    # Initialize ChromaDB and AI model at startup
    print("🚀 Server starting....", flush=True)
    engine = EHRQueryEngine()
    print("✅ Startup complete!", flush=True)
    yield
    print("Shutting down...", flush=True)
    engine = None

app = FastAPI(title="Professional EHR System", lifespan=lifespan)

SQLITE_DB_PATH = "medical_system.db"
CSV_BACKUP_PATH = "patient_structured_data.csv"

# Set up the password hasher
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 2. Create a helper function to get the engine
def get_engine():
    global engine
    return engine

# Setup CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB Tables
models.Base.metadata.create_all(bind=database.engine)

# --- MODELS ---
class UserCreate(BaseModel):
    username: str
    password: str
    role: str




class AddPatientRequest(BaseModel):
    patient_id: Optional[str] = None 
    patient_name: str
    gender: str
    birth_date: str
    diagnosis: str
    treatment_plan: str


    # ==========================================
# 2. INITIALIZE SQLITE (WITH PATIENT PORTAL)
# ==========================================
def init_sqlite_db():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    
    # 1. USER TABLE (Security & Logins)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            hashed_password TEXT,
            role TEXT
        )
    ''')
    
    # 2. PATIENT TABLE (EHR / Visit Data)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient (
            visit_id TEXT PRIMARY KEY,
            patient_id TEXT,
            patient_name TEXT,
            diagnosis TEXT,
            treatment_plan TEXT,
            visit_date TEXT
        )
    ''')

    conn.commit()
    conn.close()

# Run it once at startup
init_sqlite_db()

class ChatRequest(BaseModel):
    query: str
    target_id: Optional[str] = None  # Make this optional for global queries
    visit_dates: Optional[List[str]] = None













# In app/main.py

@app.get("/")
def root():
    return {"message": "Server is up"}


    
# --- 1. AUTHENTICATION ROUTES ---

@app.post("/register", tags=["Auth"])
def register_user(user: UserCreate, db: Session = Depends(database.get_db)):
    """Registers a new doctor or patient and hashes their password."""
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed, role=user.role)
    db.add(new_user)
    db.commit()
    return {"message": "User registered securely"}

@app.post("/login", tags=["Auth"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    """Authenticates the user and returns a JWT token."""
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    
    if not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.username}
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "user_id": user.username}

# --- 2. AI SEARCH ROUTE (ChromaDB) ---

@app.get("/search", tags=["AI Search"])
def search_records(query: str, target_id: str, current_user: dict = Depends(auth.get_current_user)):
    """Uses the AI Query Engine to find relevant medical records with RBAC."""
    results = engine.secure_query(query, current_user["role"], current_user["user_id"], target_id)
    if isinstance(results, dict) and "error" in results:
        raise HTTPException(status_code=403, detail=results["error"])
    return results

@app.get("/patient/{patient_id}/dates", tags=["AI Search"])
def get_visit_dates(patient_id: str, current_user: dict = Depends(auth.get_current_user)):
    """Returns a list of all dates this patient visited the clinic."""
    result = engine.get_available_dates(current_user["role"], current_user["user_id"], patient_id)
    if isinstance(result, str) and ("error" in result.lower() or "unauthorized" in result.lower()):
        raise HTTPException(status_code=403, detail=result)
    return result

@app.post("/chat", tags=["AI Search"])
def chat_with_records(request: ChatRequest, current_user: dict = Depends(auth.get_current_user)):
    """
    Stateful Chat: 
    1. Grabs records from ChromaDB based on target_id.
    2. Feeds records + query into the SLM.
    3. Returns a natural language answer.
    """
    ai_engine = get_engine() 
    
    # This now returns a generated answer instead of just a list of records
    response = ai_engine.generate_chat_response(
        query_text=request.query,
        user_role=current_user["role"],
        auth_id=current_user["user_id"],
        patient_id=request.target_id,
        visit_dates=request.visit_dates
    )
    
    if isinstance(response, dict) and "error" in response:
        raise HTTPException(status_code=403, detail=response["error"])
        
    return response



# --- 3. PATIENT EHR CRUD (SQLAlchemy) ---

@app.get("/ehr/{patient_id}", tags=["EHR Management"])
def get_patient(patient_id: str, db: Session = Depends(database.get_db), current_user: dict = Depends(auth.get_current_user)):
    """Retrieves basic patient info from the SQL database."""
    if current_user["role"] == "patient" and current_user["user_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    patient = db.query(models.PatientEHR).filter(models.PatientEHR.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.get("/records/{patient_id}", tags=["EHR Management"])
def get_patient_records(patient_id: str, db: Session = Depends(database.get_db), current_user: dict = Depends(auth.get_current_user)):
    if current_user["role"] == "patient" and current_user["user_id"] != patient_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    records = db.query(models.PatientEHR).filter(models.PatientEHR.patient_id == patient_id).all()
    return records

@app.delete("/patients/{patient_id}", tags=["Admin Tools"])
def purge_patient(patient_id: str, db: Session = Depends(database.get_db), current_user: dict = Depends(auth.get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only Admins can delete patients.")
    
    # 1. Run your cleanup script (Raw SQLite/CSV/Chroma)
    result = delete_patient_completely(patient_id)
    
    # 2. IMPORTANT: Tell SQLAlchemy to forget everything it knows
    # This forces the next GET request to look at the actual hard drive
    db.expire_all() 
    
    return result


@app.post("/ehr/add", include_in_schema=False)
def add_new_patient(request: AddPatientRequest):
    # 1. Check if AI components are ready
    if not hasattr(engine, 'collection') or not hasattr(engine, 'encoder'):
        raise HTTPException(status_code=500, detail="AI Database not initialized.")

    try:
        # --- 2. Setup Data ---
        # patient_id remains a string (UUID) as per your model
        pid = request.patient_id or str(uuid.uuid4())
        
        # IMPORTANT: Use a Python datetime OBJECT for SQLAlchemy/SQLite DateTime column
        # Do NOT use .isoformat() here
        now_obj = datetime.now(timezone.utc)

        # --- 3. LAYER 1: SQLITE (Manual Connection) ---
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        
        try:
            # Prepare the password (Bcrypt)
            raw_password = "patient123"
            hashed_pw = auth.get_password_hash(raw_password)
            
            # A. Insert User
            # We skip 'id' because your model says it's an Integer Primary Key (Auto-increment)
            cursor.execute('''
                INSERT OR IGNORE INTO users (username, hashed_password, role) 
                VALUES (?, ?, ?)
            ''', (pid, hashed_pw, "patient"))

            # B. Insert Patient Record
            # We skip 'visit_id' because your model says it's an Integer Primary Key (Auto-increment)
            cursor.execute('''
                INSERT INTO patient_records (patient_id, patient_name, diagnosis, treatment_plan, visit_date)
                VALUES (?, ?, ?, ?, ?)
            ''', (pid, request.patient_name, request.diagnosis, request.treatment_plan, now_obj))

            # Retrieve the Auto-incremented ID that SQLite just created
            new_visit_id = cursor.lastrowid
            conn.commit()
            
        except sqlite3.Error as sqle:
            conn.rollback()
            print(f"SQL Error: {sqle}")
            raise HTTPException(status_code=500, detail=f"Database failure: {sqle}")
        finally:
            conn.close()

        # --- 4. LAYER 2: CSV (Demographics) ---
        file_exists = os.path.isfile(CSV_BACKUP_PATH)
        with open(CSV_BACKUP_PATH, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(["patient_id", "gender", "birth_date"])
            writer.writerow([pid, request.gender, request.birth_date])

        # --- 5. LAYER 3: CHROMADB (Vector Search) ---
        # Narrative for embedding
        narrative = f"Patient Name: {request.patient_name}. Gender: {request.gender}. Diagnosis: {request.diagnosis}."
        
        vector = engine.encoder.get_embedding(narrative)
        if hasattr(vector, 'tolist'): vector = vector.tolist()

        # ChromaDB IDs MUST be strings, so we convert the numeric visit_id
        chroma_id = str(new_visit_id)

        rich_metadata = {
            "visit_id": chroma_id,
            "patient_id": pid,
            "patient_name": request.patient_name,
            "diagnosis": request.diagnosis,
            # Chroma metadata needs a string, so we convert the date here
            "visit_date": now_obj.strftime("%Y-%m-%d %H:%M:%S")
        }

        engine.collection.upsert(
            ids=[chroma_id],
            embeddings=[vector],
            documents=[narrative],
            metadatas=[rich_metadata]
        )

        return {
            "status": "success", 
            "patient_id": pid, 
            "visit_id": new_visit_id
        }

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"System Error: {str(e)}")


















@app.get("/debug/patients", tags=["Debug"])
def get_all_patients(db: Session = Depends(database.get_db)):
    """Temporary route to see ALL patients in the database."""
    patients = db.query(models.PatientEHR).all()
    
    # Just return the IDs and names so it's easy to read
    return {
        "total_patients": len(patients),
        "available_ids": [{"id": p.patient_id, "name": p.patient_name} for p in patients]
    }







@app.post("/ehr/add", tags=["Doctor Tools"])
def add_new_patient(
    request: AddPatientRequest, 
    db: Session = Depends(database.get_db), 
    current_user: dict = Depends(auth.get_current_user)
):
    # 1. Security Check
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can add records.")

    active_engine = get_engine() 
    
    try:
        # --- 2. Check if Patient Already Exists ---
        # If user provides a patient_id, check the DB. Otherwise, it's a new patient.
        existing_patient = None
        if request.patient_id:
            existing_patient = db.query(models.User).filter(models.User.username == request.patient_id).first()
        
        pid = request.patient_id if existing_patient else (request.patient_id or f"PAT_{uuid.uuid4().hex[:8]}")
        visit_date_obj = datetime.now(timezone.utc)
        
        # --- 3. LAYER 1: SQLALCHEMY (Identity & Records) ---
        if not existing_patient:
            # Create NEW User only if they don't exist
            hashed_pw = auth.get_password_hash("patient123")
            new_user = models.User(username=pid, hashed_password=hashed_pw, role="patient")
            db.add(new_user)
            print(f"🆕 Created new user profile for {pid}")
        else:
            print(f"🏥 Adding new visit for existing patient {pid}")

        # Always create a new clinical record for the new visit
        new_record = models.PatientEHR(
            patient_id=pid,
            patient_name=request.patient_name,
            diagnosis=request.diagnosis,
            treatment_plan=request.treatment_plan,
            visit_date=visit_date_obj
        )
        db.add(new_record)
        db.commit()

        # --- 4. LAYER 2: CHROMADB (Full Embedding & Full Metadata) ---
        # "Embed everything except patient ID"
        narrative = (
            f"Patient Name: {request.patient_name}. "
            f"Gender: {request.gender}. "
            f"Birth Date: {request.birth_date}. "
            f"Diagnosis: {request.diagnosis}. "
            f"Treatment Plan: {request.treatment_plan}."
        )
        
        vector = active_engine.encoder.get_embedding(narrative)
        if hasattr(vector, 'tolist'): vector = vector.tolist()

        # "In metadata keep everything"
        full_metadata = {
            "patient_id": pid,
            "patient_name": request.patient_name,
            "gender": request.gender,
            "birth_date": request.birth_date,
            "diagnosis": request.diagnosis,
            "treatment_plan": request.treatment_plan,
            "visit_date": visit_date_obj.isoformat()
        }

        active_engine.collection.upsert(
            ids=[f"VISIT_{uuid.uuid4().hex[:8]}"],
            embeddings=[vector],
            documents=[narrative],
            metadatas=[full_metadata]
        )

        # --- 5. LAYER 3: CSV (Syncing demographics) ---
        if not existing_patient and os.path.exists(CSV_BACKUP_PATH):
            with open(CSV_BACKUP_PATH, mode='a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([pid, request.gender, request.birth_date])

        return {
            "status": "success", 
            "message": "Visit recorded successfully", 
            "patient_id": pid,
            "is_new_patient": not existing_patient
        }

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))