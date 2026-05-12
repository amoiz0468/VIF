"""Simple migrations runner for the backend.

Usage:
  export DATABASE_URL="postgresql://user:pass@host:port/dbname"
  python manage_migrations.py

This script applies SQL files found in the `versions/` directory in alphanumeric order
and records applied files in a `schema_migrations` table.
"""
from __future__ import annotations

import os
import glob
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not set. Export it and re-run.")

ENGINE = create_engine(DATABASE_URL)
VERSIONS_DIR = os.path.join(os.path.dirname(__file__), "versions")


def ensure_migrations_table(conn):
    conn.execute(text(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            filename TEXT UNIQUE NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE NOT NULL
        );
        """
    ))


def applied_migrations(conn):
    rows = conn.execute(text("SELECT filename FROM schema_migrations")).fetchall()
    return {r[0] for r in rows}


def apply_migration_file(conn, path: str):
    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()
    conn.execute(text(sql))
    conn.execute(text("INSERT INTO schema_migrations (filename, applied_at) VALUES (:fn, :at)"), {
        "fn": os.path.basename(path),
        "at": datetime.utcnow()
    })


def main():
    files = sorted(glob.glob(os.path.join(VERSIONS_DIR, "*.sql")))
    if not files:
        print("No migration files found in:", VERSIONS_DIR)
        return

    with ENGINE.begin() as conn:
        ensure_migrations_table(conn)
        applied = applied_migrations(conn)
        for path in files:
            name = os.path.basename(path)
            if name in applied:
                print("Skipping already applied:", name)
                continue
            print("Applying:", name)
            try:
                apply_migration_file(conn, path)
                print("Applied:", name)
            except SQLAlchemyError as exc:
                print("Failed to apply", name)
                raise


if __name__ == "__main__":
    main()
