import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.db.models import User
from app.core.security import get_password_hash
from sqlalchemy import select

async def seed():
    async with AsyncSessionLocal() as session:
        # Seed or reset default doctor
        from app.db.models import Doctor
        res = await session.execute(select(User).where(User.email == "doctor@hospital.org"))
        existing_doc = res.scalars().first()
        if not existing_doc:
            existing_doc = User(
                full_name="Dr. Sarah Jenkins",
                email="doctor@hospital.org",
                password_hash=get_password_hash("doctor123"),
                role="doctor"
            )
            session.add(existing_doc)
            await session.flush()
            print("Seeded doctor@hospital.org")
        else:
            existing_doc.password_hash = get_password_hash("doctor123")
            print("Reset password for doctor@hospital.org to 'doctor123'")
            
        # Seed matching Doctor record
        res_doc = await session.execute(select(Doctor).where(Doctor.email == "doctor@hospital.org"))
        existing_doctor_rec = res_doc.scalars().first()
        if not existing_doctor_rec:
            doctor_rec = Doctor(
                doctor_id=existing_doc.user_id,
                full_name="Dr. Sarah Jenkins",
                email="doctor@hospital.org",
                password_hash=existing_doc.password_hash,
                specialization="Oncologist",
                hospital="General Hospital"
              )
            session.add(doctor_rec)
            print("Seeded Doctor record for doctor@hospital.org")
        else:
            existing_doctor_rec.password_hash = existing_doc.password_hash
            print("Sync'd password in Doctor record for doctor@hospital.org")

        # Seed or reset default admin
        res_admin = await session.execute(select(User).where(User.email == "admin@hospital.org"))
        existing_admin = res_admin.scalars().first()
        if not existing_admin:
            admin = User(
                full_name="System Administrator",
                email="admin@hospital.org",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            session.add(admin)
            print("Seeded admin@hospital.org")
        else:
            existing_admin.password_hash = get_password_hash("admin123")
            print("Reset password for admin@hospital.org to 'admin123'")

        await session.commit()

if __name__ == "__main__":
    asyncio.run(seed())
