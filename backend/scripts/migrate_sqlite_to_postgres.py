import os
import sys
from pathlib import Path

from sqlalchemy import MetaData, create_engine, func, select, text

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.database import Base
from app import models  # noqa: F401 - registers all tables on Base.metadata


TABLE_ORDER = [
    "students",
    "users",
    "classes",
    "subjects",
    "lab_locations",
    "lab_sessions",
    "face_profiles",
    "class_students",
    "session_policies",
    "attendances",
    "leave_requests",
    "anomaly_alerts",
    "attendance_logs",
    "appeals",
    "lesson_slides",
]


def normalize_postgres_url(value: str):
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+psycopg://", 1)
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+psycopg://", 1)
    return value


def main():
    target_url = normalize_postgres_url(os.getenv("DATABASE_URL", "").strip())
    if not target_url or target_url.startswith("sqlite"):
        raise SystemExit("DATABASE_URL must point to the target PostgreSQL database.")

    source_path = Path(
        os.getenv("SOURCE_SQLITE_PATH", backend_dir / "lab_attendance.db")
    ).resolve()
    if not source_path.exists():
        raise SystemExit(f"Source SQLite database not found: {source_path}")

    source_engine = create_engine(f"sqlite:///{source_path.as_posix()}")
    target_engine = create_engine(target_url, pool_pre_ping=True)
    Base.metadata.create_all(bind=target_engine)

    source_metadata = MetaData()
    source_metadata.reflect(bind=source_engine)

    with target_engine.begin() as target_connection:
        populated_tables = []
        for table_name in TABLE_ORDER:
            table = Base.metadata.tables.get(table_name)
            if table is None:
                continue
            count = target_connection.execute(
                select(func.count()).select_from(table)
            ).scalar_one()
            if count:
                populated_tables.append(table_name)
        if populated_tables:
            raise SystemExit(
                "Target database is not empty; migration stopped to avoid duplicates: "
                + ", ".join(populated_tables)
            )

    migrated = {}
    with source_engine.connect() as source_connection, target_engine.begin() as target_connection:
        for table_name in TABLE_ORDER:
            source_table = source_metadata.tables.get(table_name)
            target_table = Base.metadata.tables.get(table_name)
            if source_table is None or target_table is None:
                continue

            rows = [dict(row._mapping) for row in source_connection.execute(select(source_table))]
            if rows:
                target_connection.execute(target_table.insert(), rows)
            migrated[table_name] = len(rows)

        if target_engine.dialect.name == "postgresql":
            for table_name in TABLE_ORDER:
                table = Base.metadata.tables.get(table_name)
                if table is None or "id" not in table.c:
                    continue
                target_connection.execute(text(
                    f"""
                    SELECT setval(
                        pg_get_serial_sequence('{table_name}', 'id'),
                        COALESCE((SELECT MAX(id) FROM {table_name}), 1),
                        (SELECT COUNT(*) > 0 FROM {table_name})
                    )
                    """
                ))

    print("Migration completed:")
    for table_name, count in migrated.items():
        print(f"- {table_name}: {count}")


if __name__ == "__main__":
    main()
