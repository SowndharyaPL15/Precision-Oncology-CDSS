import os
import shutil
import uuid
from PIL import Image
from app.core.config import settings
from app.core.logging import logger
from app.services.inference_service import inference_service
from app.services.explainability_service import explainability_service
from app.schemas.requests import PatientInfoSchema

class ReportService:
    def generate_report(self, model_name: str, dataset: str, image_path: str, patient_info: PatientInfoSchema) -> dict:
        """Orchestrates prediction and conditional explainability to generate a comprehensive clinical report."""
        
        # 1. Run Inference
        prediction = inference_service.predict(model_name, dataset, image_path)
        pred_class = prediction["predicted_class"]
        
        is_cancer = (
            (dataset == "breast" and pred_class == "malignant") or
            (dataset == "lung" and pred_class in ["lung_aca", "lung_scc"])
        )
        
        # 2. Conditional Explainability: Only generate Grad-CAM heatmaps for cancer cases
        if is_cancer:
            logger.info(f"Malignancy detected ({pred_class}). Generating deep Grad-CAM explanation...")
            gradcam = explainability_service.generate_explanation(model_name, dataset, image_path, target_class=pred_class)
            gradcam["is_cancer"] = True
        else:
            logger.info(f"Non-cancerous/Normal tissue detected ({pred_class}). Grad-CAM omitted as per clinical protocol.")
            # Save original image for report viewing without generating heatmaps
            request_id = str(uuid.uuid4())
            save_dir = os.path.join(settings.TEMP_UPLOAD_DIR, "explanations", request_id)
            os.makedirs(save_dir, exist_ok=True)
            
            ext = os.path.splitext(image_path)[1] or ".png"
            img_name = os.path.basename(image_path).split('.')[0]
            dest_orig = os.path.join(save_dir, f"{img_name}_original{ext}")
            shutil.copyfile(image_path, dest_orig)
            
            base_url = f"/static/explanations/{request_id}"
            gradcam = {
                "predicted_class": pred_class,
                "confidence": prediction["confidence"],
                "original_path": f"{base_url}/{img_name}_original{ext}",
                "heatmap_path": None,
                "overlay_path": None,
                "is_cancer": False,
                "message": "Normal / Non-malignant tissue confirmed. Grad-CAM visual heatmaps are not indicated for normal tissue."
            }
        
        # 3. Formulate Highly Specific Clinical Recommendation
        recommendation = self._generate_recommendation_multimodal(dataset, pred_class, prediction["confidence"], patient_info)
        
        # 4. Formulate Combined AI Diagnostic Summary narrative
        diagnostic_summary = self._generate_diagnostic_summary(dataset, prediction, patient_info)

        # 5. Compute Dynamic Clinical Risk Score
        risk_score = self._compute_risk_score(dataset, pred_class, patient_info)
        
        report = {
            "patient_info": patient_info.model_dump() if patient_info else None,
            "prediction": prediction,
            "gradcam": gradcam,
            "recommendation": recommendation,
            "diagnostic_summary": diagnostic_summary,
            "risk_score": risk_score,
            "is_cancer": is_cancer
        }
        
        return report

    def _compute_risk_score(self, dataset: str, predicted_class: str, patient_info: PatientInfoSchema) -> dict:
        """
        Computes a structured clinical risk score from AI prediction + patient factors.
        Returns score, max_score, risk_level, and a per-factor breakdown list.
        """
        factors = []

        # Age > 55
        age_points = 0
        age_max = 2
        if patient_info and patient_info.age and patient_info.age > 55:
            age_points = 2
        factors.append({
            "label": "Age > 55",
            "points": age_points,
            "max": age_max,
            "triggered": age_points > 0,
            "value": str(patient_info.age) if patient_info and patient_info.age else "Unknown",
        })

        # Family History of Cancer
        fh_points = 0
        fh_max = 2
        if patient_info and patient_info.family_history and patient_info.family_history.lower() == "yes":
            fh_points = 2
        factors.append({
            "label": "Family History of Cancer",
            "points": fh_points,
            "max": fh_max,
            "triggered": fh_points > 0,
            "value": patient_info.family_history if patient_info and patient_info.family_history else "Unknown",
        })

        # Symptoms Present
        sym_points = 0
        sym_max = 2
        if patient_info and patient_info.symptoms and patient_info.symptoms.strip().lower() not in ("", "none", "n/a"):
            sym_points = 2
        factors.append({
            "label": "Clinical Symptoms Present",
            "points": sym_points,
            "max": sym_max,
            "triggered": sym_points > 0,
            "value": patient_info.symptoms if patient_info and patient_info.symptoms else "None",
        })

        # Previous Cancer History
        pch_points = 0
        pch_max = 2
        if patient_info and patient_info.previous_cancer_history and patient_info.previous_cancer_history.lower() == "yes":
            pch_points = 2
        factors.append({
            "label": "Previous Cancer History",
            "points": pch_points,
            "max": pch_max,
            "triggered": pch_points > 0,
            "value": patient_info.previous_cancer_history if patient_info and patient_info.previous_cancer_history else "No",
        })

        if dataset == "breast":
            # BRCA Mutation
            brca_points = 0
            brca_max = 3
            if patient_info and patient_info.brca_status and patient_info.brca_status.lower() == "positive":
                brca_points = 3
            factors.append({
                "label": "BRCA Mutation Positive",
                "points": brca_points,
                "max": brca_max,
                "triggered": brca_points > 0,
                "value": patient_info.brca_status if patient_info and patient_info.brca_status else "Unknown",
            })

            # Menopause Status (post-menopausal = elevated risk)
            mp_points = 0
            mp_max = 1
            if patient_info and patient_info.menopause_status and "post" in patient_info.menopause_status.lower():
                mp_points = 1
            factors.append({
                "label": "Post-Menopausal Status",
                "points": mp_points,
                "max": mp_max,
                "triggered": mp_points > 0,
                "value": patient_info.menopause_status if patient_info and patient_info.menopause_status else "Unknown",
            })

        elif dataset == "lung":
            # Smoking History
            sm_points = 0
            sm_max = 3
            if patient_info and patient_info.smoking_history:
                sh = patient_info.smoking_history.lower()
                if "current" in sh:
                    sm_points = 3
                elif "former" in sh:
                    sm_points = 2
            factors.append({
                "label": "Smoking History",
                "points": sm_points,
                "max": sm_max,
                "triggered": sm_points > 0,
                "value": patient_info.smoking_history if patient_info and patient_info.smoking_history else "Never",
            })

        # AI Prediction (highest weight)
        ai_points = 0
        ai_max = 5
        is_malignant = (
            (dataset == "breast" and predicted_class == "malignant") or
            (dataset == "lung" and predicted_class in ["lung_aca", "lung_scc"])
        )
        if is_malignant:
            ai_points = 5
        factors.append({
            "label": "AI Prediction — Malignant",
            "points": ai_points,
            "max": ai_max,
            "triggered": ai_points > 0,
            "value": "Malignant" if is_malignant else "Benign / Normal",
        })

        total = sum(f["points"] for f in factors)
        max_total = sum(f["max"] for f in factors)
        pct = (total / max_total * 100) if max_total > 0 else 0

        if pct >= 75:
            level = "CRITICAL"
            color = "danger"
        elif pct >= 50:
            level = "HIGH"
            color = "warning"
        elif pct >= 25:
            level = "MODERATE"
            color = "info"
        else:
            level = "LOW"
            color = "success"

        return {
            "score": total,
            "max_score": max_total,
            "percentage": round(pct, 1),
            "level": level,
            "color": color,
            "factors": factors,
        }

    def _generate_recommendation_multimodal(self, dataset: str, predicted_class: str, confidence: float, patient_info: PatientInfoSchema) -> str:
        """Generates a granular, highly specific clinical suggestion combining AI histology and patient profile."""
        
        # Extract clinical features
        age = patient_info.age if (patient_info and patient_info.age) else 45
        has_family_hx = patient_info.family_history.lower() == "yes" if (patient_info and patient_info.family_history) else False
        symptoms = patient_info.symptoms.strip() if (patient_info and patient_info.symptoms) else ""
        has_symptoms = bool(symptoms and symptoms.lower() not in ["none", "n/a", "nil", "no"])
        brca_pos = patient_info.brca_status.lower() == "positive" if (patient_info and patient_info.brca_status) else False
        smoking = patient_info.smoking_history.lower() if (patient_info and patient_info.smoking_history) else "never"
        is_smoker = "current" in smoking or "former" in smoking

        # =========================================================================
        # BREAST CANCER RECOMMENDATIONS
        # =========================================================================
        if dataset == "breast":
            if predicted_class == "malignant":
                if brca_pos:
                    return (
                        "CRITICAL ONCOLOGY REFERRAL (BRCA-Positive Invasive Breast Carcinoma): "
                        "Histopathological morphology demonstrates invasive ductal carcinoma features. "
                        "Given confirmed positive BRCA1/2 genetic status, recommend: "
                        "(1) Immediate multi-disciplinary tumor board (MDT) consultation for comprehensive surgical planning (discussion of bilateral skin-sparing mastectomy vs. lumpectomy + radiation); "
                        "(2) Mandatory reflex Immunohistochemistry (IHC) panel for ER, PR, HER2-neu receptor quantification and Ki-67 proliferation index; "
                        "(3) Bilateral diagnostic digital tomosynthesis and dynamic contrast-enhanced breast MRI for multifocal staging; "
                        "(4) Evaluation for targeted PARP inhibitor therapy (e.g. Olaparib) and formal genetic counseling for immediate first-degree relatives."
                    )
                elif has_family_hx:
                    return (
                        "URGENT ONCOLOGY CONSULTATION (Familial High-Risk Malignancy): "
                        "Histopathology indicates Invasive Ductal Carcinoma (IDC). "
                        "Due to concordant familial cancer history, recommend: "
                        "(1) Core needle biopsy immunohistochemistry (ER/PR/HER2/Ki-67 profiling) to determine intrinsic molecular subtype; "
                        "(2) Axillary lymph node staging via high-frequency ultrasound and sentinel node biopsy planning; "
                        "(3) Whole-body FDG PET-CT or contrast CT (chest/abdomen/pelvis) for distant metastatic staging; "
                        "(4) Referral for germline multi-gene hereditary cancer panel testing."
                    )
                else:
                    return (
                        "ONCOLOGY STAGING & SURGICAL WORKUP (Invasive Breast Carcinoma): "
                        "Histopathological features confirm malignant breast carcinoma. "
                        "Recommended clinical management: "
                        "(1) IHC receptor status testing (ER, PR, HER2-neu score) and Oncotype DX recurrence score if node-negative; "
                        "(2) Ipsilateral axillary ultrasound to rule out regional nodal metastasis; "
                        "(3) Baseline contrast staging imaging (CT Chest/Abdomen and bone scintigraphy); "
                        "(4) Surgical oncology review for upfront partial mastectomy vs. neoadjuvant systemic chemotherapy."
                    )
            else: # BENIGN
                if brca_pos:
                    return (
                        "HIGH-RISK SURVEILLANCE PROTOCOL (Benign Histology with BRCA Positive Status): "
                        "Histopathology demonstrates benign breast parenchyma with no evidence of invasive malignancy. "
                        "However, due to positive BRCA genetic mutation carrier status, recommend: "
                        "(1) Enhanced high-risk breast screening with annual contrast breast MRI alternating with 3D digital mammography every 6 months; "
                        "(2) Clinical breast examination by a breast specialist every 6 to 12 months; "
                        "(3) Counseling regarding chemoprevention options (selective estrogen receptor modulators) and risk-reducing prophylactic procedures."
                    )
                elif has_symptoms:
                    return (
                        "BENIGN HISTOPATHOLOGY WITH SYMPTOM MONITORING: "
                        f"Microscopic biopsy confirms benign breast tissue architecture (e.g., fibroadenoma / fibrocystic changes) with no malignant cellular atypia. "
                        f"To address presenting symptoms ({symptoms}), recommend: "
                        "(1) Targeted high-resolution ultrasound correlation to confirm concordance with palpated findings; "
                        "(2) Clinical reassessment in 3 to 6 months (BI-RADS 3 surveillance); "
                        "(3) If focal pain or palpable changes progress, consider repeat core sampling or excisional biopsy."
                    )
                else:
                    return (
                        "ROUTINE PREVENTATIVE SCREENING (Concordant Benign Breast Tissue): "
                        "Histopathological analysis demonstrates well-differentiated, non-malignant lobular and ductal architecture with no microcalcifications or dysplasia. "
                        "Recommend: "
                        "(1) Reassurance of benign status; "
                        "(2) Continuation of standard age-appropriate screening mammography every 1 to 2 years (BI-RADS 2 routine protocol); "
                        "(3) Monthly self-breast awareness."
                    )

        # =========================================================================
        # LUNG CANCER RECOMMENDATIONS
        # =========================================================================
        else: # dataset == "lung"
            if predicted_class == "lung_aca":
                return (
                    "URGENT THORACIC ONCOLOGY REFERRAL (Primary Lung Adenocarcinoma): "
                    "Histopathological section demonstrates malignant glandular architecture and invasive cytology characteristic of Lung Adenocarcinoma. "
                    "Recommended clinical pathway: "
                    "(1) Comprehensive molecular biomarker reflex NGS testing: EGFR mutations (Exon 19 del/L858R), ALK fusions, ROS1, BRAF V600E, KRAS G12C, RET, MET exon 14, and PD-L1 TPS; "
                    "(2) Contrast-enhanced chest/upper abdomen CT and whole-body 18F-FDG PET-CT for TNM staging; "
                    "(3) Contrast brain MRI to rule out asymptomatic intracranial oligometastases; "
                    "(4) Multidisciplinary thoracic tumor board review for targeted TKI therapy (e.g. Osimertinib), immunotherapy, or video-assisted thoracoscopic surgery (VATS) lobectomy."
                )
            elif predicted_class == "lung_scc":
                return (
                    "URGENT THORACIC ONCOLOGY REFERRAL (Squamous Cell Lung Carcinoma): "
                    "Histopathology displays keratin pearls, intercellular bridges, and malignant squamous proliferation consistent with Squamous Cell Lung Carcinoma. "
                    "Recommended clinical pathway: "
                    "(1) Immediate contrast-enhanced chest CT and Endobronchial Ultrasound (EBUS-TBNA) for mediastinal lymph node staging; "
                    "(2) Whole-body PET-CT to evaluate systemic disease extent; "
                    "(3) PD-L1 immunohistochemistry for first-line immune checkpoint inhibitor selection (e.g. Pembrolizumab); "
                    "(4) Pulmonology review for pulmonary function testing (PFT/DLCO) and structured tobacco cessation therapy."
                )
            else: # lung_n (Normal / Benign)
                if is_smoker or has_symptoms:
                    sym_text = f" and presenting symptoms ({symptoms})" if symptoms else ""
                    return (
                        "NORMAL LUNG HISTOLOGY WITH TARGETED PULMONARY WORKUP: "
                        "Microscopic biopsy confirms normal pulmonary parenchyma, intact alveolar walls, and absence of neoplastic atypia. "
                        f"However, considering smoking history ({smoking}){sym_text}, recommend: "
                        "(1) Annual Low-Dose Computed Tomography (LDCT) chest screening to exclude non-sampled peripheral or ground-glass nodules; "
                        "(2) Sputum cytology and spirometry evaluation if persistent cough or respiratory discomfort continues; "
                        "(3) Structured clinical smoking cessation program; "
                        "(4) Follow-up clinical examination in 6 months."
                    )
                else:
                    return (
                        "NORMAL PULMONARY PARENCHYMA (No Malignancy Detected): "
                        "Histological evaluation demonstrates unremarkable pulmonary alveoli and respiratory epithelium with no signs of malignant proliferation or acute inflammation. "
                        "Recommend: "
                        "(1) Reassurance of normal pathology; "
                        "(2) Standard preventative health maintenance; "
                        "(3) Routine periodic clinical wellness visits."
                    )

    def _generate_diagnostic_summary(self, dataset: str, prediction: dict, patient_info: PatientInfoSchema) -> str:
        """Combines image prediction, confidence score, and patient clinical info into a unified clinical narrative."""
        pred_class = prediction["predicted_class"]
        confidence_pct = prediction["confidence"] * 100
        
        if dataset == "breast":
            display_class = "Invasive Ductal Carcinoma (Malignant)" if pred_class == "malignant" else "Benign Breast Tissue"
        else:
            display_class = "Lung Adenocarcinoma" if pred_class == "lung_aca" else ("Squamous Cell Lung Carcinoma" if pred_class == "lung_scc" else "Normal Pulmonary Parenchyma")
            
        summary = f"The histopathological biopsy image is classified as {display_class} with an AI confidence score of {confidence_pct:.1f}%. "
        
        if patient_info:
            profile_items = [f"Age {patient_info.age}", f"Gender {patient_info.gender}"]
            if patient_info.family_history:
                profile_items.append(f"Family History of Cancer: {patient_info.family_history}")
            if dataset == "breast" and patient_info.menopause_status:
                profile_items.append(f"Menopause: {patient_info.menopause_status}")
            if dataset == "breast" and patient_info.brca_status:
                profile_items.append(f"BRCA: {patient_info.brca_status}")
            if dataset == "lung" and patient_info.smoking_history:
                profile_items.append(f"Smoking: {patient_info.smoking_history}")
            if patient_info.symptoms:
                profile_items.append(f"Reported Symptoms: '{patient_info.symptoms}'")
                
            summary += f"Patient Context: {', '.join(profile_items)}."
                    
        return summary

report_service = ReportService()
