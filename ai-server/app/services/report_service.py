import json
from app.services.inference_service import inference_service
from app.services.explainability_service import explainability_service
from app.schemas.requests import PatientInfoSchema

class ReportService:
    def generate_report(self, model_name: str, dataset: str, image_path: str, patient_info: PatientInfoSchema) -> dict:
        """Orchestrates prediction and explanation to generate a comprehensive clinical report."""
        
        # 1. Run Inference
        prediction = inference_service.predict(model_name, dataset, image_path)
        
        # 2. Run Explainability
        gradcam = explainability_service.generate_explanation(model_name, dataset, image_path)
        
        # 3. Formulate Recommendation based on both prediction and clinical details
        recommendation = self._generate_recommendation_multimodal(dataset, prediction["predicted_class"], prediction["confidence"], patient_info)
        
        # 4. Formulate Combined AI Diagnostic Summary narrative
        diagnostic_summary = self._generate_diagnostic_summary(dataset, prediction, patient_info)

        # 5. Compute Dynamic Clinical Risk Score
        risk_score = self._compute_risk_score(dataset, prediction["predicted_class"], patient_info)
        
        report = {
            "patient_info": patient_info.model_dump() if patient_info else None,
            "prediction": prediction,
            "gradcam": gradcam,
            "recommendation": recommendation,
            "diagnostic_summary": diagnostic_summary,
            "risk_score": risk_score,
        }
        
        return report

    def _compute_risk_score(self, dataset: str, predicted_class: str, patient_info: PatientInfoSchema) -> dict:
        """
        Computes a structured clinical risk score from AI prediction + patient factors.
        Returns score, max_score, risk_level, and a per-factor breakdown list.
        """
        factors = []

        # ── Shared factors ─────────────────────────────────────────────────────
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

        # ── Dataset-specific factors ────────────────────────────────────────────
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

        # ── AI Prediction (highest weight) ─────────────────────────────────────
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

        # ── Totals & Level ──────────────────────────────────────────────────────
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
        """Generates a multimodal rule-based recommendation combining AI prediction and clinical details."""
        is_malignant = False
        if dataset == "breast" and predicted_class == "malignant":
            is_malignant = True
        elif dataset == "lung" and predicted_class in ["lung_aca", "lung_scc"]:
            is_malignant = True

        family_history_pos = False
        if patient_info and patient_info.family_history and patient_info.family_history.lower() == "yes":
            family_history_pos = True

        has_symptoms = False
        if patient_info and patient_info.symptoms and len(patient_info.symptoms.strip()) > 0 and patient_info.symptoms.lower() != "none":
            has_symptoms = True

        brca_pos = False
        if patient_info and patient_info.brca_status and patient_info.brca_status.lower() == "positive":
            brca_pos = True

        # Rule 1: Malignant + BRCA Positive (Highest Risk)
        if is_malignant and brca_pos:
            return "URGENT ONCOLOGY CONSULTATION REQUIRED: Malignancy confirmed alongside positive BRCA mutation status. Recommend immediate clinical staging, genetic counseling, and priority therapeutic planning."

        # Rule 2: Malignant + Positive Family History
        if is_malignant and family_history_pos:
            return "Urgent oncology consultation, clinical staging check-ups, and immediate histopathological biopsy confirmation recommended due to combined positive malignancy prediction and familial risk factors."

        # Rule 3: Malignant + Standard History
        if is_malignant:
            return "Malignancy detected. Recommend immediate oncologist referral, diagnostic biopsy correlation, and chest/breast imaging follow-up."

        # Rule 4: Benign + BRCA Positive (Precautionary Surveillance)
        if not is_malignant and brca_pos:
            return "AI prediction indicates Benign; however, given positive BRCA mutation status, recommend intensive surveillance, semi-annual imaging, and preventative clinical management."

        # Rule 5: Benign + Severe/Present Symptoms
        if not is_malignant and has_symptoms:
            return "AI prediction indicates Benign; however, due to active clinical symptoms, recommend closer follow-up examination, correlation with clinical findings, and potential repeat biopsy within 3-6 months to exclude false negatives."

        # Rule 6: Benign + No Risk Factors
        return "Benign characteristics observed with no presenting clinical risk symptoms. Continue routine clinical screening and standard surveillance intervals."

    def _generate_diagnostic_summary(self, dataset: str, prediction: dict, patient_info: PatientInfoSchema) -> str:
        """Combines image prediction, confidence score, and patient clinical info into a unified clinical narrative."""
        pred_class = prediction["predicted_class"]
        confidence_pct = prediction["confidence"] * 100
        
        if dataset == "breast":
            display_class = "Malignant" if pred_class == "malignant" else "Benign"
        else:
            display_class = "Adenocarcinoma" if pred_class == "lung_aca" else ("Squamous Cell Carcinoma" if pred_class == "lung_scc" else "Benign")
            
        summary = f"The histopathological biopsy image is predicted as {display_class} with a confidence score of {confidence_pct:.1f}% using the deep learning architecture. "
        
        if patient_info:
            summary += f"Patient Profile context: Age {patient_info.age}, Gender {patient_info.gender}, Family History of Cancer: {patient_info.family_history or 'No'}, Previous Cancer History: {patient_info.previous_cancer_history or 'No'}."
            if dataset == "breast" and patient_info.menopause_status:
                summary += f" Menopause status: {patient_info.menopause_status}."
            if dataset == "lung" and patient_info.smoking_history:
                summary += f" Smoking history: {patient_info.smoking_history}."
            if patient_info.brca_status:
                summary += f" BRCA Mutation status: {patient_info.brca_status}."
                
            # Synthesize clinical assessment
            is_malignant = display_class != "Benign"
            if is_malignant:
                if patient_info.family_history and patient_info.family_history.lower() == "yes":
                    summary += " The combination of histopathological malignancy indicators and positive familial cancer history supports an elevated risk level. High clinical priority is advised."
                else:
                    summary += " Standard oncology referral and staging should be initiated."
            else:
                if patient_info.symptoms and patient_info.symptoms.lower() != "none":
                    summary += f" Although the AI classification is Benign, the presenting symptoms ({patient_info.symptoms}) mandate physical monitoring to rule out atypical sub-visual changes."
                else:
                    summary += " The clinical presentation and AI prediction are concordant, supporting conservative management."
                    
        return summary

report_service = ReportService()
