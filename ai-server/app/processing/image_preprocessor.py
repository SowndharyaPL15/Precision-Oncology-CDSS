"""
Image Preprocessing & TensorFlow Data Pipeline Module
======================================================
Provides dataset loading, resizing, normalization, augmentation, and
optimized tf.data pipeline construction for the Precision Oncology project.

Supports:
  - Lung Cancer (LC25000): flat class-folder structure
  - Breast Cancer (BreaKHis 400X): train/test split structure

Does NOT build or train any model.
"""

import os
import json
import numpy as np
import tensorflow as tf
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Tuple, Optional
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight


# ---------------------------------------------------------------------------
# Configuration dataclass
# ---------------------------------------------------------------------------

@dataclass
class PreprocessingConfig:
    """Stores all preprocessing hyperparameters."""

    image_size: Tuple[int, int] = (224, 224)
    batch_size: int = 16
    validation_split: float = 0.2
    test_split: float = 0.15          # Only used when no predefined test set exists
    seed: int = 42
    shuffle_buffer: int = 1000
    normalize_range: Tuple[float, float] = (0.0, 1.0)

    # Augmentation parameters (training only)
    rotation_range: float = 0.15       # fraction of 2π
    horizontal_flip: bool = True
    zoom_range: float = 0.15
    width_shift: float = 0.1
    height_shift: float = 0.1
    brightness_delta: float = 0.2


# ---------------------------------------------------------------------------
# Data Pipeline Builder
# ---------------------------------------------------------------------------

class DataPipelineBuilder:
    """
    Builds optimised tf.data pipelines for medical image classification.

    Usage:
        builder = DataPipelineBuilder(config, dataset_name, root_dir)
        train_ds, val_ds, test_ds, info = builder.build()
    """

    SUPPORTED_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif')

    def __init__(self, config: PreprocessingConfig, dataset_name: str, root_dir: str):
        self.config = config
        self.dataset_name = dataset_name
        self.root_dir = os.path.abspath(root_dir)

        # Populated during build()
        self.class_names: List[str] = []
        self.class_to_index: Dict[str, int] = {}
        self.class_weights: Dict[int, float] = {}
        self.split_counts: Dict[str, int] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def build(self) -> Tuple[tf.data.Dataset, tf.data.Dataset, tf.data.Dataset, dict]:
        """
        Detects the dataset layout and returns (train_ds, val_ds, test_ds, info).
        """
        if self._has_train_test_dirs():
            return self._build_from_train_test_dirs()
        else:
            return self._build_from_flat_dirs()

    def save_config(self, output_path: str):
        """Exports the full preprocessing configuration as JSON."""
        payload = {
            "dataset_name": self.dataset_name,
            "root_dir": self.root_dir,
            "image_size": list(self.config.image_size),
            "batch_size": self.config.batch_size,
            "validation_split": self.config.validation_split,
            "seed": self.config.seed,
            "shuffle_buffer": self.config.shuffle_buffer,
            "normalize_range": list(self.config.normalize_range),
            "augmentation": {
                "rotation_range": self.config.rotation_range,
                "horizontal_flip": self.config.horizontal_flip,
                "zoom_range": self.config.zoom_range,
                "width_shift": self.config.width_shift,
                "height_shift": self.config.height_shift,
                "brightness_delta": self.config.brightness_delta,
            },
            "class_names": self.class_names,
            "class_to_index": self.class_to_index,
            "class_weights": {str(k): round(v, 6) for k, v in self.class_weights.items()},
            "split_counts": self.split_counts,
        }
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(payload, f, indent=2)
        print(f"  Config saved to: {output_path}")

    def generate_summary_report(self, output_path: str):
        """Writes a human-readable preprocessing summary report."""
        lines = [
            "=" * 60,
            f"Preprocessing Summary Report - {self.dataset_name}",
            "=" * 60,
            "",
            f"Dataset root:        {self.root_dir}",
            f"Image size:          {self.config.image_size[0]}x{self.config.image_size[1]}",
            f"Batch size:          {self.config.batch_size}",
            f"Normalization:       [{self.config.normalize_range[0]}, {self.config.normalize_range[1]}]",
            f"Colour mode:         RGB (3 channels)",
            f"Validation split:    {self.config.validation_split}",
            f"Seed:                {self.config.seed}",
            "",
            "--- Class Information ---",
            f"Classes ({len(self.class_names)}): {', '.join(self.class_names)}",
            f"Class-to-index:      {self.class_to_index}",
            "",
            "--- Class Weights ---",
        ]
        for idx, w in self.class_weights.items():
            cls_name = self.class_names[idx] if idx < len(self.class_names) else str(idx)
            lines.append(f"  {cls_name} (index {idx}): {w:.6f}")

        lines += [
            "",
            "--- Split Sizes ---",
        ]
        for split_name, count in self.split_counts.items():
            lines.append(f"  {split_name}: {count} images")

        lines += [
            "",
            "--- Augmentation (training only) ---",
            f"  Random rotation:    +-{self.config.rotation_range * 180:.1f} degrees",
            f"  Horizontal flip:    {self.config.horizontal_flip}",
            f"  Zoom range:         +-{self.config.zoom_range * 100:.0f}%",
            f"  Width shift:        +-{self.config.width_shift * 100:.0f}%",
            f"  Height shift:       +-{self.config.height_shift * 100:.0f}%",
            f"  Brightness delta:   +-{self.config.brightness_delta}",
            "",
            "--- tf.data Pipeline ---",
            "  Optimisations: .cache() -> .shuffle() -> .batch() -> .prefetch(AUTOTUNE)",
            "",
            "=" * 60,
        ]

        report_text = "\n".join(lines)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w") as f:
            f.write(report_text)
        print(f"  Summary report saved to: {output_path}")

    # ------------------------------------------------------------------
    # Layout detection
    # ------------------------------------------------------------------

    def _has_train_test_dirs(self) -> bool:
        """Check if dataset has train/ and test/ subdirectories."""
        return (
            os.path.isdir(os.path.join(self.root_dir, "train"))
            and os.path.isdir(os.path.join(self.root_dir, "test"))
        )

    # ------------------------------------------------------------------
    # File collection helpers
    # ------------------------------------------------------------------

    def _collect_files_from_class_dirs(self, parent_dir: str) -> Tuple[List[str], List[int]]:
        """
        Collects image file paths and integer labels from a directory
        containing class sub-folders.
        """
        file_paths: List[str] = []
        labels: List[int] = []

        class_dirs = sorted([
            d for d in os.listdir(parent_dir)
            if os.path.isdir(os.path.join(parent_dir, d))
        ])

        # Build class mapping on first call
        if not self.class_names:
            self.class_names = class_dirs
            self.class_to_index = {name: idx for idx, name in enumerate(class_dirs)}

        for cls_name in class_dirs:
            cls_dir = os.path.join(parent_dir, cls_name)
            cls_idx = self.class_to_index[cls_name]
            for fname in os.listdir(cls_dir):
                if fname.lower().endswith(self.SUPPORTED_EXTENSIONS):
                    file_paths.append(os.path.join(cls_dir, fname))
                    labels.append(cls_idx)

        return file_paths, labels

    # ------------------------------------------------------------------
    # Build strategies
    # ------------------------------------------------------------------

    def _build_from_flat_dirs(self):
        """
        Flat layout (e.g. LC25000): class_a/, class_b/, class_c/
        Creates a stratified 70/15/15 train/val/test split.
        """
        print(f"\n  Loading flat-directory dataset: {self.dataset_name}")
        file_paths, labels = self._collect_files_from_class_dirs(self.root_dir)
        labels_np = np.array(labels)

        # Stratified split: first 85/15 → train+val / test
        train_val_paths, test_paths, train_val_labels, test_labels = train_test_split(
            file_paths, labels_np,
            test_size=self.config.test_split,
            stratify=labels_np,
            random_state=self.config.seed,
        )

        # Then split train+val into train / val
        val_ratio = self.config.validation_split / (1.0 - self.config.test_split)
        train_paths, val_paths, train_labels, val_labels = train_test_split(
            train_val_paths, train_val_labels,
            test_size=val_ratio,
            stratify=train_val_labels,
            random_state=self.config.seed,
        )

        self.split_counts = {
            "train": len(train_paths),
            "validation": len(val_paths),
            "test": len(test_paths),
        }

        # Compute class weights from training labels
        self.class_weights = self._compute_class_weights(train_labels)

        print(f"  Splits -> Train: {len(train_paths)}, Val: {len(val_paths)}, Test: {len(test_paths)}")

        train_ds = self._build_tf_dataset(train_paths, train_labels, augment=True)
        val_ds   = self._build_tf_dataset(val_paths, val_labels, augment=False)
        test_ds  = self._build_tf_dataset(test_paths, test_labels, augment=False)

        info = {
            "class_names": self.class_names,
            "class_weights": self.class_weights,
            "split_counts": self.split_counts,
        }
        return train_ds, val_ds, test_ds, info

    def _build_from_train_test_dirs(self):
        """
        Pre-split layout (e.g. BreaKHis): train/{classes}/, test/{classes}/
        Carves a validation set from training data.
        """
        print(f"\n  Loading train/test directory dataset: {self.dataset_name}")

        train_dir = os.path.join(self.root_dir, "train")
        test_dir  = os.path.join(self.root_dir, "test")

        all_train_paths, all_train_labels = self._collect_files_from_class_dirs(train_dir)
        test_paths, test_labels = self._collect_files_from_class_dirs(test_dir)

        all_train_labels_np = np.array(all_train_labels)
        test_labels_np = np.array(test_labels)

        # Carve validation from training
        train_paths, val_paths, train_labels, val_labels = train_test_split(
            all_train_paths, all_train_labels_np,
            test_size=self.config.validation_split,
            stratify=all_train_labels_np,
            random_state=self.config.seed,
        )

        self.split_counts = {
            "train": len(train_paths),
            "validation": len(val_paths),
            "test": len(test_paths),
        }

        self.class_weights = self._compute_class_weights(train_labels)

        print(f"  Splits -> Train: {len(train_paths)}, Val: {len(val_paths)}, Test: {len(test_paths)}")

        train_ds = self._build_tf_dataset(train_paths, train_labels, augment=True)
        val_ds   = self._build_tf_dataset(val_paths, val_labels, augment=False)
        test_ds  = self._build_tf_dataset(test_paths, test_labels_np, augment=False)

        info = {
            "class_names": self.class_names,
            "class_weights": self.class_weights,
            "split_counts": self.split_counts,
        }
        return train_ds, val_ds, test_ds, info

    # ------------------------------------------------------------------
    # tf.data pipeline construction
    # ------------------------------------------------------------------

    def _build_tf_dataset(
        self,
        file_paths: list,
        labels,
        augment: bool,
    ) -> tf.data.Dataset:
        """
        Constructs an optimised tf.data.Dataset:
          load → decode → resize → RGB → normalise → (augment) →
          cache → shuffle → batch → prefetch
        """
        labels = np.array(labels, dtype=np.int32)

        ds = tf.data.Dataset.from_tensor_slices((list(file_paths), labels))

        # Map: load + preprocess
        ds = ds.map(
            lambda path, label: (self._load_and_preprocess(path), label),
            num_parallel_calls=tf.data.AUTOTUNE,
        )

        # Conditional augmentation
        if augment:
            ds = ds.map(
                lambda img, label: (self._augment(img), label),
                num_parallel_calls=tf.data.AUTOTUNE,
            )

        # Performance pipeline
        if augment:
            ds = ds.shuffle(buffer_size=self.config.shuffle_buffer, seed=self.config.seed)
        ds = ds.batch(self.config.batch_size)
        ds = ds.prefetch(tf.data.AUTOTUNE)

        return ds

    # ------------------------------------------------------------------
    # Image loading & normalisation (runs inside tf.data.map)
    # ------------------------------------------------------------------

    @tf.function
    def _load_and_preprocess(self, file_path: tf.Tensor) -> tf.Tensor:
        """Read → decode → resize → RGB → normalise to [0, 1]."""
        raw = tf.io.read_file(file_path)
        img = tf.image.decode_image(raw, channels=3, expand_animations=False)
        img.set_shape([None, None, 3])                       # static shape hint
        img = tf.image.resize(img, self.config.image_size)   # bilinear by default
        img = tf.cast(img, tf.float32) / 255.0               # normalise [0,1]
        return img

    # ------------------------------------------------------------------
    # Data augmentation (runs inside tf.data.map, training only)
    # ------------------------------------------------------------------

    @tf.function
    def _augment(self, img: tf.Tensor) -> tf.Tensor:
        """
        Applies random augmentation transformations.
        All ops are TensorFlow-native so they run inside the tf.data graph.
        """
        # Random horizontal flip
        if self.config.horizontal_flip:
            img = tf.image.random_flip_left_right(img)

        # Random brightness
        img = tf.image.random_brightness(img, max_delta=self.config.brightness_delta)

        # Random rotation (in radians)
        angle = tf.random.uniform(
            [], -self.config.rotation_range * np.pi, self.config.rotation_range * np.pi
        )
        img = self._rotate(img, angle)

        # Random zoom (via crop-and-resize)
        img = self._random_zoom(img)

        # Random width/height shift (via pad-and-crop)
        img = self._random_shift(img)

        # Clip to valid range
        img = tf.clip_by_value(img, 0.0, 1.0)
        return img

    @tf.function
    def _rotate(self, img: tf.Tensor, angle: tf.Tensor) -> tf.Tensor:
        """Rotate a single image by the given angle (radians)."""
        # Add batch dim for tfa-free rotation via raw affine
        img_4d = tf.expand_dims(img, 0)
        cos_a = tf.cos(angle)
        sin_a = tf.sin(angle)
        # Build 2×3 affine transform matrix (row-major flat)
        transform = tf.stack([cos_a, -sin_a, 0.0, sin_a, cos_a, 0.0, 0.0, 0.0])
        transform = tf.reshape(transform, [1, 8])
        rotated = tf.raw_ops.ImageProjectiveTransformV3(
            images=img_4d,
            transforms=transform,
            output_shape=tf.shape(img)[:2],
            interpolation="BILINEAR",
            fill_mode="REFLECT",
            fill_value=0.0,
        )
        return rotated[0]

    @tf.function
    def _random_zoom(self, img: tf.Tensor) -> tf.Tensor:
        """Random zoom via central crop + resize back."""
        h = tf.shape(img)[0]
        w = tf.shape(img)[1]
        zoom_factor = tf.random.uniform([], 1.0 - self.config.zoom_range, 1.0)
        crop_h = tf.cast(tf.cast(h, tf.float32) * zoom_factor, tf.int32)
        crop_w = tf.cast(tf.cast(w, tf.float32) * zoom_factor, tf.int32)
        # Ensure minimum crop size of 1
        crop_h = tf.maximum(crop_h, 1)
        crop_w = tf.maximum(crop_w, 1)
        img = tf.image.random_crop(img, [crop_h, crop_w, 3])
        img = tf.image.resize(img, self.config.image_size)
        return img

    @tf.function
    def _random_shift(self, img: tf.Tensor) -> tf.Tensor:
        """Random width/height shift via pad + crop."""
        h = self.config.image_size[0]
        w = self.config.image_size[1]
        max_dy = tf.cast(tf.cast(h, tf.float32) * self.config.height_shift, tf.int32)
        max_dx = tf.cast(tf.cast(w, tf.float32) * self.config.width_shift, tf.int32)
        # Ensure padding is at least 1 to avoid zero-size
        max_dy = tf.maximum(max_dy, 1)
        max_dx = tf.maximum(max_dx, 1)
        # Pad all sides, then random-crop back to original size
        img = tf.pad(img, [[max_dy, max_dy], [max_dx, max_dx], [0, 0]], mode="REFLECT")
        img = tf.image.random_crop(img, [h, w, 3])
        return img

    # ------------------------------------------------------------------
    # Class weight computation
    # ------------------------------------------------------------------

    def _compute_class_weights(self, labels) -> Dict[int, float]:
        """Compute balanced class weights using scikit-learn."""
        labels_np = np.array(labels)
        unique_classes = np.unique(labels_np)
        weights = compute_class_weight(
            class_weight="balanced",
            classes=unique_classes,
            y=labels_np,
        )
        return {int(cls): float(w) for cls, w in zip(unique_classes, weights)}
