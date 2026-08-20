from pydantic import BaseModel, Field
from typing import Optional, List

class PatientInfoSchema(BaseModel):
    patient_id: str = Field(..., description="Unique patient identifier")
    patient_name: Optional[str] = Field(default=None, description="Patient name")
    age: int = Field(..., description="Patient age")
    gender: str = Field(..., description="Patient gender")
    cancer_type: Optional[str] = Field(default=None, description="Cancer type (breast or lung)")
    symptoms: Optional[str] = Field(default=None, description="Reported symptoms")
    family_history: Optional[str] = Field(default=None, description="Family history of cancer (Yes/No)")
    smoking_history: Optional[str] = Field(default=None, description="Smoking history (Never, Former, Current)")
    menopause_status: Optional[str] = Field(default=None, description="Menopause status")
    previous_cancer_history: Optional[str] = Field(default=None, description="Previous cancer history")
    brca_status: Optional[str] = Field(default=None, description="BRCA mutation status")
    notes: Optional[str] = Field(default=None, description="Additional clinical notes")

class PredictRequest(BaseModel):
    dataset: str = Field(..., description="Dataset/cancer type (lung or breast)")
    model_name: str = Field(..., description="Model to use (e.g., densenet121)")
    patient_info: Optional[str] = Field(default=None, description="JSON string of PatientInfoSchema")

class DoctorCreateRequest(BaseModel):
    full_name: str = Field(..., description="Doctor's full name")
    email: str = Field(..., description="Doctor's email address")
    password: str = Field(..., description="Plain-text password (will be hashed)")
    specialization: Optional[str] = Field(default=None, description="Medical specialization")
    hospital: Optional[str] = Field(default=None, description="Hospital affiliation")

class PatientCreateRequest(BaseModel):
    doctor_id: str = Field(..., description="Assigned doctor's ID")
    full_name: str = Field(..., description="Patient's full name")
    age: int = Field(..., description="Patient age")
    gender: str = Field(..., description="Patient gender (M/F)")
    phone: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    smoking_history: Optional[str] = Field(default=None, description="e.g. Never, Former, Current")
    family_history: Optional[str] = Field(default=None, description="Family cancer history")
    symptoms: Optional[str] = Field(default=None, description="Reported symptoms")
    clinical_biomarkers: Optional[dict] = Field(default=None, description="Biomarkers as JSON")
    menopause_status: Optional[str] = Field(default=None)
    previous_cancer_history: Optional[str] = Field(default=None)
    brca_status: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)

class PatientUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, description="Patient's full name")
    age: Optional[int] = Field(default=None, description="Patient age")
    gender: Optional[str] = Field(default=None, description="Patient gender")
    phone: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    smoking_history: Optional[str] = Field(default=None)
    family_history: Optional[str] = Field(default=None)
    symptoms: Optional[str] = Field(default=None)
    clinical_biomarkers: Optional[dict] = Field(default=None)
    menopause_status: Optional[str] = Field(default=None)
    previous_cancer_history: Optional[str] = Field(default=None)
    brca_status: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)

