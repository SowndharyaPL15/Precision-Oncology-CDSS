# 📘 Training Guide: Precision Oncology AI Framework

## 1. Project Overview
This project provides a robust, multimodal clinical decision support system utilizing deep transfer learning for precision oncology. It combines DenseNet121, ResNet50, and EfficientNetB0 architectures to classify Lung Cancer (LC25000 dataset) and Breast Cancer (BreaKHis 400X dataset). It includes a FastAPI backend, PostgreSQL database, and a React frontend for clinical deployment.

## 2. Hardware Requirements
For optimal execution, specifically for Stage 1 and Stage 2 model training, the following hardware is recommended:
- **CPU**: 8+ Cores (e.g., Intel Core i7 / AMD Ryzen 7)
- **RAM**: 32 GB Minimum
- **GPU**: NVIDIA GPU with at least 8 GB VRAM (e.g., RTX 3060, RTX 4090, A100, or T4)

## 3. Software Requirements
Ensure the following software stack is installed on the training machine:
- **Operating System**: Linux (Ubuntu 20.04/22.04), Windows with WSL2, or macOS (M-series with Metal support)
- **Python**: v3.10 to v3.12
- **TensorFlow**: v2.10.0+ (Note: Native Windows GPU support is deprecated beyond TF 2.10. Use WSL2 or Linux)
- **CUDA Toolkit**: v11.2 or v11.8 (matching your TensorFlow version)
- **cuDNN**: v8.1 or v8.6
- **PostgreSQL**: v14+ (for the backend database)
- **Node.js**: v18+ (for building and serving the React frontend)

## 4. Environment Setup & Dependencies
### 4.1. AI Server Setup
Navigate to the `ai-server` directory and create a virtual environment:
```bash
cd ai-server
python -m venv .venv
source .venv/bin/activate  # On Windows: .\.venv\Scripts\activate
pip install -r requirements.txt
```

### 4.2. PostgreSQL Setup
Create a local database named `precision_oncology` and update your `.env` file in the `ai-server` folder:
```env
DATABASE_URL=postgresql+asyncpg://<username>:<password>@localhost:5432/precision_oncology
```

### 4.3. React Frontend Setup
Navigate to the `frontend` directory and install dependencies:
```bash
cd frontend
npm install
```

## 5. Running the Application Stack

### 5.1. Running the FastAPI Backend
Ensure your virtual environment is activated.
```bash
cd ai-server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5.2. Running the React Frontend
Open a new terminal window.
```bash
cd frontend
npm start
```

## 6. Training Environments

### 6.1. Local GPU Training / Linux Server Training
1. Ensure CUDA and cuDNN are correctly configured and recognized by TensorFlow.
2. Activate your virtual environment.
3. Run the master pipeline in production mode:
```bash
cd ai-server
python run_final_pipeline.py --mode final
```
*Expected Training Time*: ~1-2 hours per model (Total: ~8-12 hours depending on GPU).

### 6.2. Google Colab Training
Colab is highly recommended if you do not have a local NVIDIA GPU.
1. Upload the project repository to your Google Drive.
2. Create a new Google Colab Notebook and set the Runtime to **GPU** (T4 or A100).
3. Mount Google Drive:
```python
from google.colab import drive
drive.mount('/content/drive')
```
4. Navigate to the project directory and install dependencies:
```bash
%cd /content/drive/MyDrive/Precision-Oncology/ai-server
!pip install -r requirements.txt
```
5. Execute the training script:
```bash
!python run_final_pipeline.py --mode final
```

### 6.3. Kaggle Notebook Training
1. Create a new Notebook on Kaggle and enable the **GPU P100** or **GPU T4x2** accelerator.
2. Upload the `ai-server` folder as a dataset, or clone your GitHub repository into the Kaggle environment.
3. Install dependencies and run:
```bash
!pip install -r requirements.txt
!python run_final_pipeline.py --mode final
```

## 7. Common Errors and Fixes

- **`ImportError: tabulate not found`**: Ensure all dependencies in `requirements.txt` are installed (`pip install tabulate`).
- **`WARNING:tensorflow:TensorFlow GPU support is not available on native Windows`**: TensorFlow >= 2.11 does not support native Windows GPUs. You must use WSL2, or downgrade to TensorFlow 2.10.
- **`OOM (Out of Memory)`**: If your GPU runs out of memory during Stage 2, reduce the `batch_size` in the model training scripts from 32 to 16.
- **Database Connection Refused**: Verify PostgreSQL is running and credentials in `.env` match your local setup.

## 8. Generated Outputs and Folder Locations
After training concludes, the following artifacts will be generated:
- **Trained Models**: Saved in `models/<architecture>/<dataset>/` (e.g., `final_model_v1.keras`).
- **Training Reports & Metrics**: Saved in `reports/<architecture>/<dataset>/` (e.g., `metrics.json`, `predictions.csv`).
- **Comparison Visualizations**: Radar charts and bar charts saved in `reports/comparison/`.
- **Misclassified Images**: Saved in `results/misclassified/<dataset>/`.
- **Final Markdown Summary**: Generated at `reports/final_experiment_summary.md`.
