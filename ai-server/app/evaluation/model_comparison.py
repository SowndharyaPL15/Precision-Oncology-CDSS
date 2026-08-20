import os
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from math import pi

class ModelComparator:
    def __init__(self, project_root):
        self.project_root = project_root
        self.reports_dir = os.path.join(project_root, "reports")
        self.comparison_dir = os.path.join(self.reports_dir, "comparison")
        os.makedirs(self.comparison_dir, exist_ok=True)
        
        self.datasets = ["lung", "breast"]
        self.metrics_list = ["accuracy", "precision", "recall", "f1_score", "roc_auc", "mcc"]
        self.display_metrics = ["Accuracy", "Precision", "Recall", "F1-Score", "ROC-AUC", "MCC"]
        
    def gather_metrics(self):
        """Scans the reports directory and gathers all model metrics for each dataset."""
        data = {dataset: [] for dataset in self.datasets}
        
        if not os.path.exists(self.reports_dir):
            return data
            
        for model_name in os.listdir(self.reports_dir):
            model_dir = os.path.join(self.reports_dir, model_name)
            if not os.path.isdir(model_dir) or model_name == "comparison" or model_name == "graphs":
                continue
                
            for dataset in self.datasets:
                dataset_dir = os.path.join(model_dir, dataset)
                metrics_path = os.path.join(dataset_dir, "metrics.json")
                
                # Check for training_config to get times if available
                config_path = os.path.join(dataset_dir, "training_config.json")
                
                if os.path.exists(metrics_path):
                    with open(metrics_path, "r") as f:
                        metrics = json.load(f)
                    
                    row = {"Model": model_name.upper()}
                    for m in self.metrics_list:
                        row[m] = metrics.get(m, 0.0)
                        
                    data[dataset].append(row)
        
        return data

    def generate_csv_json(self, data):
        """Generates CSV and JSON comparison tables for each dataset."""
        df_dict = {}
        for dataset, records in data.items():
            if not records:
                continue
            df = pd.DataFrame(records)
            df_dict[dataset] = df
            
            csv_path = os.path.join(self.comparison_dir, f"model_comparison_{dataset}.csv")
            json_path = os.path.join(self.comparison_dir, f"model_comparison_{dataset}.json")
            
            df.to_csv(csv_path, index=False)
            df.to_json(json_path, orient="records", indent=4)
            print(f"Saved {csv_path} and {json_path}")
            
        return df_dict

    def generate_markdown_summary(self, df_dict):
        """Generates the overall markdown summary identifying best models."""
        md_lines = ["# Model Comparison Summary\n"]
        
        for dataset, df in df_dict.items():
            md_lines.append(f"## Dataset: {dataset.capitalize()}\n")
            if df.empty:
                md_lines.append("No data available.\n")
                continue
                
            best_model_overall = None
            highest_avg = -1
            
            md_lines.append("| Metric | Best Model | Value |")
            md_lines.append("|---|---|---|")
            
            model_scores = {model: 0 for model in df["Model"]}
            
            for metric in self.metrics_list:
                best_idx = df[metric].idxmax()
                best_val = df.loc[best_idx, metric]
                best_model = df.loc[best_idx, "Model"]
                
                display_name = self.display_metrics[self.metrics_list.index(metric)]
                md_lines.append(f"| Best {display_name} | **{best_model}** | {best_val:.4f} |")
                
                for i, row in df.iterrows():
                    model_scores[row["Model"]] += row[metric]
            
            # Find overall best based on sum of metrics
            best_model_overall = max(model_scores, key=model_scores.get)
            md_lines.append(f"\n**Recommendation:** Based on overall aggregate metrics, the best model for {dataset.capitalize()} is **{best_model_overall}**.\n")
            
        md_path = os.path.join(self.comparison_dir, "model_comparison_summary.md")
        with open(md_path, "w") as f:
            f.write("\n".join(md_lines))
        print(f"Saved {md_path}")

    def generate_bar_charts(self, df_dict):
        """Generates individual bar charts for each metric."""
        for dataset, df in df_dict.items():
            if df.empty:
                continue
                
            for i, metric in enumerate(self.metrics_list):
                plt.figure(figsize=(8, 5))
                plt.bar(df["Model"], df[metric], color=['#4CAF50', '#2196F3', '#FF9800', '#9C27B0'][:len(df)])
                
                display_name = self.display_metrics[i]
                plt.title(f"{display_name} Comparison - {dataset.capitalize()}", fontweight="bold")
                plt.ylabel(display_name)
                plt.ylim(0, 1.05)
                
                # Add values on top
                for index, value in enumerate(df[metric]):
                    plt.text(index, value + 0.01, f"{value:.4f}", ha='center', va='bottom')
                    
                plt.tight_layout()
                fig_path = os.path.join(self.comparison_dir, f"{metric}_comparison_{dataset}.png")
                plt.savefig(fig_path, dpi=300)
                plt.close()
                print(f"Saved {fig_path}")

    def generate_radar_charts(self, df_dict):
        """Generates radar/spider charts comparing all models across metrics."""
        for dataset, df in df_dict.items():
            if df.empty or len(df) == 0:
                continue
                
            N = len(self.display_metrics)
            angles = [n / float(N) * 2 * pi for n in range(N)]
            angles += angles[:1]
            
            plt.figure(figsize=(8, 8))
            ax = plt.subplot(111, polar=True)
            
            ax.set_theta_offset(pi / 2)
            ax.set_theta_direction(-1)
            
            plt.xticks(angles[:-1], self.display_metrics)
            ax.set_rlabel_position(0)
            plt.yticks([0.2, 0.4, 0.6, 0.8, 1.0], ["0.2", "0.4", "0.6", "0.8", "1.0"], color="grey", size=8)
            plt.ylim(0, 1.05)
            
            for index, row in df.iterrows():
                values = [row[m] for m in self.metrics_list]
                values += values[:1]
                ax.plot(angles, values, linewidth=2, linestyle='solid', label=row["Model"])
                ax.fill(angles, values, alpha=0.1)
                
            plt.title(f"Model Performance Radar - {dataset.capitalize()}", size=15, fontweight='bold', y=1.1)
            plt.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1))
            
            fig_path = os.path.join(self.comparison_dir, f"radar_chart_{dataset}.png")
            plt.savefig(fig_path, dpi=300)
            plt.close()
            print(f"Saved {fig_path}")

    def generate_best_model_report(self, df_dict):
        """Generates a text report summarizing the best model."""
        lines = ["=" * 60, "BEST MODEL SUMMARY REPORT", "=" * 60, ""]
        
        for dataset, df in df_dict.items():
            lines.append(f"--- DATASET: {dataset.upper()} ---")
            if df.empty:
                lines.append("No data available.\n")
                continue
                
            model_scores = {row["Model"]: sum([row[m] for m in self.metrics_list]) for _, row in df.iterrows()}
            best_model = max(model_scores, key=model_scores.get)
            best_row = df[df["Model"] == best_model].iloc[0]
            
            lines.append(f"Recommended Model: {best_model}")
            lines.append("Performance Metrics:")
            for i, metric in enumerate(self.metrics_list):
                lines.append(f"  - {self.display_metrics[i]}: {best_row[metric]:.4f}")
                
            lines.append("\nStrengths:")
            lines.append(f"  - Demonstrated the highest aggregate performance across {len(self.metrics_list)} key metrics.")
            lines.append("Weaknesses:")
            lines.append("  - (To be evaluated based on inference time and computational cost in production).")
            lines.append("Recommendation for Deployment:")
            lines.append(f"  - {best_model} is the primary candidate for deployment on the {dataset} dataset based on current verification/production metrics.\n")
            
        report_path = os.path.join(self.comparison_dir, "best_model_summary.txt")
        with open(report_path, "w") as f:
            f.write("\n".join(lines))
        print(f"Saved {report_path}")

    def run_comparison(self):
        print(f"Starting model comparison...")
        data = self.gather_metrics()
        df_dict = self.generate_csv_json(data)
        self.generate_markdown_summary(df_dict)
        self.generate_bar_charts(df_dict)
        self.generate_radar_charts(df_dict)
        self.generate_best_model_report(df_dict)
        print("Model comparison complete.")
