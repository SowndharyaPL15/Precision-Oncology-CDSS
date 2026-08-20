from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import Doctor

class DoctorRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_doctor(self, full_name: str, email: str, password_hash: str, specialization: str = None, hospital: str = None) -> Doctor:
        doctor = Doctor(
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            specialization=specialization,
            hospital=hospital
        )
        self.session.add(doctor)
        await self.session.commit()
        await self.session.refresh(doctor)
        return doctor

    async def get_doctor_by_id(self, doctor_id: str) -> Doctor:
        result = await self.session.execute(select(Doctor).filter(Doctor.doctor_id == doctor_id))
        return result.scalars().first()

    async def get_doctor_by_email(self, email: str) -> Doctor:
        result = await self.session.execute(select(Doctor).filter(Doctor.email == email))
        return result.scalars().first()
