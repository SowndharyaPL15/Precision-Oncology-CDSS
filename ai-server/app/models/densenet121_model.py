import tensorflow as tf
from tensorflow.keras import layers, models


def build_densenet121(num_classes: int, image_shape: tuple = (224, 224, 3)) -> models.Model:
    """
    Builds and compiles a DenseNet121 transfer learning model.
    The base model weights are frozen. A custom classification head is appended.

    Args:
        num_classes (int): Number of target classes.
        image_shape (tuple): Shape of the input images. Defaults to (224, 224, 3).

    Returns:
        models.Model: Compiled Keras model.
    """
    # 1. Base Model definition (Pre-trained on ImageNet)
    base_model = tf.keras.applications.DenseNet121(
        include_top=False,
        weights='imagenet',
        input_shape=image_shape
    )

    # 2. Freeze base layers to keep pretrained weights intact
    base_model.trainable = False

    # 3. Model construction
    inputs = layers.Input(shape=image_shape)

    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)

    model = models.Model(inputs=inputs, outputs=outputs)

    # 4. Compile the model
    optimizer = tf.keras.optimizers.Adam(learning_rate=1e-4)
    model.compile(
        optimizer=optimizer,
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    return model


def prepare_for_fine_tuning(model: models.Model, unfreeze_layers: int = 40, learning_rate: float = 1e-5) -> models.Model:
    """
    Prepares an existing DenseNet121 model for fine-tuning by unfreezing
    the last `unfreeze_layers` of the base model.

    Args:
        model: The compiled Keras model from Stage 1.
        unfreeze_layers: Number of layers to unfreeze from the end of the base model.
        learning_rate: Learning rate for fine-tuning (usually smaller).

    Returns:
        The recompiled model ready for Stage 2.
    """
    print(f"[INFO] Preparing model for fine-tuning. Unfreezing last {unfreeze_layers} layers...")

    # Locate the base model (it's the first layer that is a Functional/Model layer)
    base_model = None
    for layer in model.layers:
        if isinstance(layer, models.Model):
            base_model = layer
            break

    if base_model is None:
        raise ValueError("Could not find the base model inside the provided model.")

    # Unfreeze the base model
    base_model.trainable = True

    # Freeze all layers except the last `unfreeze_layers`
    for layer in base_model.layers[:-unfreeze_layers]:
        layer.trainable = False

    # Ensure BatchNormalization layers remain frozen to prevent statistics updates
    for layer in base_model.layers:
        if isinstance(layer, layers.BatchNormalization):
            layer.trainable = False

    # Recompile with a smaller learning rate
    optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    print(f"[INFO] Model recompiled with learning_rate={learning_rate}")
    return model
