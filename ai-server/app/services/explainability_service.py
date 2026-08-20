import os
import shutil
import uuid
from app.core.config import settings
from app.core.logging import logger
from app.services.inference_service import inference_service
from app.explainability.gradcam import GradCAMGenerator

class ExplainabilityService:
    def __init__(self):
        # Cache for GradCAMGenerator instances: {(model_name, dataset): generator}
        self.generators = {}
        
    def _get_generator(self, model_name: str, dataset: str) -> GradCAMGenerator:
        key = (model_name, dataset)
        if key in self.generators:
            return self.generators[key]
            
        model_path = inference_service._get_model_path(model_name, dataset)
        class_names = inference_service.class_maps[dataset]
        
        logger.info(f"Initializing GradCAMGenerator for {model_name} on {dataset}...")
        generator = GradCAMGenerator(model_path, class_names)
        self.generators[key] = generator
        return generator

    def generate_explanation(self, model_name: str, dataset: str, image_path: str) -> dict:
        """Generates Grad-CAM visualizations for the given image."""
        generator = self._get_generator(model_name, dataset)
        
        # Create a unique output directory for this explanation request inside temp_uploads
        request_id = str(uuid.uuid4())
        save_dir = os.path.join(settings.TEMP_UPLOAD_DIR, "explanations", request_id)
        os.makedirs(save_dir, exist_ok=True)
        
        logger.info(f"Generating Grad-CAM explanation for {image_path}...")
        
        # The generator saves files and returns metadata
        result = generator.generate_and_save(image_path, save_dir, true_label=None)
        
        # Map absolute paths back to relative static URLs (assume /static points to TEMP_UPLOAD_DIR)
        img_name = os.path.basename(image_path).split('.')[0]
        base_url = f"/static/explanations/{request_id}"
        
        return {
            "predicted_class": result["Predicted Label"],
            "confidence": result["Confidence"],
            "heatmap_path": f"{base_url}/{img_name}_heatmap.png",
            "overlay_path": f"{base_url}/{img_name}_overlay.png",
            "original_path": f"{base_url}/{img_name}_original.png"
        }

explainability_service = ExplainabilityService()
