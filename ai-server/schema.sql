-- ============================================================
-- Precision Oncology - Clinical Decision Support System
-- Initial Database Schema
-- ============================================================

CREATE DATABASE precision_oncology;

\c precision_oncology;

-- Table 1: Doctors
CREATE TABLE doctors (
    doctor_id       VARCHAR PRIMARY KEY,
    full_name       VARCHAR NOT NULL,
    email           VARCHAR UNIQUE NOT NULL,
    password_hash   VARCHAR NOT NULL,
    specialization  VARCHAR,
    hospital        VARCHAR,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doctors_email ON doctors(email);

-- Table 2: Patients
CREATE TABLE patients (
    patient_id          VARCHAR PRIMARY KEY,
    doctor_id           VARCHAR NOT NULL REFERENCES doctors(doctor_id),
    full_name           VARCHAR NOT NULL,
    age                 INTEGER NOT NULL,
    gender              VARCHAR NOT NULL,
    phone               VARCHAR,
    email               VARCHAR,
    smoking_history     VARCHAR,
    family_history      VARCHAR,
    symptoms            VARCHAR,
    clinical_biomarkers JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patients_doctor_id ON patients(doctor_id);

-- Table 3: Predictions
CREATE TABLE predictions (
    prediction_id   VARCHAR PRIMARY KEY,
    patient_id      VARCHAR NOT NULL REFERENCES patients(patient_id),
    dataset         VARCHAR NOT NULL,
    model_name      VARCHAR NOT NULL,
    predicted_class VARCHAR NOT NULL,
    confidence      FLOAT NOT NULL,
    probabilities   JSONB NOT NULL,
    gradcam_path    VARCHAR,
    report_path     VARCHAR,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictions_patient_id ON predictions(patient_id);

-- Table 4: Reports
CREATE TABLE reports (
    report_id       VARCHAR PRIMARY KEY,
    prediction_id   VARCHAR NOT NULL UNIQUE REFERENCES predictions(prediction_id),
    recommendation  VARCHAR NOT NULL,
    report_json     JSONB NOT NULL,
    generated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_prediction_id ON reports(prediction_id);
