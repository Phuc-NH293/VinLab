import os
from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

database_path = Path(__file__).resolve().parents[1] / "lab_attendance.db"
raw_database_url = os.getenv("DATABASE_URL", "").strip()

if os.getenv("VERCEL") and not raw_database_url:
    raise RuntimeError(
        "DATABASE_URL is required on Vercel. Configure a persistent PostgreSQL database."
    )

if raw_database_url.startswith("postgres://"):
    raw_database_url = raw_database_url.replace("postgres://", "postgresql+psycopg://", 1)
elif raw_database_url.startswith("postgresql://"):
    raw_database_url = raw_database_url.replace("postgresql://", "postgresql+psycopg://", 1)

DATABASE_URL = raw_database_url or f"sqlite:///{database_path.as_posix()}"
IS_SQLITE = DATABASE_URL.startswith("sqlite")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=not IS_SQLITE,
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
    """Small cross-database migration layer for existing MVP databases."""
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
            "checkout_method": "VARCHAR",
            "checkout_device_id": "VARCHAR",
            "checkout_at": "TIMESTAMP",
            "review_note": "TEXT",
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
