import os
import pandas as pd
from app.processing.dataset_analyzer import DatasetAnalyzer

def main():
    # Base paths relative to the project root
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    datasets_config = [
        {
            "name": "Lung Cancer (LC25000)",
            "path": os.path.join(project_root, "datasets", "lungs")
        },
        {
            "name": "Breast Cancer (BreaKHis 400X)",
            "path": os.path.join(project_root, "datasets", "BreaKHis 400X")
        }
    ]
    
    output_graphs_dir = os.path.join(project_root, "reports", "graphs")
    os.makedirs(output_graphs_dir, exist_ok=True)
    
    all_stats = []
    
    print("=" * 60)
    print("Precision Oncology Multimodal Dataset EDA and Validation")
    print("=" * 60)
    
    for config in datasets_config:
        name = config["name"]
        path = config["path"]
        
        if not os.path.exists(path):
            print(f"Warning: Dataset path '{path}' does not exist. Skipping...")
            continue
            
        analyzer = DatasetAnalyzer(
            dataset_name=name,
            root_dir=path,
            output_graphs_dir=output_graphs_dir
        )
        
        # 1. Scan and Validate
        df_valid, df_corrupted = analyzer.scan_and_validate()
        
        # 2. Save individual dataset verification results/logs if corrupted or duplicates found
        if not df_corrupted.empty:
            corrupted_report_path = os.path.join(project_root, "reports", f"{name.replace(' ', '_').lower()}_corrupted_files.csv")
            df_corrupted.to_csv(corrupted_report_path, index=False)
            print(f"Saved corrupted file log to: {corrupted_report_path}")
            
        # Write list of duplicates to logs/reports if found
        if analyzer.duplicate_groups:
            dup_records = []
            for h, paths in analyzer.duplicate_groups.items():
                dup_records.append({"Hash": h, "Original": paths[0], "Duplicates": ", ".join(paths[1:])})
            df_dups = pd.DataFrame(dup_records)
            dups_report_path = os.path.join(project_root, "reports", f"{name.replace(' ', '_').lower()}_duplicate_files.csv")
            df_dups.to_csv(dups_report_path, index=False)
            print(f"Saved duplicate files log to: {dups_report_path}")
            
        # 3. Generate Statistics
        stats = analyzer.generate_statistics(df_valid, df_corrupted)
        all_stats.append(stats)
        
        # 4. Generate & Save Graphs
        print(f"Plotting and saving graphs for {name} to '{output_graphs_dir}'...")
        analyzer.plot_and_save_graphs(df_valid)
        print("-" * 60)
        
    if all_stats:
        # Export aggregated dataset summary to CSV
        summary_df = pd.DataFrame(all_stats)
        summary_path = os.path.join(project_root, "reports", "dataset_summary.csv")
        summary_df.to_csv(summary_path, index=False)
        print(f"\n[SUCCESS] Aggregated dataset summary exported to: {summary_path}")
        
        # Print summary table to console
        print("\nDataset Summary Table:")
        print(summary_df.to_string(index=False))
    else:
        print("\n[ERROR] No datasets could be analyzed.")

if __name__ == "__main__":
    main()
