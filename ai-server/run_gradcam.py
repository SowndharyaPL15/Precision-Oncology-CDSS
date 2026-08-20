import os
import glob
import pandas as pd
from app.explainability.gradcam import GradCAMGenerator

def test_gradcam():
    project_root = os.path.abspath(os.path.dirname(__file__))
    datasets = {
        "lung": {
            "path": os.path.join(project_root, "..", "datasets", "lungs"),
            "classes": ["lung_aca", "lung_n", "lung_scc"]
        },
        "breast": {
            "path": os.path.join(project_root, "..", "datasets", "BreaKHis 400X", "test"),
            "classes": ["benign", "malignant"]
        }
    }
    
    models = ["efficientnet", "resnet50", "densenet121"]
    all_results = []
    
    for model_name in models:
        for ds_name, ds_info in datasets.items():
            model_path = os.path.join(project_root, "..", "models", model_name, ds_name, "final_model_v1.keras")
            
            # Fallbacks for models that might not have finished final mode
            if not os.path.exists(model_path):
                model_path = os.path.join(project_root, "..", "models", model_name, ds_name, "stage2_best.keras")
            if not os.path.exists(model_path):
                model_path = os.path.join(project_root, "..", "models", model_name, ds_name, "stage1_best.keras")
                
            if not os.path.exists(model_path):
                print(f"[WARNING] No model found for {model_name} on {ds_name}. Skipping.")
                continue
                
            print(f"\n=======================================================")
            print(f"Testing Grad-CAM for {model_name} on {ds_name}")
            print(f"Model: {model_path}")
            print(f"=======================================================")
            
            generator = GradCAMGenerator(model_path, ds_info["classes"])
            
            # Select 10 random images
            test_images = []
            for class_name in ds_info["classes"]:
                class_dir = os.path.join(ds_info["path"], class_name)
                if not os.path.exists(class_dir):
                    # Try uppercase or different case for breast
                    class_dir = os.path.join(ds_info["path"], class_name.capitalize())
                
                if os.path.exists(class_dir):
                    images = glob.glob(os.path.join(class_dir, "*.[pj][pn][g]"))
                    if not images:
                        images = glob.glob(os.path.join(class_dir, "*.jpeg"))
                    
                    for img in images[:5]: # 5 per class, to get ~10 total
                        test_images.append((img, class_name))
            
            # Limit to exactly 10
            test_images = test_images[:10]
            
            save_base_dir = os.path.join(project_root, "..", "results", "gradcam", model_name, ds_name)
            
            for img_path, true_label in test_images:
                img_name = os.path.basename(img_path).split('.')[0]
                save_dir = os.path.join(save_base_dir, img_name)
                
                try:
                    result = generator.generate_and_save(img_path, save_dir, true_label=true_label)
                    result["Dataset"] = ds_name
                    result["Model"] = model_name
                    all_results.append(result)
                    print(f"  [SUCCESS] {img_name}")
                except Exception as e:
                    print(f"  [FAILED] {img_name} - {str(e)}")

    if all_results:
        df = pd.DataFrame(all_results)
        # Reorder columns
        cols = ["Image Name", "Dataset", "Model", "True Label", "Predicted Label", "Confidence", "Heatmap Path", "Overlay Path"]
        df = df[cols]
        
        csv_path = os.path.join(project_root, "..", "results", "gradcam", "gradcam_summary.csv")
        df.to_csv(csv_path, index=False)
        print(f"\n[INFO] Saved summary to {csv_path}")
        
if __name__ == "__main__":
    test_gradcam()
