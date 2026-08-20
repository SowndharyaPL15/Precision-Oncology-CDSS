from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.db.models import Prediction

class PredictionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_prediction(self, patient_id: str, dataset: str, model_name: str, predicted_class: str, confidence: float, probabilities: dict, gradcam_path: str = None, report_path: str = None) -> Prediction:
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
