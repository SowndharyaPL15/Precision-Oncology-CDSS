from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.router import router
from app.api.auth import auth_router
from app.api.admin import admin_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="REST API Backend for Precision Oncology using Transfer Learning Models"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.onrender\.com|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for Grad-CAM explanations
app.mount("/static", StaticFiles(directory=settings.TEMP_UPLOAD_DIR), name="static")

# Include API Routers
app.include_router(router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
async def startup_db():
    print("--- REGISTERED ROUTES ---")
    for r in app.routes:
        if hasattr(r, "path"):
            print(f"  {r.path}")
    print("-------------------------")
    try:
        from app.db.session import engine, AsyncSessionLocal
        from app.db.base import Base
        from app.db.models import User
        from app.core.security import get_password_hash
        from sqlalchemy import select

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS encrypted_embedding TEXT;"))
            await conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS model_version VARCHAR(50) DEFAULT 'v1-128d';"))
            await conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;"))
            await conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;"))
            await conn.execute(text("ALTER TABLE face_embeddings ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;"))

        async with AsyncSessionLocal() as session:
            # Seed default doctor account if not exists
            from app.db.models import Doctor
            res = await session.execute(select(User).where(User.email == "doctor@hospital.org"))
            user_doc = res.scalars().first()
            if not user_doc:
                user_doc = User(
                    full_name="Dr. Sarah Jenkins",
                    email="doctor@hospital.org",
                    password_hash=get_password_hash("doctor123"),
                    role="doctor"
                )
                session.add(user_doc)
                await session.flush() # Generate user_id
                
            # Seed matching Doctor record if not exists
            res_doc = await session.execute(select(Doctor).where(Doctor.email == "doctor@hospital.org"))
            if not res_doc.scalars().first():
                doctor_rec = Doctor(
                    doctor_id=user_doc.user_id,
                    full_name="Dr. Sarah Jenkins",
                    email="doctor@hospital.org",
                    password_hash=user_doc.password_hash,
                    specialization="Oncologist",
                    hospital="General Hospital"
                )
                session.add(doctor_rec)

            # Seed default admin account if not exists
            res_admin = await session.execute(select(User).where(User.email == "admin@hospital.org"))
            if not res_admin.scalars().first():
                admin = User(
                    full_name="System Administrator",
                    email="admin@hospital.org",
                    password_hash=get_password_hash("admin123"),
                    role="admin"
                )
                session.add(admin)

            await session.commit()
    except Exception as e:
        print(f"[WARNING] Startup database setup warning: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8005, reload=False)
