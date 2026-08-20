from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timezone
import uuid

from app.db.base import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, default=generate_uuid)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="doctor") # doctor, pathologist, admin
    is_active = Column(Boolean, default=True)
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_device = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    face_embeddings = relationship("FaceEmbedding", back_populates="user", cascade="all, delete-orphan")
    webauthn_credentials = relationship("WebAuthnCredential", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    embedding_id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    embedding_vector = Column(JSONB, nullable=False) # 128-dimensional array of floats
    encrypted_embedding = Column(Text, nullable=True) # AES/Fernet encrypted biometric template
    model_version = Column(String, default="v1-128d")
    sample_count = Column(Integer, default=5)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="face_embeddings")

class WebAuthnCredential(Base):
    __tablename__ = "webauthn_credentials"

    credential_id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    credential_raw_id = Column(String, nullable=False, unique=True, index=True)
    public_key = Column(Text, nullable=False)
    sign_count = Column(Integer, default=0)
    transports = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="webauthn_credentials")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    token_id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class EmailOTP(Base):
    __tablename__ = "email_otps"

    otp_id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, nullable=False, index=True)
    otp_code = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=True, index=True)
    email = Column(String, nullable=False)
    event_type = Column(String, nullable=False) # SIGNUP, LOGIN_SUCCESS, LOGIN_FAILED, FACE_AUTH_FAIL, FINGERPRINT_AUTH_FAIL, OTP_FALLBACK
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    auth_factors_used = Column(JSONB, nullable=True) # ["password", "face", "webauthn"]
    status = Column(String, nullable=False) # SUCCESS / FAILED
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="audit_logs")

# --- Retain Existing Entities ---

class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id = Column(String, primary_key=True, default=generate_uuid)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    specialization = Column(String, nullable=True)
    hospital = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patients = relationship("Patient", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(String, primary_key=True, default=generate_uuid)
    doctor_id = Column(String, ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    full_name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    smoking_history = Column(String, nullable=True)
    family_history = Column(String, nullable=True)
    symptoms = Column(String, nullable=True)
    clinical_biomarkers = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    doctor = relationship("Doctor", back_populates="patients")
    predictions = relationship("Prediction", back_populates="patient", cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    dataset = Column(String, nullable=False)
    model_name = Column(String, nullable=False)
    predicted_class = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    probabilities = Column(JSONB, nullable=False)
    gradcam_path = Column(String, nullable=True)
    report_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="predictions")
    report = relationship("Report", back_populates="prediction", uselist=False, cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String, primary_key=True, default=generate_uuid)
    prediction_id = Column(String, ForeignKey("predictions.prediction_id"), nullable=False, unique=True, index=True)
    recommendation = Column(String, nullable=False)
    report_json = Column(JSONB, nullable=False)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    prediction = relationship("Prediction", back_populates="report")
