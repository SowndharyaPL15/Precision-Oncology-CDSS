import os
import json
import cv2
import numpy as np
import tensorflow as tf
import matplotlib.cm as cm
import pandas as pd
from tensorflow.keras.models import load_model

class GradCAMGenerator:
    def __init__(self, model_path, class_names):
        """
        Initializes the GradCAM generator.
        
        Args:
            model_path: Path to the trained .keras model.
            class_names: List of class names corresponding to output indices.
        """
        print(f"[INFO] Loading model from {model_path}...")
        self.model = load_model(model_path)
        self.class_names = class_names
        self.last_conv_layer_name = self._find_last_conv_layer(self.model)
        
        if not self.last_conv_layer_name:
            raise ValueError("Could not find a convolutional layer in the provided model.")
        print(f"[INFO] Automatically detected final conv layer: {self.last_conv_layer_name}")

    def _find_last_conv_layer(self, model):
        """Recursively finds the last convolutional layer in the model or its sub-models."""
        # Check sub-models first (like the base_model inside our custom head)
        for layer in reversed(model.layers):
            if isinstance(layer, tf.keras.Model):
                # We found a sub-model (like ResNet50, EfficientNet), search inside it
                for sub_layer in reversed(layer.layers):
                    if isinstance(sub_layer, tf.keras.layers.Conv2D):
                        return sub_layer.name
            elif isinstance(layer, tf.keras.layers.Conv2D):
                return layer.name
        return None

    def _get_inner_model(self):
        """Helper to return the inner base model if wrapped in our custom architecture."""
        for layer in self.model.layers:
            if isinstance(layer, tf.keras.Model):
                return layer
        return self.model

    def get_gradcam_heatmap(self, img_array, pred_index=None):
        """Generates the Grad-CAM heatmap."""
        inner_model = self._get_inner_model()
        
        grad_model = tf.keras.models.Model(
            [inner_model.inputs],
            [inner_model.get_layer(self.last_conv_layer_name).output, inner_model.output]
        )
        
        # If wrapped, we need the full model graph
        # Actually, if the model has a custom head, we should trace the gradients from the final output.
        # So we build a custom gradient model mapping main inputs to both last conv layer and final predictions.
        
        # To do this safely for transfer learning models where base_model is a layer:
        # 1. Input -> base_model -> GlobalAvgPool -> Dense -> Output
        last_conv_layer = inner_model.get_layer(self.last_conv_layer_name)
        
        # We need a model that outputs both the last conv layer and the final predictions.
        # Since the base model is nested, it's tricky. Let's do it using GradientTape directly 
        # on the full model, but capturing the intermediate output.
        
        # We will redefine the grad_model to output the intermediate activation from the base model
        # and the final prediction from the full model.
        
        # Create a model that extracts the intermediate output from the base model
        intermediate_model = tf.keras.models.Model(
            inner_model.inputs,
            inner_model.get_layer(self.last_conv_layer_name).output
        )
        
        with tf.GradientTape() as tape:
            # Watch the intermediate output
            inputs = tf.cast(img_array, tf.float32)
            
            # Forward pass through the base model up to the conv layer
            # Wait, this is getting complex. Let's use the standard approach but handle nested models.
            pass

        # Let's use a simpler, robust approach for nested models:
        # We extract the base model, and the classifier part.
        
        base_model = self._get_inner_model()
        
        # Create a model mapping base_model input to base_model last conv layer
        conv_model = tf.keras.Model(
            base_model.inputs, 
            base_model.get_layer(self.last_conv_layer_name).output
        )
        
        with tf.GradientTape() as tape:
            # We need the output of the full model, so we run the full model, 
            # but we need to watch the conv output.
            
            # Since the full model just calls base_model(inputs), we can't easily intercept it.
            # Instead, let's just use the full model, but we need to create a new model 
            # that outputs both the conv layer and the final output.
            
            # If base_model is a layer in self.model:
            # We can't easily extract a sub-graph that crosses the boundary.
            pass
            
        # OK, let's use the standard tf.GradientTape approach by temporarily modifying the model 
        # or using the standard Keras way:
        
        # Let's find the base model layer
        base_model_layer = None
        for layer in self.model.layers:
            if isinstance(layer, tf.keras.Model):
                base_model_layer = layer
                break
                
        if base_model_layer:
            # Create a model that outputs the conv layer from the base model
            grad_base = tf.keras.Model(
                base_model_layer.inputs,
                [base_model_layer.get_layer(self.last_conv_layer_name).output, base_model_layer.output]
            )
            
            with tf.GradientTape() as tape:
                conv_outputs, base_predictions = grad_base(img_array)
                tape.watch(conv_outputs)
                
                # Now pass base_predictions through the rest of the main model
                x = base_predictions
                for layer in self.model.layers:
                    if layer == base_model_layer or isinstance(layer, tf.keras.layers.InputLayer):
                        continue
                    x = layer(x)
                preds = x
                
                if pred_index is None:
                    pred_index = tf.argmax(preds[0])
                class_channel = preds[:, pred_index]
                
            grads = tape.gradient(class_channel, conv_outputs)
            
        else:
            # Flat model
            grad_model = tf.keras.models.Model(
                [self.model.inputs],
                [self.model.get_layer(self.last_conv_layer_name).output, self.model.output]
            )
            with tf.GradientTape() as tape:
                conv_outputs, preds = grad_model(img_array)
                if pred_index is None:
                    pred_index = tf.argmax(preds[0])
                class_channel = preds[:, pred_index]
            grads = tape.gradient(class_channel, conv_outputs)

        # Average gradients spatially
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # Multiply each channel by its gradient importance
        conv_outputs = conv_outputs[0]
        heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        
        # ReLU to keep only positive influences
        heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
        return heatmap.numpy(), preds.numpy()[0], pred_index

    def generate_and_save(self, img_path, save_dir, true_label=None):
        """Generates Grad-CAM for an image and saves the results."""
        os.makedirs(save_dir, exist_ok=True)
        img_name = os.path.basename(img_path).split('.')[0]
        
        # Load and preprocess image
        img = tf.keras.preprocessing.image.load_img(img_path, target_size=(224, 224))
        img_array = tf.keras.preprocessing.image.img_to_array(img)
        
        # Important: Scale to [0, 1] if that's what the model expects
        # Our pipeline uses Rescaling(1./255), so we must apply it here!
        img_array_scaled = img_array / 255.0
        img_array_batch = np.expand_dims(img_array_scaled, axis=0)
        
        # Generate heatmap
        heatmap, preds, pred_index = self.get_gradcam_heatmap(img_array_batch)
        pred_index = int(pred_index)
        
        predicted_class = self.class_names[pred_index]
        confidence = float(preds[pred_index])
        
        # Save original image
        orig_img = cv2.imread(img_path)
        orig_img = cv2.resize(orig_img, (224, 224))
        
        orig_save_path = os.path.join(save_dir, f"{img_name}_original.png")
        cv2.imwrite(orig_save_path, orig_img)
        
        # Create and save heatmap
        heatmap_resized = cv2.resize(heatmap, (orig_img.shape[1], orig_img.shape[0]))
        heatmap_uint8 = np.uint8(255 * heatmap_resized)
        
        # Apply colormap using OpenCV directly instead of matplotlib
        jet_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        
        heatmap_save_path = os.path.join(save_dir, f"{img_name}_heatmap.png")
        cv2.imwrite(heatmap_save_path, jet_heatmap)
        
        # Superimpose
        superimposed_img = (jet_heatmap / 255.0) * 0.4 + (orig_img / 255.0) * 0.6
        superimposed_img = np.clip(superimposed_img, 0, 1)
        
        overlay_save_path = os.path.join(save_dir, f"{img_name}_overlay.png")
        cv2.imwrite(overlay_save_path, np.uint8(255 * superimposed_img))
        
        # Save JSON
        json_data = {
            "image": os.path.basename(img_path),
            "predicted_class": predicted_class,
            "confidence": confidence,
            "true_class": true_label if true_label else "Unknown"
        }
        
        json_save_path = os.path.join(save_dir, f"{img_name}_prediction.json")
        with open(json_save_path, "w") as f:
            json.dump(json_data, f, indent=4)
            
        return {
            "Image Name": os.path.basename(img_path),
            "True Label": true_label if true_label else "Unknown",
            "Predicted Label": predicted_class,
            "Confidence": confidence,
            "Heatmap Path": heatmap_save_path,
            "Overlay Path": overlay_save_path
        }
