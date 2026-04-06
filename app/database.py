from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Define the location of your SQLite database file
# This matches the 'medical_system.db' file seen in your filesystem
SQLALCHEMY_DATABASE_URL = "sqlite:///./medical_system.db"

# 2. Create the SQLAlchemy engine
# 'check_same_thread': False is required specifically for SQLite with FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. Create a SessionLocal class
# Each instance of this class will be a unique database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Create a Base class
# Your models (User, PatientEHR) will inherit from this class
Base = declarative_base()

# 5. Dependency function
# This is used in main.py to give each API request its own database connection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()