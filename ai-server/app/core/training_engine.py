"""
Training Engine - Shared Training, Evaluation, and Visualization Module
========================================================================
Provides a reusable TrainingEngine class that handles:
  - Two-stage transfer learning (feature extraction + fine-tuning)
  - Versioned model saving
  - Full evaluation metrics (Accuracy, Precision, Recall, F1, ROC-AUC, MCC)
  - Visualization (loss, accuracy, confusion matrix, ROC, PR, LR schedule)
  - Prediction CSV export
  - Misclassified image tracking
  - Training configuration and summary report export

Designed to be model-agnostic: EfficientNetB0, ResNet50, DenseNet121, etc.
all delegate to this engine with identical training/evaluation protocols.
"""

import os
import json
import pickle
import shutil
import numpy as np
import pandas as pd
import tensorflow as tf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, roc_auc_score,
    confusion_matrix, roc_curve, precision_recall_curve,
    matthews_corrcoef, balanced_accuracy_score, cohen_kappa_score
)


class TrainingEngine:
    """
    Reusable training engine for two-stage transfer learning pipelines.

    Usage:
        engine = TrainingEngine(model_name="efficientnet", dataset_key="breast", ...)
        history1 = engine.train_stage1(model, train_ds, val_ds)
        history2 = engine.train_stage2(model, train_ds, val_ds, unfreeze_fn)
        engine.evaluate(model, test_ds, test_labels, test_paths, dataset_root)
        engine.save_training_summary(history1, history2, metrics)
    """

    def __init__(
        self,
        model_name: str,
        dataset_key: str,
        display_name: str,
        num_classes: int,
        class_names: List[str],
        class_weights: Dict[int, float],
        mode: str,
        epochs: int,
        project_root: str,
    ):
        self.model_name = model_name
        self.dataset_key = dataset_key
        self.display_name = display_name
        self.num_classes = num_classes
        self.class_names = class_names
        self.class_weights = class_weights
        self.mode = mode
        self.epochs = epochs
        self.project_root = project_root

        # Output directories (versioned by model and dataset)
        self.models_dir = os.path.join(project_root, "models", model_name, dataset_key)
        self.reports_dir = os.path.join(project_root, "reports", model_name, dataset_key)
        self.graphs_dir = os.path.join(self.reports_dir, "graphs")
        self.misclassified_dir = os.path.join(project_root, "results", "misclassified", dataset_key)

        # Create all directories
        for d in [self.models_dir, self.reports_dir, self.graphs_dir, self.misclassified_dir]:
            os.makedirs(d, exist_ok=True)

        # Storage for metrics
        self.metrics: Dict = {}

    # ------------------------------------------------------------------
    # Stage 1 - Feature Extraction (frozen backbone)
    # ------------------------------------------------------------------

    def train_stage1(
        self,
        model: tf.keras.Model,
        train_ds: tf.data.Dataset,
        val_ds: tf.data.Dataset,
    ) -> tf.keras.callbacks.History:
        """
        Stage 1: Train only the classification head with frozen backbone.
        """
        print(f"\n{'='*70}")
        print(f"STAGE 1 - Feature Extraction (Frozen Backbone)")
        print(f"{'='*70}")

        stage1_path = os.path.join(self.models_dir, "stage1_best.keras")
        patience_es = 3 if self.mode == "verification" else 5
        patience_lr = 2 if self.mode == "verification" else 3

        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=patience_es,
                restore_best_weights=True,
                verbose=1
            ),
            tf.keras.callbacks.ModelCheckpoint(
                filepath=stage1_path,
                monitor='val_loss',
                save_best_only=True,
                verbose=1
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=patience_lr,
                verbose=1
            )
        ]

        print(f"[INFO] Stage 1 training for {self.epochs} epochs...")
        history = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=self.epochs,
            class_weight=self.class_weights,
            callbacks=callbacks
        )

        self.save_history(history, "stage1")
        print(f"[INFO] Stage 1 complete. Best model saved to: {stage1_path}")
        return history

    # ------------------------------------------------------------------
    # Stage 2 - Fine-Tuning (partially unfrozen backbone)
    # ------------------------------------------------------------------

    def train_stage2(
        self,
        model: tf.keras.Model,
        train_ds: tf.data.Dataset,
        val_ds: tf.data.Dataset,
        prepare_fine_tuning_fn,
    ) -> tf.keras.callbacks.History:
        """
        Stage 2: Unfreeze the last N layers and fine-tune with lower LR.

        Args:
            prepare_fine_tuning_fn: A callable that takes the model and
                prepares it for fine-tuning (unfreezes layers, recompiles).
        """
        print(f"\n{'='*70}")
        print(f"STAGE 2 - Fine-Tuning (Partially Unfrozen Backbone)")
        print(f"{'='*70}")

        # Load best Stage 1 weights
        stage1_path = os.path.join(self.models_dir, "stage1_best.keras")
        if os.path.exists(stage1_path):
            print(f"[INFO] Loading best Stage 1 model from: {stage1_path}")
            model = tf.keras.models.load_model(stage1_path)

        # Prepare model for fine-tuning
        prepare_fine_tuning_fn(model)

        stage2_path = os.path.join(self.models_dir, "stage2_best.keras")
        patience_es = 3 if self.mode == "verification" else 5
        patience_lr = 2 if self.mode == "verification" else 3

        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=patience_es,
                restore_best_weights=True,
                verbose=1
            ),
            tf.keras.callbacks.ModelCheckpoint(
                filepath=stage2_path,
                monitor='val_loss',
                save_best_only=True,
                verbose=1
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=patience_lr,
                verbose=1
            )
        ]

        ft_epochs = self.epochs  # Same epoch budget for fine-tuning

        print(f"[INFO] Stage 2 fine-tuning for {ft_epochs} epochs...")
        history = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=ft_epochs,
            class_weight=self.class_weights,
            callbacks=callbacks
        )

        self.save_history(history, "stage2")

        # Save final versioned model
        final_path = os.path.join(self.models_dir, "final_model_v1.keras")
        model.save(final_path)
        print(f"[INFO] Stage 2 complete. Final model saved to: {final_path}")
        return history

    # ------------------------------------------------------------------
    # Evaluation
    # ------------------------------------------------------------------

    def evaluate(
        self,
        model: tf.keras.Model,
        test_ds: tf.data.Dataset,
        test_labels: np.ndarray,
        test_paths: list,
        dataset_root: str,
    ) -> Dict:
        """
        Full evaluation: metrics, plots, predictions CSV, misclassified images.
        """
        print(f"\n{'='*70}")
        print(f"EVALUATION - {self.display_name}")
        print(f"{'='*70}")

        # Predictions
        print("[INFO] Running predictions on test set...")
        predictions = model.predict(test_ds)
        pred_labels = np.argmax(predictions, axis=1)

        # --- Metrics ---
        accuracy = accuracy_score(test_labels, pred_labels)
        
        # Weighted Average
        precision_weighted, recall_weighted, f1_weighted, _ = precision_recall_fscore_support(
            test_labels, pred_labels, average='weighted', zero_division=0
        )
        
        # Macro Average
        precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(
            test_labels, pred_labels, average='macro', zero_division=0
        )

        # ROC-AUC
        try:
            if self.num_classes == 2:
                roc_auc = roc_auc_score(test_labels, predictions[:, 1])
            else:
                roc_auc = roc_auc_score(test_labels, predictions, multi_class='ovr', average='weighted')
        except ValueError:
            roc_auc = 0.0

        # MCC
        mcc = matthews_corrcoef(test_labels, pred_labels)

        # Balanced Accuracy & Cohen's Kappa
        balanced_accuracy = balanced_accuracy_score(test_labels, pred_labels)
        cohen_kappa = cohen_kappa_score(test_labels, pred_labels)

        # Confusion Matrix
        cm = confusion_matrix(test_labels, pred_labels)

        # Class-wise Sensitivity and Specificity
        sensitivities = []
        specificities = []
        for i in range(self.num_classes):
            tp = cm[i, i]
            fn = cm[i, :].sum() - tp
            fp = cm[:, i].sum() - tp
            tn = cm.sum() - (tp + fn + fp)
            sens_i = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            spec_i = tn / (tn + fp) if (tn + fp) > 0 else 0.0
            sensitivities.append(sens_i)
            specificities.append(spec_i)
        
        macro_sensitivity = float(np.mean(sensitivities))
        macro_specificity = float(np.mean(specificities))
        
        supports = [cm[i, :].sum() for i in range(self.num_classes)]
        total_support = sum(supports)
        weighted_specificity = float(sum(spec * sup for spec, sup in zip(specificities, supports)) / total_support) if total_support > 0 else 0.0
        weighted_sensitivity = float(sum(sens * sup for sens, sup in zip(sensitivities, supports)) / total_support) if total_support > 0 else 0.0

        self.metrics = {
            "accuracy": float(accuracy),
            "precision": float(precision_weighted),
            "recall": float(recall_weighted),
            "f1_score": float(f1_weighted),
            "roc_auc": float(roc_auc),
            "mcc": float(mcc),
            "sensitivity": float(weighted_sensitivity),
            "specificity": float(weighted_specificity),
            "balanced_accuracy": float(balanced_accuracy),
            "cohen_kappa": float(cohen_kappa),
            "macro_precision": float(precision_macro),
            "macro_recall": float(recall_macro),
            "macro_f1": float(f1_macro),
            "weighted_precision": float(precision_weighted),
            "weighted_recall": float(recall_weighted),
            "weighted_f1": float(f1_weighted)
        }

        print(f"  Accuracy:          {accuracy:.4f}")
        print(f"  Precision (W):     {precision_weighted:.4f}")
        print(f"  Recall (W):        {recall_weighted:.4f}")
        print(f"  F1-Score (W):      {f1_weighted:.4f}")
        print(f"  ROC-AUC:           {roc_auc:.4f}")
        print(f"  MCC:               {mcc:.4f}")
        print(f"  Sensitivity (W):   {weighted_sensitivity:.4f}")
        print(f"  Specificity (W):   {weighted_specificity:.4f}")
        print(f"  Balanced Accuracy: {balanced_accuracy:.4f}")
        print(f"  Cohen's Kappa:     {cohen_kappa:.4f}")
        print(f"  Macro Precision:   {precision_macro:.4f}")
        print(f"  Macro Recall:      {recall_macro:.4f}")
        print(f"  Macro F1-Score:    {f1_macro:.4f}")

        # --- Save metrics reports ---
        self._save_metrics_reports()

        # --- Plot visualizations ---
        self._plot_confusion_matrix(cm)
        self._plot_roc_curve(test_labels, predictions)
        self._plot_pr_curve(test_labels, predictions)

        # --- Save predictions CSV ---
        self._save_predictions(test_paths, test_labels, pred_labels, predictions, dataset_root)

        # --- Save misclassified images ---
        self._save_misclassified(test_paths, test_labels, pred_labels, predictions)

        return self.metrics

    # ------------------------------------------------------------------
    # History saving
    # ------------------------------------------------------------------

    def save_history(self, history: tf.keras.callbacks.History, stage_name: str):
        """Saves training history as JSON and pickle."""
        hist_dict = {}
        for key, values in history.history.items():
            hist_dict[key] = [float(v) for v in values]

        json_path = os.path.join(self.reports_dir, f"history_{stage_name}.json")
        pkl_path = os.path.join(self.reports_dir, f"history_{stage_name}.pkl")

        with open(json_path, "w") as f:
            json.dump(hist_dict, f, indent=2)
        with open(pkl_path, "wb") as f:
            pickle.dump(hist_dict, f)

        print(f"  History ({stage_name}) saved to: {json_path}")

    # ------------------------------------------------------------------
    # Training configuration export
    # ------------------------------------------------------------------

    def save_training_config(
        self,
        split_counts: Dict[str, int],
        extra_config: Optional[Dict] = None,
    ):
        """Exports complete training configuration as JSON."""
        config = {
            "model_name": self.model_name,
            "dataset_name": self.display_name,
            "image_size": [224, 224],
            "batch_size": 32,
            "optimizer": "Adam",
            "initial_learning_rate": 1e-4,
            "fine_tuning_learning_rate": 1e-5,
            "epochs": self.epochs,
            "mode": self.mode,
            "random_seed": 42,
            "date_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "train_images": split_counts.get("train", 0),
            "validation_images": split_counts.get("validation", 0),
            "test_images": split_counts.get("test", 0),
            "class_names": self.class_names,
            "class_weights": {str(k): round(v, 6) for k, v in self.class_weights.items()},
        }
        if extra_config:
            config.update(extra_config)

        path = os.path.join(self.reports_dir, "training_config.json")
        with open(path, "w") as f:
            json.dump(config, f, indent=2)
        print(f"[INFO] Training config saved to: {path}")

    # ------------------------------------------------------------------
    # Training summary report
    # ------------------------------------------------------------------

    def save_training_summary(
        self,
        stage1_history: tf.keras.callbacks.History,
        stage2_history: tf.keras.callbacks.History,
    ):
        """Writes a human-readable training summary report."""
        lines = [
            "=" * 70,
            f"Training Summary Report - {self.display_name}",
            f"Model: {self.model_name.upper()} | Mode: {self.mode.upper()}",
            f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "=" * 70,
            "",
            "--- Stage 1: Feature Extraction ---",
            f"  Epochs trained: {len(stage1_history.epoch)}",
            f"  Final train loss:  {stage1_history.history['loss'][-1]:.4f}",
            f"  Final val loss:    {stage1_history.history['val_loss'][-1]:.4f}",
            f"  Final train acc:   {stage1_history.history['accuracy'][-1]:.4f}",
            f"  Final val acc:     {stage1_history.history['val_accuracy'][-1]:.4f}",
            "",
            "--- Stage 2: Fine-Tuning ---",
            f"  Epochs trained: {len(stage2_history.epoch)}",
            f"  Final train loss:  {stage2_history.history['loss'][-1]:.4f}",
            f"  Final val loss:    {stage2_history.history['val_loss'][-1]:.4f}",
            f"  Final train acc:   {stage2_history.history['accuracy'][-1]:.4f}",
            f"  Final val acc:     {stage2_history.history['val_accuracy'][-1]:.4f}",
            "",
            "--- Test Evaluation Metrics ---",
        ]

        for metric_name, value in self.metrics.items():
            lines.append(f"  {metric_name}: {value:.4f}")

        lines += ["", "=" * 70]

        path = os.path.join(self.reports_dir, "training_summary.txt")
        with open(path, "w") as f:
            f.write("\n".join(lines))
        print(f"[INFO] Training summary saved to: {path}")

    # ------------------------------------------------------------------
    # Combined training curves (Stage 1 + Stage 2)
    # ------------------------------------------------------------------

    def plot_training_curves(
        self,
        stage1_history: tf.keras.callbacks.History,
        stage2_history: tf.keras.callbacks.History,
    ):
        """Plots combined accuracy, loss, and LR schedule curves."""
        plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

        s1 = stage1_history.history
        s2 = stage2_history.history
        s1_epochs = len(s1['loss'])

        # --- Accuracy Curve ---
        plt.figure(figsize=(10, 5))
        all_train_acc = s1['accuracy'] + s2['accuracy']
        all_val_acc = s1['val_accuracy'] + s2['val_accuracy']
        epochs_range = range(1, len(all_train_acc) + 1)

        plt.plot(epochs_range, all_train_acc, label='Train Accuracy', color='#2196F3')
        plt.plot(epochs_range, all_val_acc, label='Val Accuracy', color='#FF9800')
        plt.axvline(x=s1_epochs + 0.5, color='red', linestyle='--', alpha=0.7, label='Fine-tuning start')
        plt.title(f'Training vs Validation Accuracy - {self.display_name}', fontweight='bold')
        plt.xlabel('Epoch')
        plt.ylabel('Accuracy')
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(self.graphs_dir, "accuracy_curve.png"), dpi=300)
        plt.close()

        # --- Loss Curve ---
        plt.figure(figsize=(10, 5))
        all_train_loss = s1['loss'] + s2['loss']
        all_val_loss = s1['val_loss'] + s2['val_loss']

        plt.plot(epochs_range, all_train_loss, label='Train Loss', color='#2196F3')
        plt.plot(epochs_range, all_val_loss, label='Val Loss', color='#FF9800')
        plt.axvline(x=s1_epochs + 0.5, color='red', linestyle='--', alpha=0.7, label='Fine-tuning start')
        plt.title(f'Training vs Validation Loss - {self.display_name}', fontweight='bold')
        plt.xlabel('Epoch')
        plt.ylabel('Loss')
        plt.legend()
        plt.tight_layout()
        plt.savefig(os.path.join(self.graphs_dir, "loss_curve.png"), dpi=300)
        plt.close()

        # --- Learning Rate Schedule ---
        if 'learning_rate' in s1 or 'lr' in s1:
            lr_key = 'learning_rate' if 'learning_rate' in s1 else 'lr'
            all_lr = s1[lr_key] + s2.get(lr_key, s2.get('learning_rate', s2.get('lr', [])))

            if all_lr:
                plt.figure(figsize=(10, 4))
                plt.plot(range(1, len(all_lr) + 1), all_lr, color='#4CAF50', lw=2)
                plt.axvline(x=s1_epochs + 0.5, color='red', linestyle='--', alpha=0.7, label='Fine-tuning start')
                plt.title(f'Learning Rate Schedule - {self.display_name}', fontweight='bold')
                plt.xlabel('Epoch')
                plt.ylabel('Learning Rate')
                plt.yscale('log')
                plt.legend()
                plt.tight_layout()
                plt.savefig(os.path.join(self.graphs_dir, "lr_schedule.png"), dpi=300)
                plt.close()

        print(f"[INFO] Training curves saved to: {self.graphs_dir}")

    # ------------------------------------------------------------------
    # Private: Metrics reports
    # ------------------------------------------------------------------

    def _save_metrics_reports(self):
        """Exports metrics as JSON and CSV."""
        report = {
            "model": self.model_name,
            "dataset": self.display_name,
            "mode": self.mode,
            "class_names": self.class_names,
            **self.metrics,
        }

        json_path = os.path.join(self.reports_dir, "metrics.json")
        csv_path = os.path.join(self.reports_dir, "metrics.csv")

        with open(json_path, "w") as f:
            json.dump(report, f, indent=2)
        pd.DataFrame([report]).to_csv(csv_path, index=False)

        print(f"  Metrics saved to: {json_path}")

    # ------------------------------------------------------------------
    # Private: Visualization plots
    # ------------------------------------------------------------------

    def _plot_confusion_matrix(self, cm: np.ndarray):
        plt.figure(figsize=(6, 5))
        plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
        plt.title(f'Confusion Matrix - {self.display_name}', fontweight='bold')
        plt.colorbar()
        tick_marks = np.arange(len(self.class_names))
        plt.xticks(tick_marks, self.class_names, rotation=45)
        plt.yticks(tick_marks, self.class_names)

        thresh = cm.max() / 2.
        for i, j in np.ndindex(cm.shape):
            plt.text(j, i, format(cm[i, j], 'd'),
                     horizontalalignment="center",
                     color="white" if cm[i, j] > thresh else "black")

        plt.ylabel('True label')
        plt.xlabel('Predicted label')
        plt.tight_layout()
        plt.savefig(os.path.join(self.graphs_dir, "confusion_matrix.png"), dpi=300)
        plt.close()

    def _plot_roc_curve(self, test_labels: np.ndarray, predictions: np.ndarray):
        plt.figure(figsize=(8, 6))

        if self.num_classes == 2:
            fpr, tpr, _ = roc_curve(test_labels, predictions[:, 1])
            auc_val = roc_auc_score(test_labels, predictions[:, 1])
            plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC (AUC = {auc_val:.4f})')
        else:
            for i in range(self.num_classes):
                binary_labels = (test_labels == i).astype(int)
                fpr, tpr, _ = roc_curve(binary_labels, predictions[:, i])
                try:
                    class_auc = roc_auc_score(binary_labels, predictions[:, i])
                except ValueError:
                    class_auc = 0.0
                plt.plot(fpr, tpr, label=f'{self.class_names[i]} (AUC = {class_auc:.4f})')

        plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title(f'ROC Curve - {self.display_name}', fontweight='bold')
        plt.legend(loc="lower right")
        plt.tight_layout()
        plt.savefig(os.path.join(self.graphs_dir, "roc_curve.png"), dpi=300)
        plt.close()

    def _plot_pr_curve(self, test_labels: np.ndarray, predictions: np.ndarray):
        plt.figure(figsize=(8, 6))

        if self.num_classes == 2:
            prec_vals, rec_vals, _ = precision_recall_curve(test_labels, predictions[:, 1])
            plt.plot(rec_vals, prec_vals, color='blue', lw=2, label='Precision-Recall')
        else:
            for i in range(self.num_classes):
                binary_labels = (test_labels == i).astype(int)
                prec_vals, rec_vals, _ = precision_recall_curve(binary_labels, predictions[:, i])
                plt.plot(rec_vals, prec_vals, label=f'{self.class_names[i]}')

        plt.xlabel('Recall')
        plt.ylabel('Precision')
        plt.title(f'Precision-Recall Curve - {self.display_name}', fontweight='bold')
        plt.legend(loc="lower left")
        plt.tight_layout()
        plt.savefig(os.path.join(self.graphs_dir, "precision_recall_curve.png"), dpi=300)
        plt.close()

    # ------------------------------------------------------------------
    # Private: Predictions CSV
    # ------------------------------------------------------------------

    def _save_predictions(
        self,
        test_paths: list,
        test_labels: np.ndarray,
        pred_labels: np.ndarray,
        predictions: np.ndarray,
        dataset_root: str,
    ):
        records = []
        for idx, path in enumerate(test_paths):
            rel_path = os.path.relpath(path, dataset_root)
            true_cls = self.class_names[test_labels[idx]]
            pred_cls = self.class_names[pred_labels[idx]]
            conf = float(predictions[idx, pred_labels[idx]])
            probs = {self.class_names[i]: float(predictions[idx, i]) for i in range(self.num_classes)}

            records.append({
                "filename": rel_path,
                "true_class": true_cls,
                "predicted_class": pred_cls,
                "confidence": conf,
                **probs
            })

        df = pd.DataFrame(records)
        path = os.path.join(self.reports_dir, "predictions.csv")
        df.to_csv(path, index=False)
        print(f"  Predictions saved to: {path}")

    # ------------------------------------------------------------------
    # Private: Misclassified images
    # ------------------------------------------------------------------

    def _save_misclassified(
        self,
        test_paths: list,
        test_labels: np.ndarray,
        pred_labels: np.ndarray,
        predictions: np.ndarray,
    ):
        # Clean previous run
        if os.path.exists(self.misclassified_dir):
            shutil.rmtree(self.misclassified_dir)
        os.makedirs(self.misclassified_dir, exist_ok=True)

        count = 0
        for idx in range(len(test_paths)):
            if test_labels[idx] != pred_labels[idx]:
                orig_path = test_paths[idx]
                filename = os.path.basename(orig_path)
                true_cls = self.class_names[test_labels[idx]]
                pred_cls = self.class_names[pred_labels[idx]]
                conf = float(predictions[idx, pred_labels[idx]])
                new_name = f"true_{true_cls}_pred_{pred_cls}_conf_{conf:.2f}_{filename}"
                shutil.copy2(orig_path, os.path.join(self.misclassified_dir, new_name))
                count += 1

        print(f"  Misclassified images ({count}) saved to: {self.misclassified_dir}")
