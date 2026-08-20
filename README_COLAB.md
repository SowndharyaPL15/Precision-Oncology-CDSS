# 🚀 Executing the GPU Pipeline on Google Colab / Kaggle

Because this native Windows environment lacks TensorFlow GPU acceleration, you must execute the genuine production pipeline on a GPU-enabled cloud platform to satisfy the strict research integrity requirements.

I have packaged the entire AI server and datasets into a single zip file for you: **`Precision_Oncology_Colab.zip`**.

## Steps to Execute on Google Colab

1. **Upload to Google Drive:** Upload the `Precision_Oncology_Colab.zip` file to your Google Drive.
2. **Open Colab:** Go to [Google Colab](https://colab.research.google.com/) and create a new notebook.
3. **Enable GPU:** In the top menu, go to `Runtime` -> `Change runtime type`, and select `T4 GPU`, `V100`, or `A100` (if using Colab Pro).
4. **Mount Drive & Unzip:** Run the following cell in Colab:
   ```python
   from google.colab import drive
   drive.mount('/content/drive')
   
   !unzip "/content/drive/MyDrive/Precision_Oncology_Colab.zip" -d "/content/Precision_Oncology"
   ```
5. **Execute the Genuine Training Pipeline:**
   ```bash
   %%bash
   cd /content/Precision_Oncology
   chmod +x run_all.sh
   ./run_all.sh
   ```
6. **Download Results:** Once the script finishes (it will take a few hours depending on the GPU), the authentic models, metrics, JSONs, and Grad-CAM graphs will be saved in the `ai-server/reports` and `ai-server/models` directories.
7. **Sync Back:** Download these folders from Colab and place them back into this local repository, replacing the simulated ones. 

Once you have brought the authentic GPU results back into this repository, I will parse the genuine metrics, execute the model comparison generation, and formally update `FINAL_EXPERIMENT_REPORT.md` and `README.md` for publication!
