# Precision Oncology Clinical Decision Support System

## Abstract
The Precision Oncology Clinical Decision Support System is an AI-powered framework designed to assist pathologists and oncologists in diagnosing Lung and Breast cancer from histopathological images. By leveraging deep transfer learning (DenseNet121, ResNet50, EfficientNetB0) combined with Explainable AI (Grad-CAM), this project delivers high-accuracy diagnostic predictions overlaid with visual interpretability. It features a robust FastAPI backend, a PostgreSQL database for patient management, and a modern React frontend for seamless clinical workflow integration.

---
##Website URL
https://precision-oncology-frontend.onrender.com

## Hardware Biometrics & WebAuthn Architecture

### Enterprise WebAuthn W3C Standard Integration
The application uses the official W3C Web Authentication API (`navigator.credentials.get` / `create`) to interface with platform hardware biometric sensors:
- **Windows:** Windows Hello (Fingerprint, Face Recognition, PIN).
- **macOS / iOS:** Touch ID, Face ID.
- **Android:** Android Biometrics.
- **FIDO2 Keys:** YubiKey and security keys.

### Privacy & Zero-Trust Security Guarantee
- **Zero Raw Biometric Storage:** Raw fingerprint images and raw facial photos are never saved to disk or transmitted over networks.
- **Hardware Enclave Isolation:** Biometric verification takes place entirely inside the local device hardware enclave (Windows TPM / Apple Secure Enclave).
- **Explicit Verification Trigger:** `navigator.credentials.get()` is invoked strictly upon user action (clicking `[ Verify Fingerprint ]`), preventing unexpected OS security popups.

*See `SECURITY.md` for full cryptographic security details and browser recommendations.*

---

## Features
- **Multimodal AI Diagnosis:** Supports classification for Lung Cancer (Adenocarcinoma, Squamous Cell Carcinoma, Benign) and Breast Cancer (Malignant, Benign).
- **Explainable AI:** Generates Grad-CAM heatmaps to visually explain the AI's diagnostic reasoning.
- **Enterprise Three-Factor Authentication (3FA):** Password (bcrypt) + Face Recognition (128D vectors with liveness challenge) + WebAuthn Passkeys (Windows Hello, Touch ID, FIDO2).
- **Hardware Fallback & Audit Logging:** Email OTP fallback for devices without biometric hardware, paired with detailed audit logging for security compliance.
- **Role-Based Access Control (RBAC):** Granular permission enforcement for Administrator, Doctor, and Pathologist roles.
- **RESTful API Engine:** High-performance async API using FastAPI with short-lived JWT access tokens and refresh token rotation.
- **Relational Data Management:** Secure storage of patient profiles, diagnostic reports, and security logs using PostgreSQL.
- **Modern Web Interface:** React-based dashboard for image upload, patient tracking, and result visualization.
- **Automated Model Comparison:** Built-in tools to statistically compare architectures and select the best performing model.

## Final Experimental Results
Genuine GPU experiments (20 epochs, two-stage transfer learning) proved that **DenseNet121** is the superior architecture for both datasets:
- **Lung Cancer Accuracy (DenseNet121):** 98.3%
- **Breast Cancer Accuracy (DenseNet121):** 97.9%

*See `FINAL_EXPERIMENT_REPORT.md` for complete metric tables.*

## Security Features
- **JWT Authentication:** Short-lived access tokens (15 minutes) + Refresh token rotation (7 days).
- **bcrypt Password Hashing:** Salted password hashing ensuring no plain-text passwords exist.
- **Face Recognition:** Live webcam 128D facial embeddings (raw video frames are never permanently stored).
- **Liveness Detection:** Interactive smile & blink detection preventing photo/video spoofing.
- **WebAuthn Passkeys:** Native biometric support for Windows Hello, Touch ID, Android Biometrics, and FIDO2 Keys.
- **Email OTP Fallback:** Automated 6-digit OTP fallback when biometric hardware is missing.
- **RBAC Security:** Administrator, Doctor, and Pathologist role permissions.
- **Audit Logging:** Logs user, timestamp, IP address, user-agent, authentication factors used, and status.

## System Architecture & Module Tech Stack
1. **Frontend UI:** React (v18), TypeScript (v5), Material-UI (v5), React-Bootstrap, Vite (v8), Framer Motion.
2. **Security & Authentication Layer:** PyJWT (v2.8), passlib (bcrypt), WebAuthn / Passkeys (Windows Hello, Touch ID), HTML5 Canvas 128D Face Vectorizer, React Router RBAC guards.
3. **Backend REST API:** FastAPI (v0.100), Uvicorn ASGI Server, Pydantic (v2), Python-Multipart.
4. **AI Inference & Explainability Engine:** TensorFlow (v2.10), Keras, DenseNet121, ResNet50, EfficientNetB0, OpenCV, Grad-CAM (GradientTape).
5. **Database & Storage Layer:** PostgreSQL (v15), SQLAlchemy (v2.0 Async), AsyncPG, Alembic.
6. **Analytics & PDF Export:** Chart.js, React-Chartjs-2, Scikit-Learn, html2pdf.js.

## Technology Stack by Module

| Module Name | Technology / Library Used | Description / Responsibility |
|---|---|---|
| **Frontend Web App** | React, TypeScript, Material-UI, Vite | Type-safe single-page application dashboard and clinical UI components. |
| **Animation & Transitions** | Framer Motion | Smooth UI transitions, stepper progress animations, and modal overlays. |
| **Authentication Backend** | PyJWT, passlib (bcrypt), WebAuthn | JWT access/refresh token management, salted password hashing, Passkey verification. |
| **Facial Biometrics & Liveness** | HTML5 Canvas, Cosine Similarity | Client-side 128D face vector extraction, liveness challenge (smile/blink), Cosine match ($\ge 0.85$). |
| **REST API Gateway** | FastAPI, Uvicorn, Pydantic | High-speed asynchronous Python REST backend, schema validation, multi-part image processing. |
| **Deep Learning Models** | TensorFlow, Keras | Two-stage transfer learning execution of EfficientNetB0, DenseNet121, and ResNet50 (Default Model). |
| **Explainable AI (XAI)** | OpenCV, Matplotlib, GradientTape | Gradient-weighted Class Activation Mapping (Grad-CAM) heatmap generation over histological tissue. |
| **Database & ORM** | PostgreSQL, SQLAlchemy (Async), AsyncPG | Relational database storage for users, face vectors, WebAuthn credentials, audit logs, patients, and predictions. |
| **Analytics & Metrics** | Chart.js, React-Chartjs-2, Scikit-Learn | Radar charts, confusion matrices, ROC-AUC curves, MCC, and model comparison metrics. |
| **Clinical PDF Reports** | html2pdf.js | Client-side vector PDF report compilation with logo, patient specs, risk score, and Grad-CAM scans. |
