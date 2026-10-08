from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from app.db.models import Report, Prediction

class ReportRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_report(self, prediction_id: str, recommendation: str, report_json: dict) -> Report:
        report = Report(
            prediction_id=prediction_id,
            recommendation=recommendation,
            report_json=report_json
        )
        self.session.add(report)
        await self.session.commit()
        await self.session.refresh(report)
        return report

    async def get_all_reports(self) -> List[Report]:
        result = await self.session.execute(
            select(Report)
            .options(
                selectinload(Report.prediction).selectinload(Prediction.patient)
            )
            .order_by(Report.generated_at.desc())
        )
        reports = result.scalars().all()
        for r in reports:
            if isinstance(r.report_json, dict):
                r_json = dict(r.report_json)
                if r.prediction:
                    dataset = r.prediction.dataset or r_json.get("dataset") or "lung"
                    r_json["dataset"] = dataset
                    r_json["organ"] = "Lung" if dataset.lower() == "lung" else "Breast"
                    r_json["model_name"] = r.prediction.model_name or r_json.get("model_name")
                    
                    p_info = dict(r_json.get("patient_info") or {})
                    p_name = p_info.get("full_name") or p_info.get("patient_name")
                    
                    if not p_name or p_name == "N/A" or p_name == "Anonymous Patient":
                        if r.prediction.patient and r.prediction.patient.full_name:
                            p_info["full_name"] = r.prediction.patient.full_name
                            p_info["patient_name"] = r.prediction.patient.full_name
                            p_info["patient_id"] = r.prediction.patient.patient_id
                            p_info["age"] = r.prediction.patient.age
                            p_info["gender"] = r.prediction.patient.gender
                            p_info["smoking_history"] = r.prediction.patient.smoking_history
                            p_info["family_history"] = r.prediction.patient.family_history
                            p_info["symptoms"] = r.prediction.patient.symptoms
                        elif r.prediction.patient_id:
                            p_info["patient_id"] = r.prediction.patient_id
                            p_info["full_name"] = f"Patient {r.prediction.patient_id[:8]}"
                            p_info["patient_name"] = f"Patient {r.prediction.patient_id[:8]}"
                    
                    if not p_info.get("cancer_type"):
                        p_info["cancer_type"] = "Lung" if dataset.lower() == "lung" else "Breast"
                    
                    r_json["patient_info"] = p_info

                    # Ensure gradcam info is structured
                    if not r_json.get("gradcam") and r.prediction.gradcam_path:
                        gp = r.prediction.gradcam_path
                        r_json["gradcam"] = {
                            "overlay_path": gp,
                            "heatmap_path": gp.replace("_overlay.png", "_heatmap.png"),
                            "original_path": gp.replace("_overlay.png", "_original.png")
                        }
                else:
                    # Fallback inference if prediction relation is somehow missing
                    predicted_class = (r_json.get("prediction", {}) or {}).get("predicted_class", "").lower()
                    if predicted_class.startswith("lung") or "scc" in predicted_class or "aca" in predicted_class:
                        r_json["dataset"] = "lung"
                        r_json["organ"] = "Lung"
                    elif "breast" in predicted_class or predicted_class in ["benign", "malignant"]:
                        r_json["dataset"] = "breast"
                        r_json["organ"] = "Breast"
                
                r.report_json = r_json
        return reports

    async def delete_report(self, report_id: str) -> bool:
        result = await self.session.execute(
            select(Report).where(Report.report_id == report_id)
        )
        report = result.scalar_one_or_none()
        if not report:
            return False
        await self.session.delete(report)
        await self.session.commit()
        return True

    async def delete_reports_batch(self, report_ids: List[str]) -> int:
        from sqlalchemy import delete
        result = await self.session.execute(
            delete(Report).where(Report.report_id.in_(report_ids))
        )
        await self.session.commit()
        return result.rowcount
