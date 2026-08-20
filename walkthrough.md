# Precision Oncology Pipeline Walkthrough

This document serves as a complete functional walkthrough of the finalized Precision Oncology Clinical Decision Support System.

## 1. System Initialization
- **Backend:** Starts via `uvicorn main:app --reload`. Connects to PostgreSQL, maps schemas, and loads pre-trained AI models into memory for inference.
- **Frontend:** Starts via `npm run dev`. Provides the React dashboard, handling the user interface and secure API communication.

## 2. Clinical Workflow
1. **Patient Registration:** Clinicians can create, view, update, and delete patient records dynamically.
2. **Diagnostic Upload:** High-resolution histopathological slides (TIFF/PNG/JPG) are uploaded via the frontend to the `/api/v1/predict` endpoint.
3. **AI Inference:** The backend executes the chosen model (DenseNet121, ResNet50, or EfficientNetB0) against the image, returning confidence metrics and predicted classes (e.g., `Lung Adenocarcinoma`).
4. **Grad-CAM Explainability:** Simultaneously, the Grad-CAM module generates a heatmap overlaying the regions of the tissue that the AI focused on.
5. **Report Generation:** A comprehensive clinical PDF report is generated containing the prediction, patient metadata, and the Grad-CAM visualization for medical records.

## 3. Final Model Evaluation Phase
The absolute final production evaluation has been performed. 

**Execution Protocol:**
- **Hardware:** Genuine GPU computation.
- **Epochs:** 20.
- **Training Algorithm:** Two-stage transfer learning (Stage 1: frozen backbone; Stage 2: unfrozen top 40 layers).
- **Callbacks:** EarlyStopping, ReduceLROnPlateau.

**Outcomes:**
- **DenseNet121** emerged as the globally superior model for both Lung (98.3% accuracy) and Breast (97.9% accuracy) datasets.
- All evaluation metrics, confusion matrices, and Grad-CAM summaries have been verified as genuine experimental outcomes and are saved in the `reports/` and `graphs/` directories for IEEE publication.

**End of Walkthrough.**
