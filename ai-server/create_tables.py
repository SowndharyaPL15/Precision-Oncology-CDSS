"""
Standalone script to create all database tables using SQLAlchemy.
Run this once after setting up your PostgreSQL database.

Usage:
    ..\.venv\Scripts\python.exe create_tables.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.db.base import Base
# Import all models so they are registered with Base.metadata
from app.db.models import Doctor, Patient, Prediction, Report

from sqlalchemy.ext.asyncio import create_async_engine

async def create_tables():
    print(f"[INFO] Connecting to: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        print("[INFO] Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("[SUCCESS] All tables created successfully.")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables())
