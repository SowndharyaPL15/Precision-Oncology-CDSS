import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute total page count and add running headers/footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#4A5568"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "PRECISION ONCOLOGY CDSS — TECHNICAL INTERVIEW MASTER GUIDE")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.75)
            self.line(54, 742, letter[0] - 54, 742)

        # Footer (all pages)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))
        self.drawString(54, 36, "Confidential — Prepared for Technical & System Design Interviews")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, page_str)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(54, 46, letter[0] - 54, 46)

        self.restoreState()


def build_pdf(filename="Precision_Oncology_Technical_Interview_Notes.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    PRIMARY = colors.HexColor("#1E3A8A")     # Deep Blue
    SECONDARY = colors.HexColor("#0D9488")   # Teal
    DARK = colors.HexColor("#0F172A")        # Slate 900
    TEXT_COLOR = colors.HexColor("#1E293B")  # Slate 800
    MUTED = colors.HexColor("#64748B")       # Slate 500
    BG_LIGHT = colors.HexColor("#F8FAFC")    # Slate 50
    CARD_BG = colors.HexColor("#F1F5F9")     # Slate 100
    BORDER_COL = colors.HexColor("#CBD5E1")  # Slate 300
    ACCENT_WARN = colors.HexColor("#B45309") # Amber 700
    ACCENT_GREEN = colors.HexColor("#047857")# Emerald 700

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_COLOR,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    callout_text = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=DARK
    )

    q_style = ParagraphStyle(
        'Question',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=PRIMARY,
        spaceBefore=8,
        spaceAfter=2,
        keepWithNext=True
    )

    ans_style = ParagraphStyle(
        'Answer',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=TEXT_COLOR,
        spaceAfter=8
    )

    tbl_header = ParagraphStyle(
        'TblHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1
    )

    tbl_cell = ParagraphStyle(
        'TblCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=TEXT_COLOR
    )

    tbl_cell_center = ParagraphStyle(
        'TblCellCenter',
        parent=tbl_cell,
        alignment=1
    )

    tbl_cell_bold = ParagraphStyle(
        'TblCellBold',
        parent=tbl_cell,
        fontName='Helvetica-Bold'
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A")
    )

    story = []

    # ── HEADER BANNER ──────────────────────────────────────────────────────────
    story.append(Paragraph("Precision Oncology CDSS", title_style))
    story.append(Paragraph("Comprehensive Technical Interview Master Guide & System Architecture Notes", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=10))

    # ── SECTION 1: ELEVATOR PITCHES ────────────────────────────────────────────
    story.append(Paragraph("1. Executive Summary & Elevator Pitches", h1_style))

    p30_text = (
        "<b>30-Second Pitch:</b> <i>\"I developed the Precision Oncology Clinical Decision Support System (CDSS) "
        "— an AI framework for diagnosing Lung and Breast cancer from histopathology slides. It integrates "
        "two-stage transfer learning (DenseNet121, ResNet50, EfficientNetB0) reaching 98.3% accuracy with Explainable AI "
        "(Grad-CAM) for visual verification. It is secured by an Enterprise Three-Factor Authentication (3FA) system "
        "(bcrypt + 128D client-side facial embeddings with liveness + W3C WebAuthn hardware passkeys) with an asynchronous "
        "FastAPI backend, PostgreSQL database, and React TypeScript dashboard.\"</i>"
    )
    story.append(Table([[Paragraph(p30_text, callout_text)]], colWidths=[504], style=[
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(Spacer(1, 8))

    p2m_text = (
        "<b>2-Minute Architectural Pitch:</b><br/>"
        "• <b>Problem Solved:</b> Mitigates inter-observer variability, reduces diagnostic delays, and minimizes unnecessary invasive biopsies.<br/>"
        "• <b>Deep Learning Engine:</b> Evaluated 6 CNN architectures across LC25000 (3-class Lung) and BreaKHis (Binary Breast 400X). DenseNet121 was selected as optimal (98.3% accuracy, 0.975 MCC, 99.0% specificity).<br/>"
        "• <b>Explainability (XAI):</b> Generates Grad-CAM heatmaps overlaid with 55/45 alpha blending to illuminate cellular pleomorphism and nuclear clusters.<br/>"
        "• <b>Optical Slide Guardrail:</b> Proprietary HSV chromatic validator rejects non-histological uploads (X-rays, photos, text documents) before inference.<br/>"
        "• <b>Zero-Trust Security (3FA):</b> Password + 128D facial vector cosine similarity (Sc &ge; 0.85) + W3C WebAuthn TPM hardware authentication with Email OTP fallback and RBAC."
    )
    story.append(Table([[Paragraph(p2m_text, callout_text)]], colWidths=[504], style=[
        ('BACKGROUND', (0,0), (-1,-1), CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(Spacer(1, 10))

    # ── SECTION 2: ARCHITECTURE & TECH STACK ───────────────────────────────────
    story.append(Paragraph("2. System Architecture & Tech Stack", h1_style))
    story.append(Paragraph(
        "The system employs a decoupled, asynchronous micro-architecture designed for clinical safety, low memory overhead, and high concurrency.",
        body_style
    ))

    stack_data = [
        [Paragraph("Tier / Module", tbl_header), Paragraph("Technology Stack", tbl_header), Paragraph("Key Role & Implementation Detail", tbl_header)],
        [
            Paragraph("<b>Frontend UI</b>", tbl_cell),
            Paragraph("React 18, TypeScript 5, Vite, MUI v5, Framer Motion", tbl_cell),
            Paragraph("Type-safe single page app, multi-step clinical workflows, animated transitions, route-level RBAC guards.", tbl_cell)
        ],
        [
            Paragraph("<b>Client Biometrics</b>", tbl_cell),
            Paragraph("HTML5 Canvas, W3C WebAuthn API", tbl_cell),
            Paragraph("In-browser 128D face vectorization with liveness challenge (smile/blink); calls TPM/Secure Enclave hardware.", tbl_cell)
        ],
        [
            Paragraph("<b>API Gateway</b>", tbl_cell),
            Paragraph("FastAPI, Uvicorn (ASGI), Pydantic v2", tbl_cell),
            Paragraph("Asynchronous endpoints, strict schema validation, multipart image handling, on-demand lazy model loader.", tbl_cell)
        ],
        [
            Paragraph("<b>Database Layer</b>", tbl_cell),
            Paragraph("PostgreSQL 15, SQLAlchemy 2.0 Async, AsyncPG, Alembic", tbl_cell),
            Paragraph("Connection pooling, JSONB biomarker/probability storage, audit trail logging, patient records.", tbl_cell)
        ],
        [
            Paragraph("<b>Deep Learning</b>", tbl_cell),
            Paragraph("TensorFlow 2.10, Keras, OpenCV, NumPy, PIL", tbl_cell),
            Paragraph("Two-stage transfer learning, DenseNet121/ResNet50/EfficientNetB0, TFLite 8-bit quantization.", tbl_cell)
        ],
        [
            Paragraph("<b>Explainability</b>", tbl_cell),
            Paragraph("tf.GradientTape, OpenCV JET Colormap", tbl_cell),
            Paragraph("Convolutional gradient backpropagation, tissue density masking, 55/45 slide-to-heatmap alpha composite.", tbl_cell)
        ],
        [
            Paragraph("<b>Security & Auth</b>", tbl_cell),
            Paragraph("PyJWT, passlib (bcrypt), Cryptography (Fernet)", tbl_cell),
            Paragraph("Short-lived JWT (15m) + rotated refresh tokens (7d), brute-force lockout (5 attempts), biometric vector encryption.", tbl_cell)
        ],
        [
            Paragraph("<b>Reporting & Analytics</b>", tbl_cell),
            Paragraph("Chart.js, React-Chartjs-2, html2pdf.js", tbl_cell),
            Paragraph("Radar model comparisons, ROC-AUC curves, multi-factor risk scores, client-rendered vector PDF reports.", tbl_cell)
        ]
    ]

    t_stack = Table(stack_data, colWidths=[110, 160, 234])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_stack)
    story.append(Spacer(1, 12))

    # ── SECTION 3: MACHINE LEARNING & EVALUATION ───────────────────────────────
    story.append(Paragraph("3. Deep Learning Pipeline & Experimental Evaluation", h1_style))

    story.append(Paragraph("<b>Two-Stage Transfer Learning Methodology:</b>", h2_style))
    tl_desc = (
        "• <b>Stage 1 (Feature Extraction):</b> Pretrained ImageNet backbone frozen (<code>base_model.trainable = False</code>). "
        "Custom top head trained (<code>GlobalAveragePooling2D → Dense(256, ReLU) → Dropout(0.4) → Softmax</code>) using Adam at "
        "learning rate &eta; = 10<sup>-4</sup>. Prevents random initial gradients from destroying low-level visual filters.<br/>"
        "• <b>Stage 2 (Fine-Tuning):</b> Top 40 convolutional layers unfrozen. Fine-tuned with reduced learning rate &eta; = 10<sup>-5</sup>, "
        "<code>EarlyStopping(patience=5)</code>, and <code>ReduceLROnPlateau(factor=0.2, patience=3)</code>."
    )
    story.append(Paragraph(tl_desc, body_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>Benchmark Performance Metrics:</b>", h2_style))

    metrics_data = [
        [Paragraph("Dataset / Task", tbl_header), Paragraph("Architecture", tbl_header), Paragraph("Accuracy", tbl_header), Paragraph("F1-Score", tbl_header), Paragraph("ROC-AUC", tbl_header), Paragraph("MCC", tbl_header), Paragraph("Specificity", tbl_header)],
        [
            Paragraph("<b>Lung Cancer</b><br/>(LC25000: 3 classes,<br/>15,000 images)", tbl_cell),
            Paragraph("<b>DenseNet121 🏆</b><br/>EfficientNetB0<br/>ResNet50", tbl_cell),
            Paragraph("<b>98.3%</b><br/>96.1%<br/>94.0%", tbl_cell_center),
            Paragraph("<b>0.984</b><br/>0.963<br/>0.939", tbl_cell_center),
            Paragraph("<b>0.998</b><br/>0.990<br/>0.980", tbl_cell_center),
            Paragraph("<b>0.975</b><br/>0.941<br/>0.910", tbl_cell_center),
            Paragraph("<b>99.0%</b><br/>97.8%<br/>96.9%", tbl_cell_center)
        ],
        [
            Paragraph("<b>Breast Cancer</b><br/>(BreaKHis 400X:<br/>1,820 images)", tbl_cell),
            Paragraph("<b>DenseNet121 🏆</b><br/>EfficientNetB0<br/>ResNet50", tbl_cell),
            Paragraph("<b>97.9%</b><br/>95.3%<br/>93.2%", tbl_cell_center),
            Paragraph("<b>0.980</b><br/>0.951<br/>0.930", tbl_cell_center),
            Paragraph("<b>0.994</b><br/>0.987<br/>0.974", tbl_cell_center),
            Paragraph("<b>0.957</b><br/>0.906<br/>0.866", tbl_cell_center),
            Paragraph("<b>98.6%</b><br/>96.4%<br/>95.2%", tbl_cell_center)
        ]
    ]

    t_metrics = Table(metrics_data, colWidths=[114, 110, 56, 56, 56, 56, 56])
    t_metrics.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_metrics)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Why DenseNet121 Outperforms ResNet & EfficientNet:</b>", h2_style))
    densenet_why = (
        "1. <b>Dense Feature Concatenation (x<sub>l</sub> = H<sub>l</sub>([x<sub>0</sub>, x<sub>1</sub>, ..., x<sub>l-1</sub>])):</b> "
        "Connects each layer to all subsequent layers. Low-level chromatic/nuclear textures are directly merged with high-level glandular geometries.<br/>"
        "2. <b>Mitigation of Gradient Vanishing:</b> Direct gradient paths enable robust backpropagation across deep feature extractors.<br/>"
        "3. <b>Exceptional Specificity (99.0%):</b> Extremely low false-positive rate prevents invasive clinical re-biopsies."
    )
    story.append(Paragraph(densenet_why, body_style))
    story.append(Spacer(1, 10))

    # ── SECTION 4: EXPLAINABLE AI & VALIDATION ─────────────────────────────────
    story.append(Paragraph("4. Explainable AI (Grad-CAM) & Image Validation", h1_style))

    xai_text = (
        "<b>Grad-CAM Mathematical Flow:</b><br/>"
        "1. <i>Gradient Backprop:</i> Compute gradient of class score <i>y<sup>c</sup></i> with respect to final conv feature maps <i>A<sup>k</sup></i>: "
        "<code>&part;y<sup>c</sup> / &part;A<sup>k</sup></code><br/>"
        "2. <i>Global Average Pooling:</i> Compute neuron importance weights: "
        "<code>&alpha;<sub>k</sub><sup>c</sup> = (1/Z) &sum;<sub>i</sub> &sum;<sub>j</sub> (&part;y<sup>c</sup> / &part;A<sub>i,j</sub><sup>k</sup>)</code><br/>"
        "3. <i>Rectified Combination:</i> <code>L<sub>Grad-CAM</sub><sup>c</sup> = ReLU(&sum;<sub>k</sub> &alpha;<sub>k</sub><sup>c</sup> A<sup>k</sup>)</code> (retains only positive features).<br/>"
        "4. <i>Histological Refinement:</i> Subtracts blank microscope glass ($V > 0.94, S < 0.06$), applies JET colormap, and composites at 55% slide / 45% heatmap.<br/>"
        "<br/>"
        "<b>Domain Guardrail (Histopathology Validator):</b><br/>"
        "Transforms input to HSV color space. Validates H&E dye absorption (Hematoxylin: 260&deg; - 320&deg;, Eosin: 300&deg; - 350&deg; &amp; 0&deg; - 30&deg;). "
        "Rejects non-histological uploads (grayscale X-rays/CTs, natural photos, UI screenshots, blank glass) with a 400 Bad Request."
    )
    story.append(Table([[Paragraph(xai_text, callout_text)]], colWidths=[504], style=[
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(Spacer(1, 12))

    # ── SECTION 5: SECURITY & 3FA ──────────────────────────────────────────────
    story.append(Paragraph("5. Enterprise Three-Factor Authentication (3FA)", h1_style))

    auth_data = [
        [Paragraph("Factor Level", tbl_header), Paragraph("Mechanism", tbl_header), Paragraph("Security Guarantee & Implementation", tbl_header)],
        [
            Paragraph("<b>Factor 1: Knowledge</b>", tbl_cell),
            Paragraph("Password (bcrypt)", tbl_cell),
            Paragraph("Salted bcrypt hash (cost factor 12). 5 failed attempts trigger account lockout (<code>locked_until</code>).", tbl_cell)
        ],
        [
            Paragraph("<b>Factor 2: Inherence</b>", tbl_cell),
            Paragraph("128D Face Embeddings + Liveness", tbl_cell),
            Paragraph("Client-side canvas vectorization (zero raw video stored). Cosine similarity match ($S_c \\ge 0.85$) + interactive smile/blink liveness test.", tbl_cell)
        ],
        [
            Paragraph("<b>Factor 3: Possession</b>", tbl_cell),
            Paragraph("W3C WebAuthn Passkeys", tbl_cell),
            Paragraph("Hardware-bound private keys in Windows Hello / Touch ID / TPM. Cryptographic challenge-response validation. Email OTP fallback.", tbl_cell)
        ],
        [
            Paragraph("<b>Access Control</b>", tbl_cell),
            Paragraph("RBAC + Audit Logging", tbl_cell),
            Paragraph("Granular permissions for <code>Admin</code>, <code>Doctor</code>, <code>Pathologist</code>. Immutable logging of IP, UA, factors, and timestamp.", tbl_cell)
        ]
    ]

    t_auth = Table(auth_data, colWidths=[114, 130, 260])
    t_auth.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_auth)
    story.append(Spacer(1, 12))

    # ── SECTION 6: TOP 10 INTERVIEW QUESTIONS & MODEL ANSWERS ──────────────────
    story.append(Paragraph("6. Top Technical Interview Q&A (Mastering the Discussion)", h1_style))

    qa_list = [
        (
            "Q1: Why did you choose DenseNet121 over ResNet50 and EfficientNetB0?",
            "In our benchmarks across LC25000 and BreaKHis datasets, DenseNet121 achieved the highest accuracy (98.3% and 97.9%) and ROC-AUC (0.998). Architecturally, DenseNet concatenates all preceding feature maps (feature reuse), preserving fine-grained cellular chromatin textures and tissue borders that additive residual connections (ResNet) or compound scaling (EfficientNet) can dilute."
        ),
        (
            "Q2: How does your system ensure Zero-Trust biometric privacy under HIPAA/GDPR?",
            "We adhere to a Zero-Raw-Biometric-Storage architecture: (1) Live facial video is never transmitted; 128D float vectors are extracted inside the client browser's HTML5 Canvas. (2) Stored vectors are encrypted with Fernet (AES-128-CBC + HMAC-SHA256). (3) WebAuthn biometric verification occurs strictly inside the device hardware enclave (Windows TPM / Apple Secure Enclave); only signed cryptographic assertions reach the server."
        ),
        (
            "Q3: Explain your Two-Stage Transfer Learning strategy and why it is necessary.",
            "If an entire network pre-trained on ImageNet is trained from epoch 1 with randomly initialized classification head weights, large initial gradients corrupt the pre-trained feature extractors (catastrophic forgetting). In Stage 1, we freeze the backbone and train only the head (&eta;=1e-4). In Stage 2, once the head stabilizes, we unfreeze the top 40 layers and fine-tune with a lower learning rate (&eta;=1e-5) with Early Stopping."
        ),
        (
            "Q4: How does Grad-CAM work mathematically, and why is it vital in clinical CDSS?",
            "Grad-CAM computes the gradient of the predicted class score with respect to the last convolutional feature maps, global-average-pools them into channel importance weights, and applies a ReLU activation. In oncology, black-box AI is clinically unacceptable. Grad-CAM visualizes whether the model focuses on genuine neoplastic atypia and mitotic figures rather than slide artifacts or bubbles."
        ),
        (
            "Q5: How did you optimize the backend for low latency and cloud free-tier memory limits?",
            "(1) Asynchronous FastAPI with asyncpg connection pooling. (2) Lazy model loading on-demand with TensorFlow thread constraints (2 inter/intra threads) keeping idle RAM minimal. (3) 8-bit TFLite model quantization reducing size by 75%. (4) Offloaded CPU-heavy tasks (PDF rendering via html2pdf.js, face vector extraction) to client browsers."
        ),
        (
            "Q6: How does the system prevent non-histopathology images (e.g. photos, X-rays) from being diagnosed?",
            "A pre-inference validator analyzes the RGB-to-HSV color distribution. Since genuine H&E slides strictly exhibit purple/pink chromaticity within defined hue angles (300°-350° and 0°-30°), grayscale X-rays, photos, and empty glass slides are rejected before reaching the model with a clear 400 Bad Request error."
        ),
        (
            "Q7: Why track Matthews Correlation Coefficient (MCC) instead of standard accuracy?",
            "Medical datasets frequently exhibit class imbalance. Accuracy can be deceptively high if a model over-predicts the majority class. MCC yields a high score between -1 and +1 only if predictions perform well across all four confusion matrix quadrants (TP, TN, FP, FN), making it the gold standard in clinical AI evaluation."
        ),
        (
            "Q8: Describe the multi-factor clinical risk scoring engine.",
            "The risk engine in report_service.py combines AI class probabilities with patient-specific risk factors (Age > 55, family history, BRCA mutation status, menopause status, smoking pack-years) into an aggregated risk score and generates actionable clinical next steps (e.g., IHC biomarker panel, EGFR/ALK mutation testing, surgical resection)."
        ),
        (
            "Q9: What database design choices were made for high data integrity?",
            "PostgreSQL 15 with SQLAlchemy 2.0 Async ORM. Designed normalized tables (Users, FaceEmbeddings, WebAuthnCredentials, AuditLogs, Doctors, Patients, Predictions, Reports) with foreign keys and cascade delete rules. Probability distributions and clinical biomarkers are stored in native JSONB for flexible querying without schema bloat."
        ),
        (
            "Q10: What are the primary trade-offs you made, and what would you build in v2?",
            "Trade-off: Chose client-side biometrics for privacy over server-side computer vision control. For v2: We plan to implement Gigapixel Whole Slide Imaging (WSI) tile processing using OpenSlide and Multiple Instance Learning (MIL), and integrate multimodal RNA-seq transcriptomic data with histopathology vision models."
        )
    ]

    for q, a in qa_list:
        story.append(Paragraph(q, q_style))
        story.append(Paragraph(a, ans_style))

    story.append(Spacer(1, 8))

    # ── SECTION 7: QUICK METRICS CHEAT SHEET ───────────────────────────────────
    story.append(Paragraph("7. Quick Numbers & Metrics Cheat-Sheet", h1_style))

    cheat_data = [
        [Paragraph("Metric / Parameter", tbl_header), Paragraph("Exact Value", tbl_header), Paragraph("Clinical / Technical Significance", tbl_header)],
        [
            Paragraph("<b>DenseNet121 Lung Accuracy</b>", tbl_cell),
            Paragraph("<b>98.3%</b>", tbl_cell_bold),
            Paragraph("Multi-class classification across ACA, SCC, and Benign tissue.", tbl_cell)
        ],
        [
            Paragraph("<b>DenseNet121 Breast Accuracy</b>", tbl_cell),
            Paragraph("<b>97.9%</b>", tbl_cell_bold),
            Paragraph("Binary classification on BreaKHis 400X magnification slides.", tbl_cell)
        ],
        [
            Paragraph("<b>ROC-AUC</b>", tbl_cell),
            Paragraph("<b>0.998</b> (Lung), <b>0.994</b> (Breast)", tbl_cell),
            Paragraph("Demonstrates near-flawless discriminative threshold stability.", tbl_cell)
        ],
        [
            Paragraph("<b>Specificity</b>", tbl_cell),
            Paragraph("<b>99.0%</b> (Lung), <b>98.6%</b> (Breast)", tbl_cell),
            Paragraph("Critical low false-positive rate avoiding unnecessary biopsies.", tbl_cell)
        ],
        [
            Paragraph("<b>Input Resolution</b>", tbl_cell),
            Paragraph("<b>224 &times; 224 &times; 3</b>", tbl_cell),
            Paragraph("Standardized RGB tensor resolution with [0, 1] normalization.", tbl_cell)
        ],
        [
            Paragraph("<b>Face Embedding Dim</b>", tbl_cell),
            Paragraph("<b>128 dimensions</b>", tbl_cell),
            Paragraph("Normalized float vector; verified via Cosine Similarity &ge; 0.85.", tbl_cell)
        ],
        [
            Paragraph("<b>JWT Token Lifetimes</b>", tbl_cell),
            Paragraph("<b>15 min</b> (Access) / <b>7 days</b> (Refresh)", tbl_cell),
            Paragraph("Short-lived access token with database-rotated refresh tokens.", tbl_cell)
        ],
        [
            Paragraph("<b>Brute-force Lockout</b>", tbl_cell),
            Paragraph("<b>5 failed attempts</b>", tbl_cell),
            Paragraph("Triggers account temporary lockout to prevent dictionary attacks.", tbl_cell)
        ]
    ]

    t_cheat = Table(cheat_data, colWidths=[140, 140, 224])
    t_cheat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_cheat)
    story.append(Spacer(1, 14))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    build_pdf()
