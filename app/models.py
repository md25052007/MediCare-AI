from sqlalchemy import Column, Integer, String, Text, DateTime
import datetime
from .database import Base

class User(Base):
    """
    Stores authentication and access control data.
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String)  # Values: 'doctor' or 'patient'

class PatientEHR(Base):
    """
    Stores the structured Electronic Health Records.
    Supports MULTIPLE visits per patient!
    """
    __tablename__ = "patient_records"
    
    # NEW: Every visit gets its own unique, auto-incrementing number (Primary Key)
    visit_id = Column(Integer, primary_key=True, autoincrement=True, index=True) 
    
    # The patient this record belongs to
    patient_id = Column(String, index=True) 
    
    patient_name = Column(String)
    diagnosis = Column(String)
    treatment_plan = Column(Text)
    
    # Automatically saves the exact date/time the doctor wrote the record
    visit_date = Column(DateTime, default=datetime.datetime.utcnow)