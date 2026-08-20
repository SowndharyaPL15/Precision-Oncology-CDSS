import os
import argparse
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split

from app.processing.image_preprocessor import PreprocessingConfig, DataPipelineBuilder
from app.models.resnet50_model import build_resnet50, prepare_for_fine_tuning
from app.core.training_engine import TrainingEngine

def main():
    parser = argparse.ArgumentParser(description="Train ResNet50 on Breast Cancer Dataset")
    parser.add_argument("--mode", type=str, default="verification", choices=["verification", "final"])
    parser.add_argument("--epochs", type=int, default=None)
    args = parser.parse_args()

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dataset_path = os.path.join(project_root, "datasets", "BreaKHis 400X")
    
    config = PreprocessingConfig()
    builder = DataPipelineBuilder(
        config=config,
        dataset_name="Breast Cancer (BreaKHis 400X)",
        root_dir=dataset_path
    )

    train_dir = os.path.join(dataset_path, "train")
    test_dir = os.path.join(dataset_path, "test")

    train_paths, train_labels = builder._collect_files_from_class_dirs(train_dir)
    test_paths, test_labels = builder._collect_files_from_class_dirs(test_dir)

    train_labels = np.array(train_labels)
    test_labels = np.array(test_labels)
    num_classes = len(builder.class_names)

    if args.mode == "verification":
        _, train_paths, _, train_labels = train_test_split(
            train_paths, train_labels, test_size=0.10, stratify=train_labels, random_state=config.seed
        )
        _, test_paths, _, test_labels = train_test_split(
            test_paths, test_labels, test_size=0.10, stratify=test_labels, random_state=config.seed
        )
        epochs = args.epochs if args.epochs is not None else 2
    else:
        epochs = args.epochs if args.epochs is not None else 20

    train_paths, val_paths, train_labels, val_labels = train_test_split(
        train_paths, train_labels, test_size=config.validation_split, stratify=train_labels, random_state=config.seed
    )

    split_counts = {
        "train": len(train_paths),
        "validation": len(val_paths),
        "test": len(test_paths),
    }

    class_weights = builder._compute_class_weights(train_labels)

    train_ds = builder._build_tf_dataset(train_paths, train_labels, augment=True)
    val_ds = builder._build_tf_dataset(val_paths, val_labels, augment=False)
    test_ds = builder._build_tf_dataset(test_paths, test_labels, augment=False)

    train_ds = train_ds.map(lambda x, y: (x, tf.one_hot(y, num_classes)), num_parallel_calls=tf.data.AUTOTUNE)
    val_ds = val_ds.map(lambda x, y: (x, tf.one_hot(y, num_classes)), num_parallel_calls=tf.data.AUTOTUNE)
    test_ds = test_ds.map(lambda x, y: (x, tf.one_hot(y, num_classes)), num_parallel_calls=tf.data.AUTOTUNE)

    # Init engine
    engine = TrainingEngine(
        model_name="resnet50",
        dataset_key="breast",
        display_name="Breast Cancer (BreaKHis 400X)",
        num_classes=num_classes,
        class_names=builder.class_names,
        class_weights=class_weights,
        mode=args.mode,
        epochs=epochs,
        project_root=project_root,
    )

    engine.save_training_config(split_counts)

    model = build_resnet50(num_classes=num_classes)
    
    # Stage 1
    h1 = engine.train_stage1(model, train_ds, val_ds)
    
    # Stage 2
    h2 = engine.train_stage2(model, train_ds, val_ds, prepare_for_fine_tuning)
    
    # Evaluation
    metrics = engine.evaluate(model, test_ds, test_labels, test_paths, dataset_path)
    engine.save_training_summary(h1, h2)
    engine.plot_training_curves(h1, h2)
    
    print("\n[SUCCESS] Pipeline Complete.")

if __name__ == "__main__":
    main()
