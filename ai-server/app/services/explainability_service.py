import os
import shutil
import uuid
import traceback
from app.core.config import settings
from app.core.logging import logger
from app.services.inference_service import inference_service
from app.explainability.gradcam import GradCAMGenerator
from app.processing.histopathology_validator import validate_histopathology_image

class ExplainabilityService:
    def __init__(self):
        # Cache for GradCAMGenerator instances: {(model_name, dataset): generator}
        self.generators = {}
        
    def _get_generator(self, model_name: str, dataset: str) -> GradCAMGenerator:
        key = (model_name, dataset)
        if key in self.generators:
            return self.generators[key]
            
        model = inference_service.load_model(model_name, dataset)
        class_names = inference_service.class_maps[dataset]
        
        logger.info(f"Initializing GradCAMGenerator for {model_name} on {dataset}...")
        generator = GradCAMGenerator(model, class_names)
        self.generators[key] = generator
        return generator

    def generate_explanation(self, model_name: str, dataset: str, image_path: str) -> dict:
        """Generates Grad-CAM visualizations for the given image."""
        # Validate histopathology slide
        is_valid, confidence_score, message, details = validate_histopathology_image(image_path)
        if not is_valid:
            logger.warning(f"Grad-CAM rejected non-histopathology image {image_path}: {message}")
            raise ValueError(f"Non-histopathology image rejected: {message}")

        # Create a unique output directory for this explanation request inside temp_uploads
        request_id = str(uuid.uuid4())
        save_dir = os.path.join(settings.TEMP_UPLOAD_DIR, "explanations", request_id)
        os.makedirs(save_dir, exist_ok=True)
        
        img_name = os.path.basename(image_path).split('.')[0]
        base_url = f"/static/explanations/{request_id}"
        
        try:
            generator = self._get_generator(model_name, dataset)
            logger.info(f"Generating authentic Grad-CAM explanation for {image_path} with {model_name} on {dataset}...")
            result = generator.generate_and_save(image_path, save_dir, true_label=None)
            
            return {
                "predicted_class": result["Predicted Label"],
                "confidence": result["Confidence"],
                "heatmap_path": f"{base_url}/{img_name}_heatmap.png",
                "overlay_path": f"{base_url}/{img_name}_overlay.png",
                "original_path": f"{base_url}/{img_name}_original.png"
            }
        except Exception as e:
            logger.error(f"Grad-CAM generation failed: {e}\n{traceback.format_exc()}")
            raise RuntimeError(f"Grad-CAM generation failed for {model_name} on {dataset}: {str(e)}")

explainability_service = ExplainabilityService()

