import os
import tensorflow as tf
from app.processing.image_preprocessor import PreprocessingConfig, DataPipelineBuilder

def main():
    # Base paths relative to the project root
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    datasets_config = [
        {
            "name": "lung_cancer",
            "display_name": "Lung Cancer (LC25000)",
            "path": os.path.join(project_root, "datasets", "lungs")
        },
        {
            "name": "breast_cancer",
            "display_name": "Breast Cancer (BreaKHis 400X)",
            "path": os.path.join(project_root, "datasets", "BreaKHis 400X")
        }
    ]
    
    reports_dir = os.path.join(project_root, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    print("=" * 60)
    print("Precision Oncology Preprocessing and Data Pipeline Validation")
    print("=" * 60)
    
    config = PreprocessingConfig()
    
    for ds_info in datasets_config:
        name = ds_info["name"]
        display_name = ds_info["display_name"]
        path = ds_info["path"]
        
        if not os.path.exists(path):
            print(f"\n[WARNING] Dataset path '{path}' does not exist. Skipping...")
            continue
            
        print(f"\n[INFO] Building pipeline for: {display_name}")
        
        builder = DataPipelineBuilder(
            config=config,
            dataset_name=display_name,
            root_dir=path
        )
        
        # 1. Build pipelines
        train_ds, val_ds, test_ds, info = builder.build()
        
        # 2. Export Config & Reports
        config_path = os.path.join(reports_dir, f"preprocessing_config_{name}.json")
        builder.save_config(config_path)
        
        report_path = os.path.join(reports_dir, f"preprocessing_summary_{name}.txt")
        builder.generate_summary_report(report_path)
        
        # 3. Retrieve sample batch to verify pipeline integrity
        print(f"  Verifying tf.data pipeline batch shapes...")
        try:
            for x_batch, y_batch in train_ds.take(1):
                print(f"    [Training Batch] Images shape: {x_batch.shape}, Labels shape: {y_batch.shape}")
                print(f"    [Training Batch] Max pixel val: {tf.reduce_max(x_batch):.4f}, Min pixel val: {tf.reduce_min(x_batch):.4f}")
            for x_batch, y_batch in val_ds.take(1):
                print(f"    [Validation Batch] Images shape: {x_batch.shape}, Labels shape: {y_batch.shape}")
            for x_batch, y_batch in test_ds.take(1):
                print(f"    [Testing Batch] Images shape: {x_batch.shape}, Labels shape: {y_batch.shape}")
            print(f"  [SUCCESS] Preprocessing and tf.data pipelines validated successfully.")
        except Exception as e:
            print(f"  [ERROR] Pipeline verification failed: {str(e)}")
            
        print("-" * 60)

if __name__ == "__main__":
    main()
