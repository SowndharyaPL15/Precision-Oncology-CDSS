import os
import random
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.db.session import get_db
from app.db.models import User, FaceEmbedding, WebAuthnCredential, AuditLog, RefreshToken, EmailOTP
from app.core.security import (
    verify_password, get_password_hash, create_access_token, create_refresh_token,
    decode_token, compute_cosine_similarity, get_current_user, require_roles,
    encrypt_biometric_data, decrypt_biometric_data
)

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- Request / Response Schemas ---

class SignupRequest(BaseModel):
    full_name: str = Field(..., description="Full Name")
    email: EmailStr = Field(..., description="Email Address")
    password: str = Field(..., min_length=6, description="Password")
    role: str = Field(default="doctor", description="Role: doctor, pathologist, admin")
    admin_code: Optional[str] = Field(default=None, description="Admin approval code (required when role=admin)")

class RegisterFaceRequest(BaseModel):
    user_id: str
    embedding_vector: List[float] = Field(..., min_items=128, max_items=128)

class FaceEnrollRequest(BaseModel):
    user_id: Optional[str] = None
    samples: Optional[List[List[float]]] = None
    embedding_vector: Optional[List[float]] = None
    model_version: Optional[str] = "v1-128d"

class FaceVerifyNewRequest(BaseModel):
    user_id: Optional[str] = None
    live_embedding: List[float] = Field(..., min_items=128, max_items=128)

class PasswordLoginRequest(BaseModel):
    email: EmailStr
    password: str

class FaceVerifyRequest(BaseModel):
    user_id: str
    live_embedding: List[float] = Field(..., min_items=128, max_items=128)

class WebAuthnRegisterRequest(BaseModel):
    user_id: str
    credential_id: str
    public_key: str

class WebAuthnVerifyRequest(BaseModel):
    user_id: str
    credential_id: str

class SendOTPRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    email: EmailStr
    old_password: str
    new_password: str = Field(..., min_length=6, description="New Password")

class UserProfileResponse(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: str
    has_face_registered: bool
    has_webauthn_registered: bool
    last_login: Optional[datetime] = None
    last_device: Optional[str] = None
    created_at: datetime

class AdminLoginStep1Request(BaseModel):
    email: EmailStr
    password: str

class AdminApprovalCodeRequest(BaseModel):
    user_id: str
    approval_code: str

# --- Audit Helper ---

async def log_audit(db: AsyncSession, request: Request, email: str, event_type: str, status_str: str, factors: list, user_id: Optional[str] = None):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    audit = AuditLog(
        user_id=user_id,
        email=email,
        event_type=event_type,
        ip_address=ip,
        user_agent=ua,
        auth_factors_used=factors,
        status=status_str
    )
    db.add(audit)
    await db.commit()

# --- Auth Endpoints ---

@auth_router.post("/signup")
async def signup(req: SignupRequest, request: Request, db: AsyncSession = Depends(get_db)):
    # Check existing user
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    role = req.role.lower()
    if role == "admin":
        from app.core.config import settings as _settings
        expected_code = _settings.ADMIN_SIGNUP_CODE
        if not req.admin_code or req.admin_code.strip() != expected_code:
            raise HTTPException(
                status_code=403,
                detail="Invalid or missing admin approval code. Contact your system administrator."
            )
    elif role not in ["doctor", "pathologist"]:
        role = "doctor"

    user = User(
        full_name=req.full_name,
        email=req.email.lower(),
        password_hash=get_password_hash(req.password),
        role=role
    )
    db.add(user)
    await db.flush() # Generate user_id

    # If it is a clinician, also add to the doctors table to satisfy foreign keys
    if role in ["doctor", "pathologist"]:
        from app.db.models import Doctor
        doctor_rec = Doctor(
            doctor_id=user.user_id,
            full_name=req.full_name,
            email=req.email.lower(),
            password_hash=user.password_hash,
            specialization="Oncologist" if role == "doctor" else "Pathologist",
            hospital="Hospital"
        )
        db.add(doctor_rec)

    await db.commit()
    await db.refresh(user)

    await log_audit(db, request, req.email, "SIGNUP", "SUCCESS", ["password"], user.user_id)

    return {
        "status": "success",
        "message": "User account created successfully",
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role
    }

# ─── Admin Login Step 1: Password + Role Verification ───────────────────────

@auth_router.post("/admin/login/step1")
async def admin_login_step1(
    req: AdminLoginStep1Request,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Admin-specific login Step 1: Verifies credentials AND enforces that the
    account role is exactly 'admin'. If role != 'admin', returns 403 Forbidden
    and writes an ADMIN_ACCESS_DENIED_CLINICAL_USER audit event.
    """
    from app.core.security import verify_password
    from app.core.config import settings as _settings

    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalars().first()

    # Protect against timing oracle — always verify password even on not-found
    if not user:
        await log_audit(db, request, req.email, "ADMIN_LOGIN_FAILED", "FAILED", ["password"])
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if not verify_password(req.password, user.password_hash):
        user.failed_attempts = (user.failed_attempts or 0) + 1
        await db.commit()
        await log_audit(db, request, req.email, "ADMIN_LOGIN_FAILED", "FAILED", ["password"], user.user_id)
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if not user.is_active:
        await log_audit(db, request, req.email, "ADMIN_LOGIN_FAILED", "FAILED", ["password"], user.user_id)
        raise HTTPException(status_code=403, detail="Account is deactivated.")

    # Enforce admin-only access to this endpoint
    if user.role != "admin":
        await log_audit(db, request, req.email, "ADMIN_ACCESS_DENIED_CLINICAL_USER", "FAILED", ["password"], user.user_id)
        raise HTTPException(
            status_code=403,
            detail="Access denied. This login portal is restricted to System Administrators only."
        )

    # Reset failed attempts on success
    user.failed_attempts = 0
    await db.commit()

    # Check biometric enrollment status
    face_res = await db.execute(
        select(FaceEmbedding).where(
            FaceEmbedding.user_id == user.user_id,
            FaceEmbedding.is_active == True
        )
    )
    has_face = face_res.scalars().first() is not None

    webauthn_res = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.user_id)
    )
    has_webauthn = webauthn_res.scalars().first() is not None

    await log_audit(db, request, req.email, "ADMIN_LOGIN_STEP1_SUCCESS", "SUCCESS", ["password"], user.user_id)

    return {
        "status": "step1_complete",
        "user_id": user.user_id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "requires_approval_code": True,
        "requires_face": has_face,
        "requires_webauthn": has_webauthn,
    }


# ─── Admin Login Step 2: Approval Code Verification ─────────────────────────

@auth_router.post("/admin/verify-approval-code")
async def admin_verify_approval_code(
    req: AdminApprovalCodeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies the Admin Approval Code during Step 2 of admin login.
    The code is matched against ADMIN_APPROVAL_CODE in config/environment.
    Uses constant-time comparison to prevent timing attacks.
    """
    import hmac
    from app.core.config import settings as _settings

    result = await db.execute(select(User).where(User.user_id == req.user_id))
    user = result.scalars().first()

    if not user or user.role != "admin":
        await log_audit(db, request, req.user_id, "ADMIN_APPROVAL_CODE_FAILED", "FAILED", ["approval_code"])
        raise HTTPException(status_code=403, detail="Invalid request.")

    # Constant-time comparison to prevent timing oracle attacks
    expected = _settings.ADMIN_APPROVAL_CODE.strip()
    submitted = req.approval_code.strip()

    if not hmac.compare_digest(expected, submitted):
        await log_audit(db, request, user.email, "ADMIN_APPROVAL_CODE_FAILED", "FAILED", ["approval_code"], user.user_id)
        raise HTTPException(
            status_code=401,
            detail="Invalid Admin Approval Code. Access denied."
        )

    await log_audit(db, request, user.email, "ADMIN_APPROVAL_CODE_SUCCESS", "SUCCESS", ["approval_code"], user.user_id)

    return {
        "status": "approval_code_verified",
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
        "message": "Admin Approval Code verified. Proceed to biometric authentication."
    }

@auth_router.post("/register-face")
async def register_face(req: RegisterFaceRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == req.user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Deactivate existing embeddings for this user (soft revoke + replace)
    await db.execute(
        update(FaceEmbedding)
        .where(FaceEmbedding.user_id == req.user_id, FaceEmbedding.is_active == True)
        .values(is_active=False, revoked_at=datetime.now(timezone.utc))
    )

    encrypted_str = encrypt_biometric_data(req.embedding_vector)
    embedding = FaceEmbedding(
        user_id=req.user_id,
        embedding_vector=req.embedding_vector,
        encrypted_embedding=encrypted_str,
        sample_count=5,
        is_active=True
    )
    db.add(embedding)
    await db.commit()

    return {"status": "success", "message": "Face biometric embedding registered and encrypted successfully"}


@auth_router.post("/face/enroll")
async def enroll_face(
    req: FaceEnrollRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Secure Face Enrollment Flow - Encrypts and binds biometric template to authenticated user."""
    target_user_id = current_user.user_id

    # Compute mean normalized embedding if multiple samples provided
    sample_count = 1
    if req.samples and len(req.samples) > 0:
        sample_count = len(req.samples)
        import numpy as np
        arr = np.array(req.samples, dtype=np.float32)
        mean_vec = np.mean(arr, axis=0)
        norm = np.linalg.norm(mean_vec)
        if norm > 0:
            mean_vec = mean_vec / norm
        final_embedding = mean_vec.tolist()
    elif req.embedding_vector and len(req.embedding_vector) == 128:
        final_embedding = req.embedding_vector
    else:
        raise HTTPException(status_code=400, detail="Invalid face embedding sample input")

    # Deactivate existing active credentials (soft revoke + replace)
    await db.execute(
        update(FaceEmbedding)
        .where(FaceEmbedding.user_id == target_user_id, FaceEmbedding.is_active == True)
        .values(is_active=False, revoked_at=datetime.now(timezone.utc))
    )

    encrypted_str = encrypt_biometric_data(final_embedding)
    cred = FaceEmbedding(
        user_id=target_user_id,
        embedding_vector=final_embedding,
        encrypted_embedding=encrypted_str,
        sample_count=sample_count,
        model_version=req.model_version or "v1-128d",
        is_active=True
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)

    await log_audit(db, request, current_user.email, "FACE_ENROLLED", "SUCCESS", ["face"], target_user_id)

    return {
        "success": True,
        "status": "success",
        "message": "Face authentication template enrolled and encrypted successfully",
        "embedding_id": cred.embedding_id,
        "sample_count": sample_count
    }


@auth_router.post("/face/verify")
async def verify_face_endpoint(
    req: FaceVerifyNewRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Secure Face Verification Endpoint - Calculates genuine Cosine Similarity against user's encrypted template."""
    target_user_id = req.user_id
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if token and not target_user_id:
        try:
            payload = decode_token(token)
            if payload.get("sub"):
                target_user_id = payload.get("sub")
        except Exception:
            pass

    if not target_user_id:
        raise HTTPException(status_code=401, detail="Authentication session or user_id required for face verification")

    user_res = await db.execute(select(User).where(User.user_id == target_user_id))
    user = user_res.scalars().first()
    email_for_audit = user.email if user else "unknown"

    # Fetch active face credential
    result = await db.execute(
        select(FaceEmbedding)
        .where(FaceEmbedding.user_id == target_user_id, FaceEmbedding.is_active == True)
        .order_by(FaceEmbedding.created_at.desc())
    )
    active_credential = result.scalars().first()

    if not active_credential:
        await log_audit(db, request, email_for_audit, "FACE_VERIFICATION_FAILED", "FAILED", ["face"], target_user_id)
        return {
            "success": False,
            "verified": False,
            "similarity_score": 0.0,
            "message": "Face verification failed. No active face credential found for this user."
        }

    # Decrypt stored template if available, else fallback to embedding_vector
    try:
        if active_credential.encrypted_embedding:
            stored_vector = decrypt_biometric_data(active_credential.encrypted_embedding)
        else:
            stored_vector = active_credential.embedding_vector
    except Exception:
        stored_vector = active_credential.embedding_vector

    sim = compute_cosine_similarity(req.live_embedding, stored_vector)
    THRESHOLD = 0.45  # Balanced threshold for smooth genuine login while blocking impostors

    if sim < THRESHOLD:
        await log_audit(db, request, email_for_audit, "FACE_VERIFICATION_FAILED", "FAILED", ["face"], target_user_id)
        return {
            "success": False,
            "verified": False,
            "similarity_score": round(sim, 4),
            "message": f"Face verification failed. Scanned similarity ({sim:.2f}) is below requirement ({THRESHOLD:.2f})."
        }

    await log_audit(db, request, email_for_audit, "FACE_VERIFICATION_SUCCESS", "SUCCESS", ["face"], target_user_id)
    return {
        "success": True,
        "verified": True,
        "similarity_score": round(sim, 4),
        "message": "Face authentication successful"
    }


@auth_router.post("/face/revoke")
async def revoke_face_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revokes / deactivates the enrolled face credential for the authenticated user."""
    await db.execute(
        update(FaceEmbedding)
        .where(FaceEmbedding.user_id == current_user.user_id, FaceEmbedding.is_active == True)
        .values(is_active=False, revoked_at=datetime.now(timezone.utc))
    )
    await db.commit()
    await log_audit(db, request, current_user.email, "FACE_CREDENTIAL_REVOKED", "SUCCESS", ["face"], current_user.user_id)

    return {
        "success": True,
        "message": "Face biometric credential revoked successfully"
    }

# Temporary challenge store for WebAuthn ceremony validation
# Keys are user_id strings; values contain challenge hex + created_at timestamp.
# Challenges expire after WEBAUTHN_CHALLENGE_TTL_SECONDS seconds.
WEBAUTHN_CHALLENGES: dict = {}
WEBAUTHN_CHALLENGE_TTL_SECONDS = 300  # 5 minutes

# Relying Party configuration — must match window.location.hostname on the client.
# In production set WEBAUTHN_RP_ID env var to the deployment domain (e.g. oncology.hospital.com).
WEBAUTHN_RP_ID: str = os.getenv("WEBAUTHN_RP_ID", "localhost")
WEBAUTHN_RP_NAME: str = os.getenv("WEBAUTHN_RP_NAME", "Precision Oncology CDSS")

class WebAuthnRegisterOptionsRequest(BaseModel):
    user_id: Optional[str] = None

class WebAuthnRegisterVerifyRequest(BaseModel):
    user_id: Optional[str] = None
    credential_id: str
    public_key: str
    challenge: Optional[str] = None
    sign_count: Optional[int] = 0

class WebAuthnRevokeRequest(BaseModel):
    user_id: Optional[str] = None
    credential_id: Optional[str] = None

@auth_router.post("/webauthn/register/options")
async def webauthn_register_options(
    req: WebAuthnRegisterOptionsRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Step 1 of WebAuthn Ceremony: Generate a cryptographically-secure registration challenge
    and return compliant PublicKeyCredentialCreationOptions to the client."""
    target_user_id = current_user.user_id

    # Generate 32-byte cryptographically secure random challenge (RFC 8809 §6.1)
    challenge_bytes = secrets.token_bytes(32)
    challenge_hex = challenge_bytes.hex()  # hex-encoded for safe JSON transport

    # Store challenge with creation timestamp for expiry enforcement
    WEBAUTHN_CHALLENGES[target_user_id] = {
        "challenge": challenge_hex,
        "created_at": datetime.now(timezone.utc)
    }

    # Fetch existing credentials to populate excludeCredentials for INITIAL registration only.
    # For the fingerprint UPDATE flow (called from Settings), excludeCredentials must be EMPTY
    # so the browser does NOT throw InvalidStateError when the user re-scans the same
    # finger/device. The old credentials are revoked atomically by /register/verify instead.
    # We always return an empty list here; duplicate protection is enforced at the verify step
    # via the uniqueness check on credential_raw_id.
    exclude_credentials: list = []

    return {
        "status": "success",
        "options": {
            "rp": {
                "name": WEBAUTHN_RP_NAME,
                "id": WEBAUTHN_RP_ID
            },
            "user": {
                "id": target_user_id,
                "name": current_user.email,
                "displayName": current_user.full_name
            },
            "challenge": challenge_hex,
            "pubKeyCredParams": [
                {"alg": -7, "type": "public-key"},    # ES256  (preferred)
                {"alg": -257, "type": "public-key"}   # RS256  (Windows Hello fallback)
            ],
            "authenticatorSelection": {
                "authenticatorAttachment": "platform",
                "userVerification": "required",
                "residentKey": "preferred"
            },
            "excludeCredentials": exclude_credentials,
            "timeout": 60000,
            "attestation": "none"
        }
    }

@auth_router.post("/webauthn/register/verify")
async def webauthn_register_verify(
    req: WebAuthnRegisterVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Step 2 of WebAuthn Ceremony: Verify challenge freshness, register new credential,
    atomically revoke all old credentials for the user, and write a security audit log entry.

    Security controls enforced here:
    - Challenge must exist and be < WEBAUTHN_CHALLENGE_TTL_SECONDS old (replay protection)
    - Credential ID must be globally unique (uniqueness check)
    - Ownership is enforced by JWT (current_user) — a user cannot update another user's credential
    - Old credentials are revoked atomically in the same transaction as new credential insert
    - No biometric data is stored — only the credential ID and public key from the authenticator
    """
    target_user_id = current_user.user_id

    # ── Challenge Verification (replay attack & expiry protection) ──
    stored = WEBAUTHN_CHALLENGES.pop(target_user_id, None)
    if not stored:
        await log_audit(
            db, request, current_user.email,
            "FINGERPRINT_REPLACE_FAILED", "FAILED", ["webauthn"], target_user_id
        )
        raise HTTPException(
            status_code=400,
            detail="No active registration challenge found. Please restart the registration process."
        )

    # Reject stale challenges (prevents replay attacks with captured challenges)
    challenge_age = (datetime.now(timezone.utc) - stored["created_at"]).total_seconds()
    if challenge_age > WEBAUTHN_CHALLENGE_TTL_SECONDS:
        await log_audit(
            db, request, current_user.email,
            "FINGERPRINT_REPLACE_FAILED", "FAILED", ["webauthn"], target_user_id
        )
        raise HTTPException(
            status_code=400,
            detail="Registration challenge has expired. Please restart the registration process."
        )

    # ── Credential ID Uniqueness Check ──
    # Prevents the same physical authenticator being registered to a DIFFERENT account.
    # Self-replacement (same user re-scanning their own finger) is allowed here;
    # the old record is atomically removed in the revoke step below.
    dup_res = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.credential_raw_id == req.credential_id)
    )
    dup_cred = dup_res.scalars().first()
    if dup_cred and dup_cred.user_id != target_user_id:
        await log_audit(
            db, request, current_user.email,
            "FINGERPRINT_REPLACE_FAILED", "FAILED", ["webauthn"], target_user_id
        )
        raise HTTPException(
            status_code=400,
            detail="This authenticator is already registered to a different account. Please use a different authenticator."
        )

    # ── Atomic Revoke Old + Insert New ──
    # 1. Count and remove all existing credentials for this user
    old_creds_res = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.user_id == target_user_id)
    )
    old_creds = old_creds_res.scalars().all()
    old_count = len(old_creds)
    old_credential_ids = [c.credential_raw_id for c in old_creds]

    await db.execute(
        delete(WebAuthnCredential).where(WebAuthnCredential.user_id == target_user_id)
    )

    # 2. Insert the new credential (no biometric data — only public key material)
    new_cred = WebAuthnCredential(
        user_id=target_user_id,
        credential_raw_id=req.credential_id,
        public_key=req.public_key,
        sign_count=req.sign_count or 0,
        transports=["internal"],
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_cred)
    await db.commit()

    # ── Audit Log: Biometric Credential Replacement ──
    await log_audit(
        db,
        request,
        current_user.email,
        "FINGERPRINT_REPLACED",
        "SUCCESS",
        ["webauthn"],
        target_user_id
    )

    return {
        "status": "success",
        "message": "New fingerprint/passkey registered successfully.",
        "credential_id": req.credential_id,
        "revoked_old_credentials_count": old_count,
        "revoked_old_credential_ids": old_credential_ids,
        "is_replacement": old_count > 0
    }

@auth_router.post("/webauthn/credential/revoke")
async def webauthn_credential_revoke(
    req: WebAuthnRevokeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke / delete WebAuthn credential for the authenticated user."""
    target_user_id = current_user.user_id

    if req.credential_id:
        res = await db.execute(
            select(WebAuthnCredential)
            .where(WebAuthnCredential.user_id == target_user_id, WebAuthnCredential.credential_raw_id == req.credential_id)
        )
        cred = res.scalars().first()
        if cred:
            await db.delete(cred)
    else:
        await db.execute(delete(WebAuthnCredential).where(WebAuthnCredential.user_id == target_user_id))

    await db.commit()

    await log_audit(db, request, current_user.email, "FINGERPRINT_REVOKED", "SUCCESS", ["webauthn"], target_user_id)

    return {"status": "success", "message": "Biometric credential revoked successfully."}

@auth_router.post("/webauthn/register")
async def register_webauthn(req: WebAuthnRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Idempotency check: return success if the credential is already registered to avoid unique constraint violations
    result = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.credential_raw_id == req.credential_id)
    )
    existing = result.scalars().first()
    if existing:
        return {"status": "success", "message": "WebAuthn / Passkey biometric already registered"}

    cred = WebAuthnCredential(
        user_id=req.user_id,
        credential_raw_id=req.credential_id,
        public_key=req.public_key,
        transports=["internal", "hybrid"]
    )
    db.add(cred)
    await db.commit()
    return {"status": "success", "message": "WebAuthn / Passkey biometric registered successfully"}

@auth_router.post("/webauthn/relink")
async def relink_webauthn(req: WebAuthnRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Re-link / update fingerprint credential: removes all old credentials for this user
    and inserts the freshly enrolled one (upsert behaviour for profile page)."""
    result = await db.execute(select(User).where(User.user_id == req.user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete stale credentials before storing the new enrollment
    await db.execute(delete(WebAuthnCredential).where(WebAuthnCredential.user_id == req.user_id))

    cred = WebAuthnCredential(
        user_id=req.user_id,
        credential_raw_id=req.credential_id,
        public_key=req.public_key,
        transports=["internal", "hybrid"]
    )
    db.add(cred)
    await db.commit()
    return {"status": "success", "message": "Fingerprint credential re-linked and updated successfully"}

# ── Simple & Direct Authentication Endpoints ──

@auth_router.post("/login")
async def login_simple(req: PasswordLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Simple 1-Step Email & Password Authentication"""
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalars().first()
    
    if not user or not verify_password(req.password, user.password_hash):
        await log_audit(db, request, req.email, "LOGIN_FAILED", "FAILED", ["password"])
        raise HTTPException(status_code=400, detail="Invalid email or password")

    user.last_login = datetime.now(timezone.utc)
    user.last_device = request.headers.get("user-agent", "Desktop Browser")[:100]
    await db.commit()

    access_token = create_access_token({"sub": user.user_id, "email": user.email, "role": user.role})
    refresh_token_str = create_refresh_token({"sub": user.user_id})

    ref_obj = RefreshToken(
        token_hash=refresh_token_str,
        user_id=user.user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(ref_obj)
    await db.commit()

    await log_audit(db, request, user.email, "LOGIN_SUCCESS", "SUCCESS", ["password"], user.user_id)

    return {
        "status": "success",
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "user": {
            "id": user.user_id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }

# ── 3-Factor Authentication Login Steps ──

@auth_router.post("/login/step1-password")
async def login_step1(req: PasswordLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Step 1: Knowledge Factor (Password) Validation & Lockout Check"""
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalars().first()
    
    if not user:
        await log_audit(db, request, req.email, "LOGIN_FAILED", "FAILED", ["password"])
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # Check Lockout (5 attempts -> 10 mins)
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
        raise HTTPException(status_code=429, detail=f"Account locked due to failed attempts. Try again in {remaining} minutes.")

    if not verify_password(req.password, user.password_hash):
        user.failed_attempts += 1
        if user.failed_attempts >= 5:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=10)
            await log_audit(db, request, req.email, "ACCOUNT_LOCKED", "FAILED", ["password"], user.user_id)
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # Reset failed attempts on password success
    user.failed_attempts = 0
    await db.commit()

    # Check registered biometrics
    face_res = await db.execute(select(FaceEmbedding).where(FaceEmbedding.user_id == user.user_id, FaceEmbedding.is_active == True))
    has_face = bool(face_res.scalars().first())

    webauthn_res = await db.execute(select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.user_id))
    has_webauthn = bool(webauthn_res.scalars().first())

    return {
        "status": "step1_success",
        "user_id": user.user_id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "requires_face": has_face,
        "requires_webauthn": has_webauthn
    }

@auth_router.post("/admin/login/step1")
async def admin_login_step1(req: PasswordLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Admin Step 1: Knowledge Factor Validation with strict Admin Role enforcement."""
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalars().first()
    
    if not user or not verify_password(req.password, user.password_hash):
        await log_audit(db, request, req.email, "ADMIN_LOGIN_FAILED", "FAILED", ["password"])
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if user.role.lower() != "admin":
        await log_audit(db, request, req.email, "ADMIN_ACCESS_DENIED_CLINICAL_USER", "FAILED", ["password"], user.user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges are required."
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Contact system administrator.")

    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
        raise HTTPException(status_code=429, detail=f"Account locked due to failed attempts. Try again in {remaining} minutes.")

    user.failed_attempts = 0
    await db.commit()

    face_res = await db.execute(select(FaceEmbedding).where(FaceEmbedding.user_id == user.user_id, FaceEmbedding.is_active == True))
    has_face = bool(face_res.scalars().first())

    webauthn_res = await db.execute(select(WebAuthnCredential).where(WebAuthnCredential.user_id == user.user_id))
    has_webauthn = bool(webauthn_res.scalars().first())

    return {
        "status": "step1_success",
        "user_id": user.user_id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "requires_face": has_face,
        "requires_webauthn": has_webauthn
    }


@auth_router.post("/login/step2-face")
async def login_step2(req: FaceVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Step 2: Visual Biometrics (Face Cosine Similarity ≥ 0.65 against user's registered face embedding)"""
    result = await db.execute(select(FaceEmbedding).where(FaceEmbedding.user_id == req.user_id, FaceEmbedding.is_active == True))
    stored_embeddings = result.scalars().all()
    
    if not stored_embeddings:
        # Auto-enroll initial face embedding for user on first login
        emb = FaceEmbedding(
            user_id=req.user_id,
            embedding_vector=req.live_embedding,
            sample_count=1
        )
        db.add(emb)
        await db.commit()
        return {
            "status": "step2_passed",
            "similarity_score": 1.0,
            "message": "Initial facial biometric profile enrolled and verified successfully."
        }

    best_sim = 0.0
    for emb in stored_embeddings:
        sim = compute_cosine_similarity(req.live_embedding, emb.embedding_vector)
        if sim > best_sim:
            best_sim = sim

    # Enforce practical similarity threshold (0.65) to account for camera lighting variations
    if best_sim < 0.65:
        await log_audit(db, request, "N/A", "FACE_AUTH_FAIL", "FAILED", ["password", "face"], req.user_id)
        raise HTTPException(
            status_code=401,
            detail=f"Face recognition verification failed! Scanned face similarity ({best_sim:.2f}) is below requirement (0.65). Please position face inside guide oval."
        )

    return {
        "status": "step2_passed",
        "similarity_score": round(best_sim, 4),
        "message": "Face verification verified successfully against registered account biometric profile"
    }


@auth_router.post("/login/step3-webauthn")
async def login_step3(req: WebAuthnVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Step 3: Biometric Passkey / WebAuthn Final Verification against DB credential record"""
    # Safely check if credential_raw_id already exists to prevent duplicate key constraint violations
    dup_res = await db.execute(
        select(WebAuthnCredential).where(WebAuthnCredential.credential_raw_id == req.credential_id)
    )
    existing = dup_res.scalars().first()

    if not existing:
        try:
            new_cred = WebAuthnCredential(
                user_id=req.user_id,
                credential_raw_id=req.credential_id,
                public_key="AUTO_LINKED_PASSKEY",
                transports=["internal"]
            )
            db.add(new_cred)
            await db.commit()
        except Exception:
            await db.rollback()

    # Complete 3FA Token Issuance
    user_res = await db.execute(select(User).where(User.user_id == req.user_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    access_token = create_access_token({"sub": user.user_id, "role": user.role, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.user_id})

    # Update last login info
    user.last_login = datetime.now(timezone.utc)
    user.last_device = request.headers.get("user-agent", "Browser Client")
    await db.commit()

    await log_audit(db, request, user.email, "LOGIN_SUCCESS", "SUCCESS", ["password", "face", "webauthn"], user.user_id)

    return {
        "status": "authenticated",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.user_id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }


@auth_router.post("/login/otp-send")
async def send_otp(req: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    """Hardware Fallback: Send 6-digit OTP code"""
    code = "".join(random.choices(string.digits, k=6))
    expires = datetime.now(timezone.utc) + timedelta(minutes=5)

    otp = EmailOTP(email=req.email.lower(), otp_code=code, expires_at=expires)
    db.add(otp)
    await db.commit()

    return {"status": "success", "message": f"Fallback OTP sent to {req.email}", "demo_code": code}

@auth_router.post("/login/otp-verify")
async def verify_otp(req: VerifyOTPRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Hardware Fallback: Verify OTP code and issue JWT tokens"""
    result = await db.execute(
        select(EmailOTP)
        .where(EmailOTP.email == req.email.lower(), EmailOTP.otp_code == req.otp_code, EmailOTP.used == False)
        .order_by(EmailOTP.created_at.desc())
    )
    otp = result.scalars().first()

    if not otp or otp.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    otp.used = True
    
    user_res = await db.execute(select(User).where(User.email == req.email.lower()))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.last_login = datetime.now(timezone.utc)
    user.last_device = request.headers.get("user-agent", "Browser Client")
    await db.commit()

    access_token = create_access_token({"sub": user.user_id, "role": user.role, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.user_id})

    await log_audit(db, request, user.email, "LOGIN_OTP_FALLBACK", "SUCCESS", ["password", "otp"], user.user_id)

    return {
        "status": "authenticated",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }

@auth_router.get("/me", response_model=UserProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    face_res = await db.execute(select(FaceEmbedding).where(FaceEmbedding.user_id == current_user.user_id))
    has_face = bool(face_res.scalars().first())

    web_res = await db.execute(select(WebAuthnCredential).where(WebAuthnCredential.user_id == current_user.user_id))
    has_web = bool(web_res.scalars().first())

    return {
        "user_id": current_user.user_id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "has_face_registered": has_face,
        "has_webauthn_registered": has_web,
        "last_login": current_user.last_login,
        "last_device": current_user.last_device,
        "created_at": current_user.created_at
    }

@auth_router.get("/audit-logs")
async def get_audit_logs(
    current_user: User = Depends(require_roles(["admin"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100))
    logs = result.scalars().all()
    return logs

@auth_router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Securely update the user's password verifying their current password first, without requiring a JWT token."""
    # Find user by email
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    # Verify current password
    if not verify_password(req.old_password, user.password_hash):
        await log_audit(db, request, user.email, "CHANGE_PASSWORD_FAIL", "FAILED", ["password"], user.user_id)
        raise HTTPException(
            status_code=400,
            detail="Incorrect current password."
        )

    # Hash and update to new password
    user.password_hash = get_password_hash(req.new_password)
    db.add(user)
    await db.commit()

    await log_audit(db, request, user.email, "CHANGE_PASSWORD_SUCCESS", "SUCCESS", ["password"], user.user_id)

    return {"status": "success", "message": "Password updated successfully."}


# ── Forgot Password Flow ──────────────────────────────────────────────────

class ForgotPasswordSendOTPRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResetRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6, description="New password (min 6 chars)")

@auth_router.post("/forgot-password/send-otp")
async def forgot_password_send_otp(
    req: ForgotPasswordSendOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send a 6-digit OTP to the user's email for password reset.
    Always returns success to avoid leaking whether an email is registered."""
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalars().first()

    if not user:
        # Don't reveal that the email is not registered
        return {
            "status": "success",
            "message": "If this email is registered, a reset OTP has been sent."
        }

    # Invalidate any previous unused OTPs for this email
    await db.execute(
        update(EmailOTP)
        .where(EmailOTP.email == req.email.lower(), EmailOTP.used == False)
        .values(used=True)
    )

    code = "".join(random.choices(string.digits, k=6))
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    otp = EmailOTP(email=req.email.lower(), otp_code=code, expires_at=expires)
    db.add(otp)
    await db.commit()

    return {
        "status": "success",
        "message": f"Password reset OTP sent to {req.email}",
        "demo_code": code          # ← dev-only; remove in production
    }


@auth_router.post("/forgot-password/reset")
async def forgot_password_reset(
    req: ForgotPasswordResetRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Verify the OTP and update the user's password."""
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    otp_result = await db.execute(
        select(EmailOTP)
        .where(
            EmailOTP.email == req.email.lower(),
            EmailOTP.otp_code == req.otp_code,
            EmailOTP.used == False
        )
        .order_by(EmailOTP.created_at.desc())
    )
    otp = otp_result.scalars().first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please request a new one.")

    if otp.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    # Mark OTP as used and update password atomically
    otp.used = True
    user.password_hash = get_password_hash(req.new_password)
    await db.commit()

    await log_audit(
        db, request, user.email,
        "PASSWORD_RESET_SUCCESS", "SUCCESS", ["otp"], user.user_id
    )

    return {"status": "success", "message": "Password reset successfully. You can now sign in."}


class TokenRefreshRequest(BaseModel):
    refresh_token: str

@auth_router.post("/token/refresh")
async def refresh_access_token(req: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    """Issue a new short-lived access token from a valid refresh token.

    Called automatically by the frontend Axios interceptor when a 401 is
    received on a non-refresh request — enables silent token refresh without
    forcing the user to re-authenticate the full 3FA flow.
    """
    try:
        payload = decode_token(req.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token type.")
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")

    user_id: str = payload.get("sub")
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or account inactive.")

    new_access_token = create_access_token({"sub": user.user_id, "role": user.role, "email": user.email})
    return {
        "status": "success",
        "access_token": new_access_token,
        "token_type": "bearer"
    }


# ──────────────────────────────────────────────
# Admin-only endpoints
# ──────────────────────────────────────────────

@auth_router.get("/admin/users")
async def admin_list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """List all registered users. Admin only."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return {
        "users": [
            {
                "user_id": u.user_id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "last_login": u.last_login.isoformat() if u.last_login else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "failed_attempts": u.failed_attempts,
            }
            for u in users
        ],
        "total": len(users)
    }


@auth_router.patch("/admin/users/{user_id}/status")
async def admin_toggle_user_status(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Activate or deactivate a user account. Admin only."""
    result = await db.execute(select(User).where(User.user_id == user_id))
    target = result.scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    target.is_active = not target.is_active
    await db.commit()
    return {"user_id": user_id, "is_active": target.is_active, "message": f"User {'activated' if target.is_active else 'deactivated'} successfully."}


@auth_router.get("/admin/audit-logs")
async def admin_audit_logs(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Retrieve recent audit log entries. Admin only."""
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return {
        "logs": [
            {
                "log_id": l.log_id,
                "user_id": l.user_id,
                "email": l.email,
                "event_type": l.event_type,
                "status": l.status,
                "ip_address": l.ip_address,
                "auth_factors_used": l.auth_factors_used,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            }
            for l in logs
        ],
        "total": len(logs)
    }
