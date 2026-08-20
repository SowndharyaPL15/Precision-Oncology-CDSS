import os
import hashlib
import cv2
import pandas as pd
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from typing import Dict, List, Tuple, Set

class DatasetAnalyzer:
    """
    An optimized, robust framework for dataset validation, duplicate detection,
    corruption checks, and exploratory data analysis (EDA) for medical image datasets.
    """
    
    SUPPORTED_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif')

    def __init__(self, dataset_name: str, root_dir: str, output_graphs_dir: str):
        self.dataset_name = dataset_name
        self.root_dir = os.path.abspath(root_dir)
        self.output_graphs_dir = os.path.abspath(output_graphs_dir)
        
        # Ensure graphs output directory exists
        os.makedirs(self.output_graphs_dir, exist_ok=True)
        
        # Results storage
        self.image_records: List[Dict] = []
        self.corrupted_files: List[Dict] = []
        self.duplicate_groups: Dict[str, List[str]] = {}
        
    def _compute_perceptual_hash(self, cv_img: np.ndarray) -> str:
        """
        Computes a simple, robust perceptual average hash (aHash) for detecting near-duplicates.
        Uses the pre-loaded image to avoid disk I/O.
        """
        try:
            # Convert to grayscale
            if len(cv_img.shape) == 3:
                gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
            else:
                gray = cv_img
            resized = cv2.resize(gray, (16, 16), interpolation=cv2.INTER_AREA)
            avg = resized.mean()
            diff = resized > avg
            return hashlib.md5(diff.tobytes()).hexdigest()
        except Exception:
            return ""

    def scan_and_validate(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Scans all files in the root directory, performs corruption checks,
        extracts resolution/metadata, and detects duplicates.
        """
        print(f"\nScanning and validating dataset: {self.dataset_name} at '{self.root_dir}'...")
        
        hashes: Dict[str, List[str]] = {}
        processed_count = 0
        
        # Find all matching files first
        all_files = []
        for dirpath, _, filenames in os.walk(self.root_dir):
            for file in filenames:
                if file.lower().endswith(self.SUPPORTED_EXTENSIONS):
                    all_files.append((dirpath, file))
                    
        total_files = len(all_files)
        print(f"Found {total_files} images to process. Analyzing...")

        for idx, (dirpath, file) in enumerate(all_files):
            full_path = os.path.join(dirpath, file)
            rel_path = os.path.relpath(full_path, self.root_dir)
            
            # Determine class and split
            parts = rel_path.split(os.sep)
            split = "N/A"
            if len(parts) >= 3:
                split = parts[0]
                img_class = parts[1]
            elif len(parts) == 2:
                img_class = parts[0]
            else:
                img_class = "unknown"
            
            is_corrupted = False
            corruption_reason = ""
            width, height, channels = 0, 0, 0
            file_size_kb = os.path.getsize(full_path) / 1024.0
            
            # 1. Read file bytes once to optimize disk access
            try:
                with open(full_path, 'rb') as f:
                    img_bytes = f.read()
            except Exception as e:
                is_corrupted = True
                corruption_reason = f"File read error: {str(e)}"
                
            # 2. OpenCV validation
            cv_img = None
            if not is_corrupted:
                try:
                    img_np = np.frombuffer(img_bytes, dtype=np.uint8)
                    cv_img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
                    if cv_img is None:
                        is_corrupted = True
                        corruption_reason = "OpenCV failed to decode image"
                    else:
                        height, width, channels = cv_img.shape
                except Exception as e:
                    is_corrupted = True
                    corruption_reason = f"OpenCV decode error: {str(e)}"
            
            # 3. TensorFlow validation (Done on all to ensure DL compatibility, using loaded bytes)
            if not is_corrupted:
                try:
                    tf_img = tf.image.decode_image(img_bytes, expand_animations=False)
                    _ = tf_img.shape
                except Exception as e:
                    is_corrupted = True
                    corruption_reason = f"TensorFlow decode failed: {str(e)}"
            
            if is_corrupted:
                self.corrupted_files.append({
                    "Dataset": self.dataset_name,
                    "File Path": rel_path,
                    "Reason": corruption_reason,
                    "Size (KB)": file_size_kb
                })
                continue
            
            # 4. Hash computation using the loaded OpenCV image
            p_hash = self._compute_perceptual_hash(cv_img)
            if p_hash:
                if p_hash in hashes:
                    hashes[p_hash].append(rel_path)
                else:
                    hashes[p_hash] = [rel_path]
            
            # Save valid record
            self.image_records.append({
                "Dataset": self.dataset_name,
                "File Path": rel_path,
                "Split": split,
                "Class": img_class,
                "Width": width,
                "Height": height,
                "Channels": channels,
                "Size (KB)": file_size_kb,
                "Hash": p_hash
            })
            
            # Print progress every 1000 files
            processed_count += 1
            if processed_count % 2000 == 0 or processed_count == total_files:
                print(f" Progress: {processed_count}/{total_files} files processed...")

        # Process duplicates
        self.duplicate_groups = {h: paths for h, paths in hashes.items() if len(paths) > 1}
        
        df_valid = pd.DataFrame(self.image_records)
        df_corrupted = pd.DataFrame(self.corrupted_files)
        
        # Add duplicate flags to df_valid
        if not df_valid.empty:
            duplicate_set = set()
            for paths in self.duplicate_groups.values():
                for dup_path in paths[1:]:
                    duplicate_set.add(dup_path)
            df_valid["Is_Duplicate"] = df_valid["File Path"].apply(lambda x: x in duplicate_set)
        else:
            df_valid["Is_Duplicate"] = pd.Series(dtype=bool)

        print(f"Scan complete. Valid: {len(df_valid)}, Corrupted: {len(df_corrupted)}, Duplicates detected: {df_valid['Is_Duplicate'].sum() if not df_valid.empty else 0}")
        return df_valid, df_corrupted

    def generate_statistics(self, df_valid: pd.DataFrame, df_corrupted: pd.DataFrame) -> Dict:
        """
        Generates summary statistics for the dataset.
        """
        if df_valid.empty:
            return {
                "Dataset": self.dataset_name,
                "Total Files Scanned": len(df_corrupted),
                "Valid Images": 0,
                "Corrupted Images": len(df_corrupted),
                "Duplicate Images": 0
            }
            
        total_scanned = len(df_valid) + len(df_corrupted)
        duplicate_count = df_valid["Is_Duplicate"].sum()
        
        stats = {
            "Dataset": self.dataset_name,
            "Total Files Scanned": total_scanned,
            "Valid Images": len(df_valid),
            "Corrupted Images": len(df_corrupted),
            "Duplicate Images": duplicate_count,
            "Min Width": int(df_valid["Width"].min()),
            "Max Width": int(df_valid["Width"].max()),
            "Mean Width": round(df_valid["Width"].mean(), 2),
            "Min Height": int(df_valid["Height"].min()),
            "Max Height": int(df_valid["Height"].max()),
            "Mean Height": round(df_valid["Height"].mean(), 2),
            "Mean Size (KB)": round(df_valid["Size (KB)"].mean(), 2),
        }
        
        # Class distribution
        class_counts = df_valid["Class"].value_counts().to_dict()
        for cls, count in class_counts.items():
            stats[f"Class_{cls}_Count"] = count
            stats[f"Class_{cls}_Ratio (%)"] = round((count / len(df_valid)) * 100, 2)
            
        return stats

    def plot_and_save_graphs(self, df_valid: pd.DataFrame):
        """
        Generates and saves the distribution plots and sample grids.
        """
        if df_valid.empty:
            return
        
        # Apply clean design style
        plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
        plt.rcParams['font.sans-serif'] = 'Arial'
        plt.rcParams['font.family'] = 'sans-serif'
        
        # 1. Class Distribution Plot
        plt.figure(figsize=(8, 5))
        class_counts = df_valid["Class"].value_counts()
        colors = ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a']
        class_counts.plot(kind='bar', color=colors[:len(class_counts)], edgecolor='black', alpha=0.85)
        plt.title(f"Class Distribution - {self.dataset_name}", fontsize=14, fontweight='bold', pad=15)
        plt.ylabel("Number of Images", fontsize=12)
        plt.xlabel("Class", fontsize=12)
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_graphs_dir, f"{self.dataset_name.replace(' ', '_').lower()}_class_distribution.png"), dpi=300)
        plt.close()
        
        # 2. Resolution Scatter Plot / Histogram
        plt.figure(figsize=(8, 6))
        # Unique resolutions
        res_df = df_valid.groupby(["Width", "Height"]).size().reset_index(name="Count")
        scatter = plt.scatter(res_df["Width"], res_df["Height"], s=res_df["Count"] * 10, alpha=0.6, edgecolors='w', color='#2ca02c')
        plt.title(f"Image Resolution Distribution - {self.dataset_name}", fontsize=14, fontweight='bold', pad=15)
        plt.xlabel("Width (pixels)", fontsize=12)
        plt.ylabel("Height (pixels)", fontsize=12)
        plt.grid(True, linestyle='--', alpha=0.5)
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_graphs_dir, f"{self.dataset_name.replace(' ', '_').lower()}_resolution_distribution.png"), dpi=300)
        plt.close()

        # 3. Sample Images Grid
        classes = df_valid["Class"].unique()
        fig, axes = plt.subplots(1, len(classes), figsize=(4 * len(classes), 4))
        if len(classes) == 1:
            axes = [axes]
            
        for i, cls in enumerate(classes):
            cls_df = df_valid[df_valid["Class"] == cls]
            if cls_df.empty:
                continue
            sample_rel_path = cls_df.sample(n=1)["File Path"].values[0]
            sample_full_path = os.path.join(self.root_dir, sample_rel_path)
            
            img = cv2.imread(sample_full_path)
            if img is not None:
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                axes[i].imshow(img)
                axes[i].set_title(f"Class: {cls}\n{img.shape[1]}x{img.shape[0]}", fontsize=10, fontweight='bold')
            axes[i].axis('off')
            
        plt.suptitle(f"Sample Images from Each Class - {self.dataset_name}", fontsize=14, fontweight='bold', y=1.02)
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_graphs_dir, f"{self.dataset_name.replace(' ', '_').lower()}_sample_images.png"), dpi=300, bbox_inches='tight')
        plt.close()
