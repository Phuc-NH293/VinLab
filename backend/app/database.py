import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

if os.getenv("VERCEL"):
    database_path = Path("/tmp/lab_attendance.db")
else:
    database_path = Path(__file__).resolve().parents[1] / "lab_attendance.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{database_path.as_posix()}")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
