import os
import subprocess
import json
import pandas as pd
import shutil
import time
import sys

def run_experiment(script_name, mode="final", epochs=20):
    print(f"Running {script_name} (Mode: {mode}, Epochs: {epochs})...")
    start_time = time.time()
    result = subprocess.run([sys.executable, script_name, "--mode", mode, "--epochs", str(epochs)], check=True)
    duration = time.time() - start_time
    print(f"Completed {script_name} in {duration:.2f} seconds.")
    return duration

def rename_reports(dataset_key):
    reports_dir = os.path.abspath(os.path.join("..", "reports", "efficientnet", dataset_key))
    metrics_json = os.path.join(reports_dir, "metrics.json")
    metrics_csv = os.path.join(reports_dir, "metrics.csv")
    
    report_json = os.path.join(reports_dir, "training_report.json")
    report_csv = os.path.join(reports_dir, "training_report.csv")
    
    if os.path.exists(metrics_json):
        shutil.copy2(metrics_json, report_json)
        print(f"Copied metrics.json to training_report.json in {reports_dir}")
    if os.path.exists(metrics_csv):
        shutil.copy2(metrics_csv, report_csv)
        print(f"Copied metrics.csv to training_report.csv in {reports_dir}")

def generate_summary(lung_time, breast_time):
    # Paths
    lung_config = os.path.abspath(os.path.join("..", "reports", "efficientnet", "lung", "training_config.json"))
    lung_metrics = os.path.abspath(os.path.join("..", "reports", "efficientnet", "lung", "metrics.json"))
    lung_misc = os.path.abspath(os.path.join("..", "results", "misclassified", "lung"))
    
    breast_config = os.path.abspath(os.path.join("..", "reports", "efficientnet", "breast", "training_config.json"))
    breast_metrics = os.path.abspath(os.path.join("..", "reports", "efficientnet", "breast", "metrics.json"))
    breast_misc = os.path.abspath(os.path.join("..", "results", "misclassified", "breast"))

    def get_data(config_path, metrics_path, misc_path, train_time):
        with open(config_path, "r") as f:
            config = json.load(f)
        with open(metrics_path, "r") as f:
            metrics = json.load(f)
        num_misc = len(os.listdir(misc_path)) if os.path.exists(misc_path) else 0
        
        return {
            "train_imgs": config.get("train_images", 0),
            "val_imgs": config.get("validation_images", 0),
            "test_imgs": config.get("test_images", 0),
            "accuracy": metrics.get("accuracy", 0.0),
            "precision": metrics.get("precision", 0.0),
            "recall": metrics.get("recall", 0.0),
            "f1_score": metrics.get("f1_score", 0.0),
            "roc_auc": metrics.get("roc_auc", 0.0),
            "mcc": metrics.get("mcc", 0.0),
            "num_misc": num_misc,
            "time": train_time
        }
    
    lung_data = get_data(lung_config, lung_metrics, lung_misc, lung_time)
    breast_data = get_data(breast_config, breast_metrics, breast_misc, breast_time)
    
    summary_md = f"""# Final Experiment Summary: EfficientNetB0

## 1. Lung Cancer (LC25000)
- **Training Images:** {lung_data['train_imgs']}
- **Validation Images:** {lung_data['val_imgs']}
- **Test Images:** {lung_data['test_imgs']}
- **Final Test Accuracy:** {lung_data['accuracy']:.4f}
- **Precision:** {lung_data['precision']:.4f}
- **Recall:** {lung_data['recall']:.4f}
- **F1-Score:** {lung_data['f1_score']:.4f}
- **ROC-AUC:** {lung_data['roc_auc']:.4f}
- **MCC:** {lung_data['mcc']:.4f}
- **Misclassified Images:** {lung_data['num_misc']}
- **Total Training Time:** {lung_data['time']:.2f} seconds

## 2. Breast Cancer (BreaKHis 400X)
- **Training Images:** {breast_data['train_imgs']}
- **Validation Images:** {breast_data['val_imgs']}
- **Test Images:** {breast_data['test_imgs']}
- **Final Test Accuracy:** {breast_data['accuracy']:.4f}
- **Precision:** {breast_data['precision']:.4f}
- **Recall:** {breast_data['recall']:.4f}
- **F1-Score:** {breast_data['f1_score']:.4f}
- **ROC-AUC:** {breast_data['roc_auc']:.4f}
- **MCC:** {breast_data['mcc']:.4f}
- **Misclassified Images:** {breast_data['num_misc']}
- **Total Training Time:** {breast_data['time']:.2f} seconds
"""
    
    summary_path = os.path.abspath(os.path.join("..", "reports", "final_experiment_summary.md"))
    with open(summary_path, "w") as f:
        f.write(summary_md)
    print(f"Summary written to {summary_path}")

if __name__ == "__main__":
    epochs = 20
    print(f"Starting Final Production Experiment (Epochs: {epochs})...")
    
    # Run Lung
    lung_time = run_experiment("run_train_lung.py", "final", epochs)
    rename_reports("lung")
    
    # Run Breast
    breast_time = run_experiment("run_train_breast.py", "final", epochs)
    rename_reports("breast")
    
    # Generate Summary
    generate_summary(lung_time, breast_time)
    print("All experiments completed successfully.")
