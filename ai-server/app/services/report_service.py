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

    def _generate_follow_up_diagnostics(self, dataset: str, predicted_class: str, patient_info: PatientInfoSchema) -> list:
        """Generates individualized, bulleted follow-up diagnostic action items."""
        items = []
        is_malignant = (dataset == "breast" and predicted_class == "malignant") or (dataset == "lung" and predicted_class in ["lung_aca", "lung_scc"])
        
        has_symptoms = bool(patient_info and patient_info.symptoms and patient_info.symptoms.strip().lower() not in ("", "none", "n/a"))
        brca_pos = bool(patient_info and patient_info.brca_status and patient_info.brca_status.lower() == "positive")
        fam_hist = bool(patient_info and patient_info.family_history and patient_info.family_history.lower() == "yes")
        smoker = bool(patient_info and patient_info.smoking_history and patient_info.smoking_history.lower() in ["current", "former"])

        if dataset == "breast":
            if is_malignant:
                items.append("Urgent Multidisciplinary Breast Cancer Tumor Board review (Surgical, Medical & Radiation Oncology).")
                items.append("Comprehensive reflex IHC biomarker panel: ER, PR, HER2/neu (with FISH confirmation if 2+), and Ki-67 index.")
                items.append("Bilateral diagnostic mammogram + axillary ultrasound + contrast-enhanced Breast MRI for local staging.")
                items.append("Sentinel lymph node biopsy (SLNB) and systemic staging (CT Chest/Abdomen/Pelvis or PET-CT).")
                if brca_pos or fam_hist:
                    items.append("Referral for formal genetic counseling and expanded multigene panel testing (BRCA1/2, PALB2, CHEK2).")
            else:
                items.append("Routine clinical breast examination (CBE) and standard surveillance at 6-12 month intervals.")
                items.append("Diagnostic bilateral breast ultrasound / digital mammography correlation for BI-RADS verification.")
                if brca_pos or fam_hist:
                    items.append("High-risk surveillance protocol: alternating annual Breast MRI and digital tomosynthesis every 6 months.")
                    items.append("Hereditary cancer genetic counseling consultation for risk-reduction strategies.")
                if has_symptoms:
                    items.append(f"Targeted clinical workup for presenting symptoms ({patient_info.symptoms}) to exclude atypical hyperplasia.")
                items.append("Patient counseling on monthly breast self-examination and prompt reporting of new palpable changes.")

        elif dataset == "lung":
            if predicted_class == "lung_aca":
                items.append("Urgent referral to Thoracic Multidisciplinary Oncology Tumor Board within 48-72 hours.")
                items.append("Comprehensive NGS molecular panel: EGFR (Exon 19/21), ALK, ROS1, BRAF, RET, MET, KRAS G12C & PD-L1 IHC 22C3.")
                items.append("Integrated whole-body 18F-FDG PET-CT scan and contrast-enhanced brain MRI for clinical TNM staging.")
                items.append("Endobronchial ultrasound-guided transbronchial needle aspiration (EBUS-TBNA) for mediastinal lymph node staging.")
                items.append("Complete Pulmonary Function Tests (PFTs with DLCO) and cardiology clearance for thoracic surgical triage.")
            elif predicted_class == "lung_scc":
                items.append("Prompt evaluation by Thoracic Oncology and Pulmonary Surgery teams.")
                items.append("Diagnostic bronchoscopy with endobronchial ultrasound (EBUS) to inspect airway involvement.")
                items.append("PD-L1 Tumor Proportion Score (TPS) immunohistochemistry for first-line chemo-immunotherapy planning.")
                items.append("Whole-body 18F-FDG PET-CT scan and contrast-enhanced brain MRI for distant metastatic evaluation.")
                items.append("Spirometry, DLCO, and quantitative ventilation-perfusion scan to assess cardiopulmonary reserve.")
            else:
                items.append("Pulmonary consultation and spirometry/PFTs to address presenting respiratory complaints if active.")
                if smoker:
                    items.append("Enrollment in evidence-based smoking cessation program and annual Low-Dose CT (LDCT) lung cancer screening.")
                if has_symptoms:
                    items.append(f"Targeted diagnostic evaluation for symptoms ({patient_info.symptoms}) to rule out chronic infection or COPD.")
                    items.append("Follow-up high-resolution non-contrast chest CT at 3-6 months to confirm parenchymal stability.")
                else:
                    items.append("Maintain routine age-appropriate preventive health check-ups; no immediate oncological therapy required.")
                items.append("Advise patient to seek prompt medical attention if hemoptysis, unresolving cough, or dyspnea emerges.")

        return items

    def _generate_recommendation_multimodal(self, dataset: str, predicted_class: str, confidence: float, patient_info: PatientInfoSchema) -> str:
        """Generates a comprehensive, highly individualized multimodal clinical recommendation."""
        name = patient_info.patient_name if patient_info and patient_info.patient_name and patient_info.patient_name != "N/A" else "the patient"
        age = patient_info.age if patient_info and patient_info.age else 45
        gender = patient_info.gender if patient_info and patient_info.gender else "patient"
        symptoms = patient_info.symptoms.strip() if patient_info and patient_info.symptoms and patient_info.symptoms.strip().lower() not in ("", "none", "n/a") else None
        fam_hist = bool(patient_info and patient_info.family_history and patient_info.family_history.lower() == "yes")
        brca_pos = bool(patient_info and patient_info.brca_status and patient_info.brca_status.lower() == "positive")
        prev_cancer = bool(patient_info and patient_info.previous_cancer_history and patient_info.previous_cancer_history.lower() == "yes")
        conf_pct = confidence * 100

        if dataset == "breast":
            if predicted_class == "malignant":
                rec = (
                    f"URGENT MULTIDISCIPLINARY ONCOLOGICAL ACTION REQUIRED: Histopathological evaluation for {name} (Age {age}, {patient_info.menopause_status if patient_info else 'Female'}) "
                    f"confirms Infiltrating Breast Malignancy with a high diagnostic confidence of {conf_pct:.1f}%. "
                    f"Immediate presentation to the Breast Cancer Multidisciplinary Tumor Board (Surgical, Medical, and Radiation Oncology) is indicated. "
                    f"Order an urgent reflex immunohistochemistry (IHC) panel for Estrogen Receptor (ER), Progesterone Receptor (PR), HER2/neu (with FISH reflex if 2+ equivocal), "
                    f"and Ki-67 proliferation index to establish molecular subtype and determine candidacy for targeted or neo-adjuvant systemic therapy. "
                    f"Diagnostic staging should include bilateral digital breast tomosynthesis, axillary ultrasound, contrast-enhanced Breast MRI, and sentinel lymph node mapping. "
                )
                if brca_pos:
                    rec += f"Given confirmed positive BRCA mutation status, expedited genetic oncology consultation is imperative to evaluate extended PARP inhibitor therapy protocols and bilateral surgical risk-reduction strategies."
                elif fam_hist:
                    rec += f"Due to documented positive familial breast/ovarian cancer history, multigene hereditary cancer panel testing (BRCA1/2, PALB2, CHEK2) is strongly recommended."
                return rec
            else:
                rec = (
                    f"BENIGN TISSUE ARCHITECTURE CONFIRMED: Deep convolutional histopathology analysis for {name} (Age {age}, {patient_info.menopause_status if patient_info else 'Female'}) "
                    f"demonstrates benign breast parenchymal tissue without cytologic atypia, stromal invasion, or malignant proliferation (Confidence: {conf_pct:.1f}%). "
                )
                if brca_pos:
                    rec += (
                        f"CRITICAL SURVEILLANCE PROTOCOL: Although the current biopsy is benign, the patient's positive BRCA mutation status confers elevated lifetime risk. "
                        f"Initiate intensive high-risk surveillance comprising annual contrast-enhanced breast MRI alternating with digital mammography every 6 months, "
                        f"semi-annual clinical breast exams, and genetic counseling consultation."
                    )
                elif fam_hist:
                    rec += (
                        f"ELEVATED FAMILIAL RISK: Given positive family history of breast/ovarian malignancy, recommend individualized risk assessment (Tyrer-Cuzick model), "
                        f"consideration of supplemental breast MRI screening, and routine clinical follow-up every 6-12 months."
                    )
                elif symptoms:
                    rec += (
                        f"SYMPTOMATIC CORRELATION: Due to presenting clinical complaints ('{symptoms}'), recommend targeted diagnostic ultrasound to evaluate for non-malignant "
                        f"etiologies (such as fibroadenoma, fibrocystic changes, or duct ectasia) with clinical re-assessment in 3-6 months to confirm stability."
                    )
                elif prev_cancer:
                    rec += (
                        f"POST-ONCOLOGY SURVEILLANCE: Given previous oncological history, continue regular annual diagnostic mammography and clinical breast examinations."
                    )
                else:
                    rec += (
                        f"Standard age-appropriate routine breast cancer screening intervals (biennial digital mammography) are supported. "
                        f"Advise patient on routine breast self-awareness and prompt return if new palpable nodules or focal changes arise."
                    )
                return rec

        elif dataset == "lung":
            smoker = bool(patient_info and patient_info.smoking_history and patient_info.smoking_history.lower() in ["current", "former"])
            sm_status = patient_info.smoking_history if patient_info and patient_info.smoking_history else "Never"

            if predicted_class == "lung_aca":
                rec = (
                    f"EXPEDITED THORACIC ONCOLOGY REFERRAL REQUIRED: Histopathological biopsy for {name} (Age {age}, {gender}, Smoking: {sm_status}) "
                    f"is classified as Lung Adenocarcinoma with {conf_pct:.1f}% confidence, exhibiting glandular differentiation and invasive malignant features. "
                    f"Immediately convene the Thoracic Oncology Multidisciplinary Tumor Board. "
                    f"Mandate comprehensive Next-Generation Sequencing (NGS) molecular biomarker testing: EGFR (Exon 19 del, L858R, T790M), ALK rearrangements, "
                    f"ROS1, BRAF V600E, RET, MET exon 14 skipping, KRAS G12C, and PD-L1 IHC 22C3 Tumor Proportion Score to identify actionable targeted therapeutic options. "
                    f"Order whole-body 18F-FDG PET-CT, contrast-enhanced brain MRI, and EBUS-TBNA mediastinal nodal staging for definitive cTNM classification."
                )
                if prev_cancer or fam_hist:
                    rec += f" Heightened clinical priority is warranted given positive history of malignancy."
                return rec

            elif predicted_class == "lung_scc":
                rec = (
                    f"THORACIC ONCOLOGY & SURGICAL EVALUATION REQUIRED: Histopathological biopsy for {name} (Age {age}, {gender}, Smoking: {sm_status}) "
                    f"is classified as Lung Squamous Cell Carcinoma with {conf_pct:.1f}% confidence, demonstrating keratinization, intercellular bridges, and malignant atypia. "
                    f"Prompt referral to Thoracic Surgery and Medical Oncology is indicated. "
                    f"Schedule diagnostic bronchoscopy with endobronchial ultrasound (EBUS-TBNA) to evaluate central tracheobronchial extension and mediastinal lymph node involvement. "
                    f"Order PD-L1 TPS immunohistochemistry for immunotherapy selection, integrated whole-body 18F-FDG PET-CT, contrast brain MRI, and complete PFTs with DLCO to assess cardiopulmonary reserve."
                )
                return rec

            else:
                rec = (
                    f"NORMAL / BENIGN PULMONARY HISTOLOGY CONFIRMED: Deep learning analysis for {name} (Age {age}, {gender}) "
                    f"demonstrates normal lung parenchyma, preserved alveolar architecture, and absence of neoplastic infiltration (Confidence: {conf_pct:.1f}%). "
                )
                if smoker:
                    rec += (
                        f"PULMONARY RISK MANAGEMENT: In view of {sm_status} smoking history, strongly advocate enrollment in an evidence-based smoking cessation program. "
                        f"Recommend annual Low-Dose CT (LDCT) lung cancer screening if eligible under USPSTF guidelines (ages 50-80 with >=20 pack-year history)."
                    )
                elif symptoms:
                    rec += (
                        f"CLINICAL SYMPTOM RESOLUTION: In response to reported symptoms ('{symptoms}'), recommend pulmonary clinical workup including spirometry/PFTs "
                        f"and follow-up low-dose chest CT in 3-6 months to exclude resolving post-infectious granuloma or inflammatory airway disease."
                    )
                elif prev_cancer or fam_hist:
                    rec += (
                        f"SURVEILLANCE ADVISORY: Given prior cancer history / familial background, maintain regular periodic pulmonary clinical reviews and chest imaging as clinically indicated."
                    )
                else:
                    rec += (
                        f"No immediate oncological intervention is required. Maintain standard preventive health lifestyle and advise patient to seek evaluation if persistent cough, hemoptysis, or shortness of breath occurs."
                    )
                return rec

        return "Clinical correlation with histopathological findings and multidisciplinary consultation recommended."

    def _generate_diagnostic_summary(self, dataset: str, prediction: dict, patient_info: PatientInfoSchema) -> str:
        """Combines image prediction, confidence score, and patient clinical info into a detailed, case-specific clinical narrative."""
        pred_class = prediction["predicted_class"]
        confidence_pct = prediction["confidence"] * 100
        name = patient_info.patient_name if patient_info and patient_info.patient_name and patient_info.patient_name != "N/A" else "Patient"
        age = patient_info.age if patient_info and patient_info.age else 45
        gender = patient_info.gender if patient_info and patient_info.gender else "Unspecified"
        
        if dataset == "breast":
            if pred_class == "malignant":
                summary = (
                    f"Comprehensive histopathological assessment of the breast biopsy specimen for {name} (Age {age}, {gender}) "
                    f"demonstrates architectural disorganization, hyperchromatic pleomorphic nuclei, and invasive cellular proliferation characteristic of Infiltrating Ductal/Lobular Carcinoma. "
                    f"The ResNet50 deep learning model confirms malignancy with a high diagnostic confidence of {confidence_pct:.1f}%. "
                )
                if patient_info:
                    context = []
                    if patient_info.menopause_status: context.append(f"Menopause: {patient_info.menopause_status}")
                    if patient_info.brca_status: context.append(f"BRCA: {patient_info.brca_status}")
                    if patient_info.family_history: context.append(f"Family History: {patient_info.family_history}")
                    if patient_info.symptoms: context.append(f"Symptoms: {patient_info.symptoms}")
                    if context:
                        summary += f"Patient Context: {', '.join(context)}. "
                    summary += "Multidisciplinary oncological staging, biomarker quantification (ER/PR/HER2/Ki-67), and surgical oncology evaluation are warranted."
            else:
                summary = (
                    f"Histopathological biopsy examination for {name} (Age {age}, {gender}) reveals well-differentiated, non-neoplastic breast tissue architecture. "
                    f"Intact double-layered ductal/lobular structures with uniform, normochromatic nuclei are observed without signs of malignant transformation. "
                    f"The AI model classifies the specimen as Benign with {confidence_pct:.1f}% confidence. "
                )
                if patient_info and patient_info.symptoms and patient_info.symptoms.lower() not in ("", "none", "n/a"):
                    summary += f"While the microscopic slide is free of malignancy, presenting symptoms ('{patient_info.symptoms}') warrant clinical ultrasound correlation to evaluate benign breast changes."
                else:
                    summary += "The microscopic findings are concordant with healthy benign parenchyma, supporting conservative observation."

        else:
            if pred_class == "lung_aca":
                summary = (
                    f"Microscopic histopathological analysis of the lung biopsy for {name} (Age {age}, {gender}) identifies malignant glandular structures, acinar/papillary formation, "
                    f"and nuclear atypia consistent with Lung Adenocarcinoma. Deep learning classification confirmed this diagnosis with {confidence_pct:.1f}% confidence. "
                )
                if patient_info and patient_info.smoking_history:
                    summary += f"Smoking History: {patient_info.smoking_history}. "
                summary += "Immediate molecular profiling (EGFR/ALK/ROS1/PD-L1) and full-body PET-CT staging are recommended."
            elif pred_class == "lung_scc":
                summary = (
                    f"Pulmonary tissue biopsy examination for {name} (Age {age}, {gender}) reveals sheets of polygonal squamous cells with keratin pearl formation, "
                    f"intercellular bridging, and marked pleomorphism diagnostic of Lung Squamous Cell Carcinoma. AI diagnostic confidence is {confidence_pct:.1f}%. "
                )
                if patient_info and patient_info.smoking_history:
                    summary += f"Smoking History: {patient_info.smoking_history}. "
                summary += "Bronchoscopic airway staging, PD-L1 TPS quantification, and thoracic surgical consultation are advised."
            else:
                summary = (
                    f"Microscopic inspection of the pulmonary biopsy for {name} (Age {age}, {gender}) demonstrates healthy alveolar septa, patent microvascular spaces, "
                    f"and normal bronchial ciliated epithelium without malignant cytological atypia. The AI model classifies the tissue as Normal / Benign with {confidence_pct:.1f}% confidence. "
                )
                if patient_info and patient_info.smoking_history and patient_info.smoking_history.lower() in ["current", "former"]:
                    summary += f"Given {patient_info.smoking_history} smoking status, structured cessation guidance and annual Low-Dose CT screening are recommended."
                elif patient_info and patient_info.symptoms and patient_info.symptoms.lower() not in ("", "none", "n/a"):
                    summary += f"Presenting respiratory symptoms ('{patient_info.symptoms}') suggest non-malignant pulmonary etiology; correlation with clinical spirometry is advised."

        return summary

    def generate_report(self, model_name: str, dataset: str, image_path: str, patient_info: PatientInfoSchema) -> dict:
        """Orchestrates prediction and explanation to generate a comprehensive clinical report."""
        import os
        import uuid
        import shutil
        import cv2
        from app.core.config import settings

        # 1. Run Inference
        prediction = inference_service.predict(model_name, dataset, image_path)
        pred_class = prediction["predicted_class"]
        
        # 2. Run Explainability
        # If the tissue is Benign / Normal, display ONLY original microscopic slide (no heatmap needed),
        # achieving sub-second response times and preventing server OOM.
        if pred_class in ["benign", "lung_n"]:
            request_id = str(uuid.uuid4())
            save_dir = os.path.join(settings.TEMP_UPLOAD_DIR, "explanations", request_id)
            os.makedirs(save_dir, exist_ok=True)
            img_name = os.path.basename(image_path).split('.')[0]
            orig_save_path = os.path.join(save_dir, f"{img_name}_original.png")
            
            orig_img = cv2.imread(image_path)
            if orig_img is not None:
                cv2.imwrite(orig_save_path, orig_img)
            else:
                shutil.copyfile(image_path, orig_save_path)
                
            gradcam = {
                "predicted_class": pred_class,
                "confidence": prediction["confidence"],
                "heatmap_path": None,
                "overlay_path": None,
                "original_path": f"/static/explanations/{request_id}/{img_name}_original.png"
            }
        else:
            gradcam = explainability_service.generate_explanation(model_name, dataset, image_path)
        
        # 3. Formulate Specific Multimodal Recommendation
        recommendation = self._generate_recommendation_multimodal(dataset, prediction["predicted_class"], prediction["confidence"], patient_info)
        
        # 4. Formulate Detailed Case-Specific Diagnostic Summary
        diagnostic_summary = self._generate_diagnostic_summary(dataset, prediction, patient_info)

        # 5. Generate Individualized Follow-up Diagnostics list
        follow_up_items = self._generate_follow_up_diagnostics(dataset, prediction["predicted_class"], patient_info)

        # 6. Compute Dynamic Clinical Risk Score
        risk_score = self._compute_risk_score(dataset, prediction["predicted_class"], patient_info)
        
        report = {
            "patient_info": patient_info.model_dump() if patient_info else None,
            "prediction": prediction,
            "gradcam": gradcam,
            "recommendation": recommendation,
            "diagnostic_summary": diagnostic_summary,
            "follow_up_items": follow_up_items,
            "risk_score": risk_score,
        }
        
        return report

report_service = ReportService()
