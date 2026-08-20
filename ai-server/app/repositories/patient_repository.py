from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.db.models import Patient

class PatientRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_patient(self, doctor_id: str, full_name: str, age: int, gender: str, **kwargs) -> Patient:
        patient = Patient(
            doctor_id=doctor_id,
            full_name=full_name,
            age=age,
            gender=gender,
            **kwargs
        )
        self.session.add(patient)
        await self.session.commit()
        await self.session.refresh(patient)
        return patient

    async def get_patient_by_id(self, patient_id: str) -> Patient:
        result = await self.session.execute(select(Patient).filter(Patient.patient_id == patient_id))
        return result.scalars().first()

    async def get_all_patients(self) -> List[Patient]:
        result = await self.session.execute(select(Patient).order_by(Patient.created_at.desc()))
        return result.scalars().all()

    async def update_patient(self, patient_id: str, **kwargs) -> Patient:
        patient = await self.get_patient_by_id(patient_id)
        if not patient:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(patient, key):
                setattr(patient, key, value)
        await self.session.commit()
        await self.session.refresh(patient)
        return patient

