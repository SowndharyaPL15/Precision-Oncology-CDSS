import tensorflow as tf
from tensorflow.keras import layers, models

def build_efficientnet_b0(num_classes: int, input_shape: tuple = (224, 224, 3)) -> models.Model:
    """
    Builds and compiles an EfficientNetB0 transfer learning model.
    The base model weights are frozen. A custom classification head is appended.
    
    Args:
        num_classes (int): Number of target classes.
        input_shape (tuple): Shape of the input images. Defaults to (224, 224, 3).
        
    Returns:
        models.Model: Compiled Keras model.
    """
    # 1. Base Model definition (Pre-trained on ImageNet)
    base_model = tf.keras.applications.EfficientNetB0(
        include_top=False,
        weights='imagenet',
        input_shape=input_shape
    )
    
    # 2. Freeze base layers to keep pretrained weights intact
    base_model.trainable = False
    
    # 3. Model construction
    inputs = layers.Input(shape=input_shape)
    
    # EfficientNet expects inputs in [0, 255] or [0, 1] depending on pre-processing, 
    # but the Keras applications implementation of EfficientNetB0 has a built-in rescaling 
    # layer (Rescaling(scale=1./255)) when include_top is True/False, OR it doesn't. 
    # Actually, Keras EfficientNet built-in rescaling is:
    # "Note: each Keras Application expects a specific kind of input preprocessing. 
    # For EfficientNet, input preprocessing is included as part of the model (as a Rescaling layer), 
    # so tf.keras.applications.efficientnet.preprocess_input is a placeholder."
    # Since our pipeline already normalizes to [0, 1], and EfficientNet expects normalized values,
    # we can pass our [0, 1] normalized images directly. If it expects [0, 255], the built-in 
    # Rescaling layer handles it inside the architecture.
    
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = models.Model(inputs=inputs, outputs=outputs)
    
    # 4. Compile the model
    optimizer = tf.keras.optimizers.Adam(learning_rate=0.0001)
    model.compile(
        optimizer=optimizer,
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def prepare_for_fine_tuning(model: models.Model, unfreeze_layers: int = 40, learning_rate: float = 1e-5) -> models.Model:
    """
    Prepares an existing EfficientNetB0 model for fine-tuning by unfreezing
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
