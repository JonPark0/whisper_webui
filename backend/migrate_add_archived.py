#!/usr/bin/env python3
"""
Database migration script to add 'archived' column to jobs table.
Run this script once to update existing database.
"""
import sqlite3
from config import settings

def migrate():
    """Add archived column to jobs table"""
    db_path = settings.db_path
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(jobs)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'archived' not in columns:
            print("Adding 'archived' column to jobs table...")
            cursor.execute("ALTER TABLE jobs ADD COLUMN archived INTEGER DEFAULT 0")
            conn.commit()
            print("✓ Migration completed successfully!")
        else:
            print("✓ Column 'archived' already exists. No migration needed.")

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        conn.rollback()
        raise

    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
