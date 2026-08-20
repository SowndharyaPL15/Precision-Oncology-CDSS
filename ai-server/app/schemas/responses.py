from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class HealthResponse(BaseModel):
    status: str
    version: str
    tensorflow_version: str
    uptime_seconds: float

class ModelInfo(BaseModel):
    name: str
    datasets: List[str]
    status: str

class ModelListResponse(BaseModel):
    models: List[ModelInfo]

class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    prediction_time_ms: float

class GradCamResponse(BaseModel):
    predicted_class: str
    confidence: float
    heatmap_path: str
    overlay_path: str
    original_path: str

class ReportResponse(BaseModel):
    patient_info: Optional[Dict[str, Any]] = None
    prediction: PredictionResponse
    gradcam: Optional[GradCamResponse] = None
    recommendation: str

# --- Database-backed response schemas ---

class DoctorResponse(BaseModel):
    doctor_id: str
    full_name: str
    email: str
    specialization: Optional[str] = None
    hospital: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class PatientResponse(BaseModel):
    patient_id: str
    doctor_id: str
    full_name: str
    age: int
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    smoking_history: Optional[str] = None
    family_history: Optional[str] = None
    symptoms: Optional[str] = None
    clinical_biomarkers: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class PredictionDBResponse(BaseModel):
    prediction_id: str
    patient_id: str
    dataset: str
    model_name: str
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    gradcam_path: Optional[str] = None
    report_path: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ReportDBResponse(BaseModel):
    report_id: str
    prediction_id: str
    recommendation: str
    report_json: Dict[str, Any]
    generated_at: datetime

    model_config = {"from_attributes": True}
