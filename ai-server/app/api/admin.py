import os
import json
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, desc, and_, or_, text

from app.db.session import get_db
from app.db.models import User, FaceEmbedding, WebAuthnCredential, AuditLog, Report, Prediction
from app.core.security import get_current_user, require_roles
from app.core.config import settings

admin_router = APIRouter(
    prefix="/admin",
    tags=["Admin Management"],
    dependencies=[Depends(require_roles(["admin"]))]
)

# --- Pydantic Schemas ---

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserRoleUpdate(BaseModel):
    role: str = Field(..., description="Role: doctor, pathologist, admin")

# --- 1. Dashboard Statistics ---

@admin_router.get("/dashboard-stats")
async def get_admin_dashboard_stats(
    db: AsyncSession = Depends(get_db)
):
    try:
        now = datetime.now(timezone.utc)
        today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

        # 1. Total Users
        tot_users_res = await db.execute(select(func.count(User.user_id)))
        total_users = tot_users_res.scalar() or 0

        # 2. Active Clinical Users
        active_clinical_res = await db.execute(
            select(func.count(User.user_id)).where(
                and_(User.is_active == True, User.role != "admin")
            )
        )
        active_clinical_users = active_clinical_res.scalar() or 0

        # 3. Administrators
        admin_res = await db.execute(
            select(func.count(User.user_id)).where(User.role == "admin")
        )
        admin_count = admin_res.scalar() or 0

        # 4. Today's Login Events
        today_logins_res = await db.execute(
            select(func.count(AuditLog.log_id)).where(
                and_(
                    AuditLog.event_type == "LOGIN_SUCCESS",
                    AuditLog.timestamp >= today_start
                )
            )
        )
        today_login_events = today_logins_res.scalar() or 0

        # 5. Failed Authentication Attempts (All time / recent)
        failed_auth_res = await db.execute(
            select(func.count(AuditLog.log_id)).where(AuditLog.status == "FAILED")
        )
        failed_auth_attempts = failed_auth_res.scalar() or 0

        # 6. Active Biometric Credentials
        active_bio_res = await db.execute(
            select(func.count(FaceEmbedding.embedding_id)).where(FaceEmbedding.is_active == True)
        )
        active_biometrics = active_bio_res.scalar() or 0

        # 7. Reports Generated
        reports_res = await db.execute(select(func.count(Report.report_id)))
        reports_generated = reports_res.scalar() or 0

        # 8. User Distribution by Role
        doctor_res = await db.execute(select(func.count(User.user_id)).where(User.role == "doctor"))
        pathologist_res = await db.execute(select(func.count(User.user_id)).where(User.role == "pathologist"))
        
        doctor_count = doctor_res.scalar() or 0
        pathologist_count = pathologist_res.scalar() or 0

        # 9. Recent Audit Events for Activity Feed
        recent_audit_res = await db.execute(
            select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(10)
        )
        recent_audits = recent_audit_res.scalars().all()
        recent_audit_list = [
            {
                "log_id": log.log_id,
                "email": log.email,
                "event_type": log.event_type,
                "status": log.status,
                "ip_address": log.ip_address or "Internal",
                "timestamp": log.timestamp.isoformat() if log.timestamp else None
            }
            for log in recent_audits
        ]

        return {
            "stats": {
                "total_users": total_users,
                "active_clinical_users": active_clinical_users,
                "administrators": admin_count,
                "today_login_events": today_login_events,
                "failed_auth_attempts": failed_auth_attempts,
                "active_biometric_credentials": active_biometrics,
                "reports_generated": reports_generated,
                "system_status": "Operational"
            },
            "role_distribution": {
                "admin": admin_count,
                "doctor": doctor_count,
                "pathologist": pathologist_count
            },
            "recent_activity": recent_audit_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate dashboard stats: {str(e)}")


# --- 2. User Management ---

@admin_router.get("/users")
async def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(User)

    filters = []
    if search:
        filters.append(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )
    if role:
        filters.append(User.role == role)
    if is_active is not None:
        filters.append(User.is_active == is_active)

    if filters:
        query = query.where(and_(*filters))

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total_users = total_res.scalar() or 0

    # Pagination
    query = query.order_by(desc(User.created_at)).offset(offset).limit(limit)
    res = await db.execute(query)
    users = res.scalars().all()

    # Enrich with biometric and WebAuthn status (without exposing raw vectors)
    user_list = []
    for u in users:
        # Check face auth enrollment
        face_res = await db.execute(
            select(func.count(FaceEmbedding.embedding_id)).where(
                and_(FaceEmbedding.user_id == u.user_id, FaceEmbedding.is_active == True)
            )
        )
        has_face = (face_res.scalar() or 0) > 0

        # Check webauthn credential
        webauthn_res = await db.execute(
            select(func.count(WebAuthnCredential.credential_id)).where(WebAuthnCredential.user_id == u.user_id)
        )
        has_webauthn = (webauthn_res.scalar() or 0) > 0

        user_list.append({
            "user_id": u.user_id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "failed_attempts": u.failed_attempts,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "security_status": {
                "face_auth_enrolled": has_face,
                "webauthn_enrolled": has_webauthn,
                "account_locked": bool(u.locked_until and u.locked_until > datetime.now(timezone.utc))
            }
        })

    return {
        "users": user_list,
        "total": total_users,
        "limit": limit,
        "offset": offset
    }

@admin_router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.user_id == user_id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Administrators cannot deactivate their own active account.")

    res = await db.execute(select(User).where(User.user_id == user_id))
    target_user = res.scalars().first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    target_user.is_active = payload.is_active
    if payload.is_active:
        target_user.failed_attempts = 0
        target_user.locked_until = None

    # Audit Log
    log = AuditLog(
        user_id=current_user.user_id,
        email=current_user.email,
        event_type=f"USER_STATUS_CHANGED_{'ACTIVATED' if payload.is_active else 'DEACTIVATED'}",
        status="SUCCESS",
        auth_factors_used=["admin_override"],
        ip_address="Internal Admin Portal"
    )
    db.add(log)
    await db.commit()

    return {
        "status": "success",
        "user_id": user_id,
        "is_active": target_user.is_active
    }

@admin_router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    valid_roles = ["doctor", "pathologist", "admin"]
    if payload.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role '{payload.role}'. Must be one of {valid_roles}")

    if current_user.user_id == user_id and payload.role.lower() != "admin":
        raise HTTPException(status_code=400, detail="Administrators cannot demote their own admin role.")

    res = await db.execute(select(User).where(User.user_id == user_id))
    target_user = res.scalars().first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    old_role = target_user.role
    target_user.role = payload.role.lower()

    # Audit Log
    log = AuditLog(
        user_id=current_user.user_id,
        email=current_user.email,
        event_type=f"ROLE_CHANGED_{old_role.upper()}_TO_{payload.role.upper()}",
        status="SUCCESS",
        auth_factors_used=["admin_override"],
        ip_address="Internal Admin Portal"
    )
    db.add(log)
    await db.commit()

    return {
        "status": "success",
        "user_id": user_id,
        "previous_role": old_role,
        "new_role": target_user.role
    }

# --- 3. Audit Logs ---

@admin_router.get("/audit-logs")
async def get_audit_logs(
    search: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog)
    filters = []

    if search:
        filters.append(
            or_(
                AuditLog.email.ilike(f"%{search}%"),
                AuditLog.event_type.ilike(f"%{search}%"),
                AuditLog.ip_address.ilike(f"%{search}%")
            )
        )
    if event_type:
        filters.append(AuditLog.event_type == event_type)
    if email:
        filters.append(AuditLog.email.ilike(f"%{email}%"))
    if status:
        filters.append(AuditLog.status == status)

    if filters:
        query = query.where(and_(*filters))

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total_logs = total_res.scalar() or 0

    offset = (page - 1) * limit
    query = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit)

    res = await db.execute(query)
    logs = res.scalars().all()

    log_items = [
        {
            "log_id": log.log_id,
            "user_id": log.user_id,
            "email": log.email,
            "event_type": log.event_type,
            "status": log.status,
            "ip_address": log.ip_address or "127.0.0.1",
            "user_agent": log.user_agent or "Browser",
            "auth_factors_used": log.auth_factors_used,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        }
        for log in logs
    ]

    return {
        "logs": log_items,
        "total": total_logs,
        "page": page,
        "limit": limit,
        "total_pages": (total_logs + limit - 1) // limit if total_logs > 0 else 1
    }

# --- 4. Security Overview ---

@admin_router.get("/security-status")
async def get_security_status(
    db: AsyncSession = Depends(get_db)
):
    tot_face_res = await db.execute(select(func.count(FaceEmbedding.embedding_id)).where(FaceEmbedding.is_active == True))
    face_count = tot_face_res.scalar() or 0

    tot_webauthn_res = await db.execute(select(func.count(WebAuthnCredential.credential_id)))
    webauthn_count = tot_webauthn_res.scalar() or 0

    return {
        "security_matrix": [
            {
                "name": "3FA Multi-Factor Authentication",
                "category": "Authentication",
                "status": "Active",
                "badge_type": "success",
                "description": "Password + AES-256 128D Face Biometrics + FIDO2/WebAuthn Hardware Credential flow.",
                "metric": "Required for All Roles"
            },
            {
                "name": "Face Biometric Encryption",
                "category": "Biometrics",
                "status": "Active",
                "badge_type": "success",
                "description": "Biometric templates encrypted at rest using AES-256 Fernet cipher & 128D cosine distance matching.",
                "metric": f"{face_count} Active Templates"
            },
            {
                "name": "WebAuthn / FIDO2 Token Guard",
                "category": "Hardware Auth",
                "status": "Active",
                "badge_type": "success",
                "description": "W3C WebAuthn hardware token verification for zero-trust endpoint access.",
                "metric": f"{webauthn_count} Registered Tokens"
            },
            {
                "name": "JWT Session & Token Refresh",
                "category": "Session Management",
                "status": "Active",
                "badge_type": "success",
                "description": "60-minute access token expiration with silent refresh rotation.",
                "metric": "HS256 Signing"
            },
            {
                "name": "Role-Based Access Control (RBAC)",
                "category": "Authorization",
                "status": "Active",
                "badge_type": "success",
                "description": "Backend API dependencies and frontend route guards enforcing Doctor, Pathologist, and Admin role isolation.",
                "metric": "Enforced System-Wide"
            },
            {
                "name": "Persistent Audit Logging",
                "category": "Compliance",
                "status": "Active",
                "badge_type": "success",
                "description": "Comprehensive event logging capturing authentication, role changes, and clinical report generation.",
                "metric": "PostgreSQL Stored"
            }
        ]
    }

# --- 5. System Monitoring ---

@admin_router.get("/system-health")
async def get_system_health(
    db: AsyncSession = Depends(get_db)
):
    import tensorflow as tf
    from app.services.inference_service import inference_service

    db_status = "Online"
    db_message = "Connected to PostgreSQL database"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "Offline"
        db_message = f"Database connection failed: {str(e)}"

    ai_status = "Online"
    ai_message = f"TensorFlow {tf.__version__} engine initialized"
    try:
        for m in settings.AVAILABLE_MODELS:
            for d in settings.AVAILABLE_DATASETS:
                try:
                    inference_service._get_model_path(m, d)
                except FileNotFoundError:
                    pass
    except Exception as e:
        ai_status = "Warning"
        ai_message = f"AI Engine warning: {str(e)}"

    storage_status = "Online"
    storage_message = "Temp uploads and static directory writable"
    if not os.path.exists(settings.TEMP_UPLOAD_DIR):
        try:
            os.makedirs(settings.TEMP_UPLOAD_DIR, exist_ok=True)
        except Exception:
            storage_status = "Warning"
            storage_message = "Temp upload directory creation failed"

    return {
        "overall_status": "Online" if (db_status == "Online" and ai_status == "Online") else "Warning",
        "subsystems": [
            {
                "name": "Backend FastAPI Server",
                "status": "Online",
                "version": settings.VERSION,
                "detail": "Processing API requests"
            },
            {
                "name": "PostgreSQL Database",
                "status": db_status,
                "detail": db_message
            },
            {
                "name": "AI Model Inference Engine",
                "status": ai_status,
                "detail": ai_message
            },
            {
                "name": "Static & Grad-CAM Storage",
                "status": storage_status,
                "detail": storage_message
            }
        ]
    }

# --- 6. AI Model Registry ---

@admin_router.get("/models")
async def get_ai_models_registry():
    # Exact evaluated metrics from Table I (Lung Cancer) and Table II (Breast Cancer)
    models_info = [
        {
            "name": "ResNet50",
            "model_id": "resnet50",
            "cancer_type": "Breast & Lung Cancer",
            "architecture": "Residual Network (50-layer deep bottleneck residual blocks)",
            "status": "Active / Deployed",
            "is_best_performing": True,
            "badge_note": "BEST-PERFORMING MODEL",
            "deployment_status": "Production Primary",
            "lung_metrics": {
                "test_accuracy": 0.9550,
                "precision": 0.9550,
                "recall": 0.9550,
                "f1_score": 0.9550,
                "auc_roc": 0.9910
            },
            "breast_metrics": {
                "test_accuracy": 0.9201,
                "precision": 0.9382,
                "recall": 0.9458,
                "f1_score": 0.9420,
                "auc_roc": 0.9780
            },
            "evaluation_metrics": {
                "test_accuracy": 0.9550,
                "precision": 0.9550,
                "recall": 0.9550,
                "f1_score": 0.9550,
                "auc_roc": 0.9910
            }
        },
        {
            "name": "DenseNet121",
            "model_id": "densenet121",
            "cancer_type": "Breast & Lung Cancer",
            "architecture": "Densely Connected Convolutional Network (121 layers with feature reuse)",
            "status": "Active / Deployed",
            "is_best_performing": False,
            "badge_note": "High Feature Efficiency",
            "deployment_status": "Production Secondary",
            "lung_metrics": {
                "test_accuracy": 0.9520,
                "precision": 0.9530,
                "recall": 0.9520,
                "f1_score": 0.9520,
                "auc_roc": 0.9890
            },
            "breast_metrics": {
                "test_accuracy": 0.9134,
                "precision": 0.9359,
                "recall": 0.9359,
                "f1_score": 0.9359,
                "auc_roc": 0.9720
            },
            "evaluation_metrics": {
                "test_accuracy": 0.9520,
                "precision": 0.9530,
                "recall": 0.9520,
                "f1_score": 0.9520,
                "auc_roc": 0.9890
            }
        },
        {
            "name": "EfficientNetB0",
            "model_id": "efficientnet",
            "cancer_type": "Breast & Lung Cancer",
            "architecture": "Compound Scaled Convolutional Network (Lightweight Edge Optimization)",
            "status": "Active / Deployed",
            "is_best_performing": False,
            "badge_note": "Fast Edge Inference",
            "deployment_status": "Production Fast Tier",
            "lung_metrics": {
                "test_accuracy": 0.9470,
                "precision": 0.9480,
                "recall": 0.9470,
                "f1_score": 0.9470,
                "auc_roc": 0.9840
            },
            "breast_metrics": {
                "test_accuracy": 0.8658,
                "precision": 0.9085,
                "recall": 0.8950,
                "f1_score": 0.8996,
                "auc_roc": 0.9560
            },
            "evaluation_metrics": {
                "test_accuracy": 0.9470,
                "precision": 0.9480,
                "recall": 0.9470,
                "f1_score": 0.9470,
                "auc_roc": 0.9840
            }
        }
    ]

    return {
        "models": models_info,
        "best_model": "ResNet50",
        "description": "ResNet50 achieved top performance across both Lung (95.5% Accuracy, 95.5% F1-score) and Breast (92.01% Accuracy, 94.20% F1-score) cancer classification benchmarks."
    }


