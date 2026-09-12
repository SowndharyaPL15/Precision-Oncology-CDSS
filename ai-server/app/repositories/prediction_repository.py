from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.db.models import Prediction

class PredictionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_prediction(self, patient_id: str, dataset: str, model_name: str, predicted_class: str, confidence: float, probabilities: dict, gradcam_path: str = None, report_path: str = None) -> Prediction:
        # Check if patient exists, if not create record to prevent FK violation
        from app.db.models import Patient, Doctor
        result = await self.session.execute(select(Patient).filter(Patient.patient_id == patient_id))
        patient = result.scalars().first()
        if not patient:
            doc_res = await self.session.execute(select(Doctor))
            doc = doc_res.scalars().first()
            if not doc:
                doc = Doctor(
                    doctor_id="doc-1",
                    full_name="Hospital Physician",
                    email="default_doctor@hospital.org",
                    specialization="Oncologist",
                    hospital="General Oncology Center"
                )
                self.session.add(doc)
                await self.session.flush()
            
            patient = Patient(
                patient_id=patient_id,
                doctor_id=doc.doctor_id,
                full_name=f"Patient {patient_id}",
                age=55,
                gender="Unknown"
            )
            self.session.add(patient)
            await self.session.flush()

        prediction = Prediction(
            patient_id=patient_id,
            dataset=dataset,
            model_name=model_name,
            predicted_class=predicted_class,
            confidence=confidence,
            probabilities=probabilities,
            gradcam_path=gradcam_path,
            report_path=report_path
        )
        self.session.add(prediction)
        await self.session.commit()
        await self.session.refresh(prediction)
        return prediction

    async def get_all_predictions(self) -> List[Prediction]:
        result = await self.session.execute(select(Prediction).order_by(Prediction.created_at.desc()))
        return result.scalars().all()
