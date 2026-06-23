import os
from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

if os.getenv("VERCEL"):
    database_path = Path("/tmp/lab_attendance.db")
else:
    database_path = Path(__file__).resolve().parents[1] / "lab_attendance.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{database_path.as_posix()}")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_schema_columns():
    """Small SQLite-compatible migration layer for the local MVP database."""
    additions = {
        "lab_sessions": {
            "class_id": "INTEGER",
            "subject_id": "INTEGER",
            "teacher_id": "INTEGER",
            "status": "VARCHAR DEFAULT 'active'",
        },
        "attendances": {
            "confidence_score": "FLOAT",
            "device_id": "VARCHAR",
            "review_note": "TEXT",
        },
        "users": {
            "email": "VARCHAR",
        },
        "users": {
            "email": "VARCHAR",
        },
        "users": {
            "email": "VARCHAR",
        },
    }
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table_name, columns in additions.items():
            if table_name not in inspector.get_table_names():
                continue
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for name, definition in columns.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {name} {definition}"))
