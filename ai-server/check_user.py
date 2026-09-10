import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.db.models import User
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.email == "sowndharyaperiyasamy15@gmail.com"))
        user = res.scalars().first()
        if user:
            print(f"FOUND: User {user.email} exists with role: {user.role}")
        else:
            print("NOT FOUND: User does not exist in the database.")

if __name__ == "__main__":
    asyncio.run(check())
