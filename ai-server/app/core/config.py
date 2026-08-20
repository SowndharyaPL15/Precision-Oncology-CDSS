import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Clinical Decision Support System - Precision Oncology API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Paths
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    MODELS_DIR: str = os.path.join(BASE_DIR, "models")
    REPORTS_DIR: str = os.path.join(BASE_DIR, "reports")
    TEMP_UPLOAD_DIR: str = os.path.join(BASE_DIR, "temp_uploads")
    
    # Model Configurations
    AVAILABLE_MODELS: list = ["efficientnet", "resnet50", "densenet121"]
    AVAILABLE_DATASETS: list = ["lung", "breast"]
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/precision_oncology")
    
    # ─── Admin Security Codes ───────────────────────────────────────────────────
    # ADMIN_SIGNUP_CODE   : Required when creating an admin account (POST /auth/signup)
    # ADMIN_APPROVAL_CODE : Required during admin login Step 2 (POST /auth/admin/verify-approval-code)
    # Both can be overridden via environment variables in .env
    ADMIN_SIGNUP_CODE: str = os.getenv("ADMIN_SIGNUP_CODE", "ADMIN-SECRET-2026")
    ADMIN_APPROVAL_CODE: str = os.getenv("ADMIN_APPROVAL_CODE", "PREC-ONCO-2026")
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Ensure temp directory exists
os.makedirs(settings.TEMP_UPLOAD_DIR, exist_ok=True)
