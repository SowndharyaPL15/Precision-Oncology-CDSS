import os
import shutil

def prepare_archive():
    target_zip = "Precision_Oncology_Colab"
    print(f"Preparing {target_zip}.zip for Colab/Kaggle upload...")
    
    # We will create a staging directory to organize the zip
    staging_dir = "colab_staging"
    os.makedirs(staging_dir, exist_ok=True)
    
    print("Copying ai-server...")
    shutil.copytree("ai-server", os.path.join(staging_dir, "ai-server"), dirs_exist_ok=True, ignore=shutil.ignore_patterns('.venv', '__pycache__', '.pytest_cache'))
    
    print("Copying datasets (this might take a moment depending on size)...")
    if os.path.exists("datasets"):
        shutil.copytree("datasets", os.path.join(staging_dir, "datasets"), dirs_exist_ok=True)
    
    print("Creating execution script run_all.sh...")
    run_all_content = """#!/bin/bash
echo "Installing dependencies..."
cd ai-server
pip install -r requirements.txt

echo "Starting Genuine GPU Experimental Evaluation Phase..."
python run_final_pipeline.py --mode final --epochs 20

echo "Generating Model Comparison..."
python run_model_comparison.py

echo "Generating Grad-CAMs..."
python run_gradcam.py --mode final

echo "All GPU Training Complete! Please download the 'ai-server/reports' and 'ai-server/models' folders back to your local machine."
"""
    with open(os.path.join(staging_dir, "run_all.sh"), "w") as f:
        f.write(run_all_content)
        
    print(f"Compressing to {target_zip}.zip...")
    shutil.make_archive(target_zip, 'zip', staging_dir)
    
    print("Cleaning up staging directory...")
    shutil.rmtree(staging_dir)
    
    print(f"Done! Created {target_zip}.zip ({os.path.getsize(target_zip + '.zip') / (1024*1024):.2f} MB)")

if __name__ == "__main__":
    prepare_archive()
