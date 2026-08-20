"""
Script to clear all registered users and associated auth/biometric data from the database.

Usage:
    python clear_users.py [--all]
"""
import asyncio
import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.db.models import User, FaceEmbedding, WebAuthnCredential, RefreshToken, EmailOTP, AuditLog, Doctor, Patient, Prediction, Report
from sqlalchemy import delete

async def clear_users(clear_all_clinical_data: bool = False):
    print(f"[INFO] Connecting to database: {settings.DATABASE_URL.split('@')[-1]}")
    async with AsyncSessionLocal() as session:
        try:
            # Delete dependent auth tables first
            print("[INFO] Deleting face embeddings...")
            await session.execute(delete(FaceEmbedding))

            print("[INFO] Deleting WebAuthn credentials...")
            await session.execute(delete(WebAuthnCredential))

            print("[INFO] Deleting refresh tokens...")
            await session.execute(delete(RefreshToken))

            print("[INFO] Deleting email OTPs...")
            await session.execute(delete(EmailOTP))

            print("[INFO] Deleting audit logs...")
            await session.execute(delete(AuditLog))

            print("[INFO] Deleting users...")
            user_result = await session.execute(delete(User))
            users_deleted = user_result.rowcount

            if clear_all_clinical_data:
                print("[INFO] Deleting reports...")
                await session.execute(delete(Report))
                print("[INFO] Deleting predictions...")
                await session.execute(delete(Prediction))
                print("[INFO] Deleting patients...")
                await session.execute(delete(Patient))
                print("[INFO] Deleting doctors...")
                await session.execute(delete(Doctor))

            await session.commit()
            print(f"[SUCCESS] Successfully deleted {users_deleted} registered user(s) and all associated authentication data.")
        except Exception as e:
            await session.rollback()
            print(f"[ERROR] Failed to clear user data: {e}")
            raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clear registered users from database")
    parser.add_argument("--all", action="store_true", help="Also clear doctors, patients, and clinical records")
    args = parser.parse_args()

    asyncio.run(clear_users(clear_all_clinical_data=args.all))
