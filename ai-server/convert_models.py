import os
import glob
import gc

def convert_all_models():
    """Converts all existing Keras models to quantized TFLite models during build time to ensure <20MB RAM usage at runtime."""
    import tensorflow as tf
    os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

    search_dirs = [
        "models",
        "../models",
        os.path.join(os.path.dirname(__file__), "..", "models")
    ]

    keras_files = []
    for sdir in search_dirs:
        if os.path.isdir(sdir):
            found = glob.glob(os.path.join(sdir, "**", "*.keras"), recursive=True)
            for f in found:
                abs_f = os.path.abspath(f)
                if abs_f not in keras_files:
                    keras_files.append(abs_f)

    print(f"[BUILD OPTIMIZER] Found {len(keras_files)} Keras model files to quantize.")

    for kf in keras_files:
        out_tflite = os.path.join(os.path.dirname(kf), "model_quantized.tflite")
        if os.path.exists(out_tflite) and os.path.getsize(out_tflite) > 1024:
            print(f"[BUILD OPTIMIZER] Quantized TFLite already present: {out_tflite}")
            continue

        try:
            print(f"[BUILD OPTIMIZER] Quantizing {kf} -> {out_tflite}...")
            model = tf.keras.models.load_model(kf, compile=False)
            converter = tf.lite.TFLiteConverter.from_keras_model(model)
            converter.optimizations = [tf.lite.Optimize.DEFAULT]
            tflite_model = converter.convert()
            with open(out_tflite, "wb") as f:
                f.write(tflite_model)
            size_mb = round(len(tflite_model) / (1024 * 1024), 2)
            print(f"[BUILD OPTIMIZER] ✓ Successfully created {out_tflite} ({size_mb} MB)")
            del model
            del tflite_model
            tf.keras.backend.clear_session()
            gc.collect()
        except Exception as e:
            print(f"[BUILD OPTIMIZER] ⚠️ Note on {kf}: {e}")

if __name__ == "__main__":
    convert_all_models()
