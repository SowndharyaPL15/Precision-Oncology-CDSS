from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.db.models import Report

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
        result = await self.session.execute(select(Report).order_by(Report.generated_at.desc()))
        return result.scalars().all()
