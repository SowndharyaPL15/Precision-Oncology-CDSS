# ✅ Final Production Training Checklist

Follow this checklist strictly prior to executing the 20-epoch production training run to ensure robust metrics, accurate visualizations, and correct API integration.

## 1. Environment & Hardware Verification
- [ ] **GPU Availability:** Verified NVIDIA GPU is available (`nvidia-smi` returns correctly).
- [ ] **CUDA Installation:** Verified CUDA toolkit aligns with TensorFlow version.
- [ ] **cuDNN Installation:** Verified cuDNN is installed and mapped in environment variables.
- [ ] **TensorFlow GPU Detection:** Executed `python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"` and confirmed GPU is detected.

## 2. Dataset & Preprocessing Verification
- [ ] **Lung Cancer Dataset:** Extracted and validated LC25000 in `datasets/lung/`.
- [ ] **Breast Cancer Dataset:** Extracted and validated BreaKHis 400X in `datasets/breast/`.
- [ ] **Data Augmentation:** Verified image transformations (rotation, scaling, contrast) are correctly applied in the `tf.data` pipeline.
- [ ] **Image Normalization:** Confirmed all images are normalized to `[0, 1]` or standard normal distribution as required by the chosen architecture.

## 3. Model Architecture Verification
- [ ] **EfficientNetB0 Setup:** Base weights frozen, classification head built.
- [ ] **ResNet50 Setup:** Base weights frozen, classification head built.
- [ ] **DenseNet121 Setup:** Base weights frozen, classification head built.
- [ ] **Two-Stage Fine Tuning:** Confirmed `prepare_for_fine_tuning()` accurately unfreezes the last 40 layers and maintains BatchNormalization lock.

## 4. Training Configuration Setup
- [ ] **Hyperparameters:** Confirmed Stage 1 learning rate is `1e-4` and Stage 2 is `1e-5`.
- [ ] **Epochs:** Ensured `run_final_pipeline.py` is called with `--mode final` (20 epochs).
- [ ] **Callbacks:** Early Stopping (patience 5) and ModelCheckpoint (best val_loss) are active.

## 5. System Integration Verification (Pre-Training)
- [ ] **FastAPI:** Backend server boots successfully and connects to PostgreSQL.
- [ ] **PostgreSQL:** Database schema is up to date (Alembic migrations applied).
- [ ] **React Frontend:** Web UI compiles without errors (`npm start`).
- [ ] **Grad-CAM:** Explainability module is correctly linked to the final convolution layers of each model.

## 6. Training Execution
- [ ] **Execute Pipeline:** Ran `python run_final_pipeline.py --mode final`.
- [ ] **Monitor Resource Usage:** Tracked GPU memory and temperatures during the initial epochs to prevent OOM errors.

## 7. Post-Training Verification
- [ ] **Expected Outputs:** Verified `models/` directory contains `final_model_v1.keras` for all 6 combinations.
- [ ] **Metrics:** Verified `reports/` directory contains `metrics.json` and `training_config.json`.
- [ ] **Visualizations:** Checked `reports/comparison/` for generated radar charts, bar charts, and summary files.
- [ ] **System Testing:** Uploaded a sample image via the React frontend and successfully generated a clinical report with a Grad-CAM overlay.
