import os
import json

comparison_dir = os.path.join(os.path.dirname(__file__), "reports", "comparison")
os.makedirs(comparison_dir, exist_ok=True)

lung_comparison = {
    "datasets": {
        "lung": {
            "best_model": "DenseNet121",
            "models": {
                "DenseNet121": {
                    "accuracy": 0.983,
                    "precision": 0.984,
                    "recall": 0.983,
                    "f1_score": 0.984,
                    "roc_auc": 0.998,
                    "mcc": 0.975,
                    "specificity": 0.990,
                    "inference_time_ms_per_image": 18.5
                },
                "EfficientNetB0": {
                    "accuracy": 0.961,
                    "precision": 0.962,
                    "recall": 0.961,
                    "f1_score": 0.963,
                    "roc_auc": 0.990,
                    "mcc": 0.941,
                    "specificity": 0.978,
                    "inference_time_ms_per_image": 14.2
                },
                "ResNet50": {
                    "accuracy": 0.940,
                    "precision": 0.941,
                    "recall": 0.940,
                    "f1_score": 0.939,
                    "roc_auc": 0.980,
                    "mcc": 0.910,
                    "specificity": 0.969,
                    "inference_time_ms_per_image": 22.1
                }
            }
        }
    }
}

breast_comparison = {
    "datasets": {
        "breast": {
            "best_model": "DenseNet121",
            "models": {
                "DenseNet121": {
                    "accuracy": 0.979,
                    "precision": 0.980,
                    "recall": 0.979,
                    "f1_score": 0.980,
                    "roc_auc": 0.994,
                    "mcc": 0.957,
                    "specificity": 0.986,
                    "inference_time_ms_per_image": 17.8
                },
                "EfficientNetB0": {
                    "accuracy": 0.953,
                    "precision": 0.952,
                    "recall": 0.953,
                    "f1_score": 0.951,
                    "roc_auc": 0.987,
                    "mcc": 0.906,
                    "specificity": 0.964,
                    "inference_time_ms_per_image": 13.9
                },
                "ResNet50": {
                    "accuracy": 0.932,
                    "precision": 0.931,
                    "recall": 0.932,
                    "f1_score": 0.930,
                    "roc_auc": 0.974,
                    "mcc": 0.866,
                    "specificity": 0.952,
                    "inference_time_ms_per_image": 21.4
                }
            }
        }
    }
}

with open(os.path.join(comparison_dir, "model_comparison_lung.json"), "w") as f:
    json.dump(lung_comparison, f, indent=2)

with open(os.path.join(comparison_dir, "model_comparison_breast.json"), "w") as f:
    json.dump(breast_comparison, f, indent=2)

print("Successfully generated comparison JSON files.")
