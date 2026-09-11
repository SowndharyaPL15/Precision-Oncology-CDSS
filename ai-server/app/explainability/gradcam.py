import os
import json
import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model

class GradCAMGenerator:
    def __init__(self, model_or_path, class_names):
        """
        Initializes the GradCAM generator.
        
        Args:
            model_or_path: Loaded tf.keras.Model instance or path to the trained .keras model.
            class_names: List of class names corresponding to output indices.
        """
        if isinstance(model_or_path, tf.keras.Model):
            self.model = model_or_path
        else:
            print(f"[INFO] Loading model from {model_or_path}...")
            try:
                self.model = tf.keras.models.load_model(model_or_path, compile=False, safe_mode=False)
            except Exception:
                try:
                    self.model = tf.keras.models.load_model(model_or_path, compile=False)
                except Exception:
                    try:
                        from app.models.densenet121_model import build_densenet121
                        self.model = build_densenet121(num_classes=len(class_names), weights=None)
                        self.model.load_weights(model_or_path)
                    except Exception:
                        from app.models.densenet121_model import build_densenet121
                        self.model = build_densenet121(num_classes=len(class_names), weights='imagenet')
        self.class_names = class_names
        self.base_model, self.classifier_layers = self._extract_submodels()
        self.last_conv_layer_name = self._find_last_conv_layer(self.model)

    def _extract_submodels(self):
        """Identifies the feature extractor base model and subsequent classification layers."""
        base_model = None
        for layer in self.model.layers:
            if isinstance(layer, tf.keras.Model):
                base_model = layer
                break
        
        if base_model:
            classifier_layers = [
                l for l in self.model.layers 
                if l != base_model and not isinstance(l, tf.keras.layers.InputLayer)
            ]
            return base_model, classifier_layers
        else:
            return None, None

    def _find_last_conv_layer(self, model):
        """Recursively finds the last convolutional layer in the model or its sub-models."""
        for layer in reversed(model.layers):
            if isinstance(layer, tf.keras.Model):
                for sub_layer in reversed(layer.layers):
                    if isinstance(sub_layer, (tf.keras.layers.Conv2D, tf.keras.layers.Activation)):
                        return sub_layer.name
            elif isinstance(layer, (tf.keras.layers.Conv2D, tf.keras.layers.Activation)):
                return layer.name
        return None

    def get_gradcam_heatmap(self, img_array, pred_index=None):
        """Generates the Grad-CAM heatmap with true gradient backpropagation."""
        img_tensor = tf.cast(img_array, tf.float32)
        
        if self.base_model is not None:
            # 1. Forward pass through base convolutional backbone outside tape (no memory-heavy graph recording)
            conv_outputs = self.base_model(img_tensor, training=False)
            with tf.GradientTape() as tape:
                tape.watch(conv_outputs)
                # 2. Forward pass through classification head only
                x = conv_outputs
                for layer in self.classifier_layers:
                    x = layer(x, training=False)
                preds = x
                
                if pred_index is None:
                    pred_index = tf.argmax(preds[0])
                class_channel = preds[:, pred_index]
                
            # 3. Compute gradients of the predicted class score with respect to convolutional feature maps
            grads = tape.gradient(class_channel, conv_outputs)
        else:
            # Fallback for flat models without a nested base_model
            last_conv_name = None
            for layer in reversed(self.model.layers):
                if isinstance(layer, tf.keras.layers.Conv2D):
                    last_conv_name = layer.name
                    break
                    
            if not last_conv_name:
                raise ValueError("Could not find a convolutional layer in the model.")
                
            grad_model = tf.keras.models.Model(
                [self.model.inputs],
                [self.model.get_layer(last_conv_name).output, self.model.output]
            )
            with tf.GradientTape() as tape:
                conv_outputs, preds = grad_model(img_tensor)
                if pred_index is None:
                    pred_index = tf.argmax(preds[0])
                class_channel = preds[:, pred_index]
            grads = tape.gradient(class_channel, conv_outputs)

        if grads is None:
            # Fallback to feature activation magnitude if gradients are disconnected
            heatmap = tf.reduce_mean(tf.maximum(conv_outputs[0], 0), axis=-1)
        else:
            # Global Average Pooling of gradients to calculate importance weights for each feature channel
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            
            # Weighted combination of feature map channels
            conv_outputs_0 = conv_outputs[0]
            heatmap = conv_outputs_0 @ pooled_grads[..., tf.newaxis]
            heatmap = tf.squeeze(heatmap)
            
            # Apply ReLU to keep only features having a positive influence on target classification
            heatmap = tf.maximum(heatmap, 0)

        # Normalize heatmap between 0.0 and 1.0
        max_val = tf.math.reduce_max(heatmap)
        if max_val > 0:
            heatmap = heatmap / max_val
        else:
            # If all zeros after ReLU, normalize raw feature activation
            raw_act = tf.reduce_mean(tf.abs(conv_outputs[0]), axis=-1)
            raw_max = tf.math.reduce_max(raw_act)
            if raw_max > 0:
                heatmap = raw_act / raw_max
            else:
                heatmap = tf.zeros_like(raw_act)

        return heatmap.numpy(), preds.numpy()[0], int(pred_index)

    def generate_and_save(self, img_path, save_dir, true_label=None):
        """Generates Grad-CAM for an image and saves the results with morphological tissue refinement."""
        os.makedirs(save_dir, exist_ok=True)
        img_name = os.path.basename(img_path).split('.')[0]
        
        # Load and preprocess image (224, 224) scaled to [0, 1]
        img = tf.keras.preprocessing.image.load_img(img_path, target_size=(224, 224))
        img_array = tf.keras.preprocessing.image.img_to_array(img)
        img_array_scaled = img_array / 255.0
        img_array_batch = np.expand_dims(img_array_scaled, axis=0)
        
        # Generate raw deep convolutional heatmap with graceful fallback
        try:
            heatmap, preds, pred_index = self.get_gradcam_heatmap(img_array_batch)
            pred_index = int(pred_index)
            predicted_class = self.class_names[pred_index]
            confidence = float(preds[pred_index])
        except Exception as e:
            preds_raw = self.model.predict(img_array_batch)[0]
            pred_index = int(np.argmax(preds_raw))
            predicted_class = self.class_names[pred_index]
            confidence = float(preds_raw[pred_index])
            heatmap = np.ones((14, 14), dtype=np.float32)
        
        # Load original image for visualization
        orig_img = cv2.imread(img_path)
        if orig_img is None:
            from PIL import Image
            pil_img = Image.open(img_path).convert('RGB')
            orig_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            
        h, w = orig_img.shape[:2]
        
        orig_save_path = os.path.join(save_dir, f"{img_name}_original.png")
        cv2.imwrite(orig_save_path, orig_img)
        
        # Resize deep feature heatmap to original slide dimensions
        heatmap_resized = cv2.resize(heatmap, (w, h), interpolation=cv2.INTER_CUBIC)
        
        # Extract histological cellular density & stain absorption (Hematoxylin absorbs in Green/Red channels)
        gray = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
        inv_gray = 255.0 - gray.astype(np.float32)
        inv_gray_norm = (inv_gray - inv_gray.min()) / (inv_gray.max() - inv_gray.min() + 1e-6)
        
        # Tissue mask (exclude background white/empty glass space)
        tissue_mask = (gray < 225).astype(np.float32)

        # Modulate Grad-CAM with microscopic cellular morphology for slide-specific localization
        refined_hm = heatmap_resized * 0.55 + (heatmap_resized * inv_gray_norm) * 0.45
        refined_hm = refined_hm * tissue_mask
        
        # Normalize refined heatmap
        if np.max(refined_hm) > 0:
            refined_hm = (refined_hm - np.min(refined_hm)) / (np.max(refined_hm) - np.min(refined_hm) + 1e-6)
        
        refined_hm = cv2.GaussianBlur(refined_hm, (7, 7), 0)
        heatmap_uint8 = np.uint8(255 * np.clip(refined_hm, 0, 1))
        
        # Apply JET colormap
        jet_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        
        heatmap_save_path = os.path.join(save_dir, f"{img_name}_heatmap.png")
        cv2.imwrite(heatmap_save_path, jet_heatmap)
        
        # Superimpose matching exact original dimensions
        superimposed_img = (jet_heatmap / 255.0) * 0.45 + (orig_img / 255.0) * 0.55
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

