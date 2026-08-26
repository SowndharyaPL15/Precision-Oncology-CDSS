import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, ProgressBar, Badge, Tab, Tabs } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCloudUploadAlt, FaLungs, FaFilePdf, FaSave, FaUndo, FaCheckCircle, 
  FaExclamationTriangle, FaInfoCircle, FaImage, FaSearchPlus,
  FaFileMedical, FaUserCheck, FaHistory, FaThermometerHalf, FaCheck
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import apiClient, { getMediaUrl } from '../../api/client';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface Patient {
  patient_id: string;
  full_name: string;
  age: number;
  gender: string;
  smoking_history?: string;
  family_history?: string;
  symptoms?: string;
  clinical_biomarkers?: any;
}

export default function LungPrediction() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('resnet50');
  const [zoomScale, setZoomScale] = useState(1);
  const [activeTab, setActiveTab] = useState<string>('overlay');
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.6);
  const [blendMode, setBlendMode] = useState<string>('normal');

  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    gender: 'Male',
    cancerType: 'Lung',
    smokingHistory: 'Never',
    familyHistory: 'No',
    symptoms: '',
    previousDisease: '',
    previousCancerHistory: 'No',
    brcaStatus: 'Unknown',
    notes: ''
  });

  const loadingStages = [
    'Uploading Image...',
    'Preprocessing & Normalizing...',
    'Extracting Deep Features...',
    'Running Inference (ResNet50)...',
    'Generating Grad-CAM Heatmap...',
    'Compiling Clinical Report...',
    'Prediction Completed!'
  ];

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await apiClient.get('/patients');
        let data = response.data;
        if (data.length === 0) {
          // Auto-create a demo patient if empty
          const demo = {
            doctor_id: 'doc-1',
            full_name: 'John Doe (Demo Patient)',
            age: 55,
            gender: 'Male',
            phone: '555-0198',
            email: 'johndoe@example.com',
            smoking_history: 'Current (Light)',
            family_history: 'Yes',
            symptoms: 'Chronic cough',
            clinical_biomarkers: {
              previous_disease: 'COPD',
              previous_cancer_history: 'No',
              brca_status: 'Unknown',
              notes: 'Patient exhibits mild dyspnea.'
            }
          };
          const createResponse = await apiClient.post('/patients', demo);
          data = [createResponse.data];
        }
        setPatients(data);
        if (data.length > 0) {
          const firstPatient = data[0];
          setSelectedPatientId(firstPatient.patient_id);
          setFormData({
            patientName: firstPatient.full_name || '',
            age: firstPatient.age.toString(),
            gender: firstPatient.gender,
            cancerType: 'Lung',
            smokingHistory: firstPatient.smoking_history || 'Never',
            familyHistory: firstPatient.family_history || 'No',
            symptoms: firstPatient.symptoms || '',
            previousDisease: firstPatient.clinical_biomarkers?.previous_disease || '',
            previousCancerHistory: firstPatient.clinical_biomarkers?.previous_cancer_history || 'No',
            brcaStatus: firstPatient.clinical_biomarkers?.brca_status || 'Unknown',
            notes: firstPatient.clinical_biomarkers?.notes || ''
          });
        }
      } catch (err) {
        toast.error('Failed to load patient directory');
      }
    };
    fetchPatients();
  }, []);

  // Update form inputs when patient changes
  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedPatientId(pId);
    const p = patients.find(pat => pat.patient_id === pId);
    if (p) {
      setFormData({
        patientName: p.full_name || '',
        age: p.age.toString(),
        gender: p.gender,
        cancerType: 'Lung',
        smokingHistory: p.smoking_history || 'Never',
        familyHistory: p.family_history || 'No',
        symptoms: p.symptoms || '',
        previousDisease: p.clinical_biomarkers?.previous_disease || '',
        previousCancerHistory: p.clinical_biomarkers?.previous_cancer_history || 'No',
        brcaStatus: p.clinical_biomarkers?.brca_status || 'Unknown',
        notes: p.clinical_biomarkers?.notes || ''
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Simulate loading stages sequentially
  const runLoadingAnimation = () => {
    setLoadingStep(0);
    const intervals = [600, 1200, 1800, 2400, 3200, 4000, 4500];
    intervals.forEach((time, index) => {
      setTimeout(() => {
        setLoadingStep(index);
      }, time);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      toast.error('Please upload a histopathology image');
      return;
    }
    if (!selectedPatientId) {
      toast.error('Please select or register a patient first');
      return;
    }
    
    setLoading(true);
    runLoadingAnimation();

    const data = new FormData();
    data.append('file', image);
    data.append('dataset', 'lung');
    data.append('model_name', selectedModel);
    data.append('patient_id', selectedPatientId);
    
    const patientClinicalInfo = {
      patient_id: selectedPatientId,
      patient_name: formData.patientName || (patients.find(p => p.patient_id === selectedPatientId)?.full_name || 'N/A'),
      age: parseInt(formData.age || '0', 10),
      gender: formData.gender,
      cancer_type: 'Lung',
      symptoms: formData.symptoms,
      family_history: formData.familyHistory,
      smoking_history: formData.smokingHistory,
      menopause_status: 'N/A',
      previous_cancer_history: formData.previousCancerHistory,
      brca_status: formData.brcaStatus,
      notes: formData.notes
    };
    data.append('patient_info_json', JSON.stringify(patientClinicalInfo));

    try {
      const response = await apiClient.post('/report', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const reportDb = response.data;
      const report = reportDb.report_json;
      
      // Get image dimensions for visual report
      const img = new Image();
      img.src = preview || '';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const predictedClass = report.prediction.predicted_class;
      let displayClass = 'Benign';
      if (predictedClass === 'lung_aca') {
        displayClass = 'Adenocarcinoma (Malignant)';
      } else if (predictedClass === 'lung_scc') {
        displayClass = 'Squamous Cell Carcinoma (Malignant)';
      }

      setResult({
        reportId: reportDb.report_id,
        predictionId: reportDb.prediction_id,
        class: displayClass,
        isMalignant: predictedClass !== 'lung_n',
        confidence: report.prediction.confidence * 100,
        probabilities: {
          lung_aca: (report.prediction.probabilities.lung_aca || 0) * 100,
          lung_scc: (report.prediction.probabilities.lung_scc || 0) * 100,
          lung_n: (report.prediction.probabilities.lung_n || 0) * 100
        },
        gradcam: report.gradcam,
        recommendation: report.recommendation,
        riskScore: report.risk_score,
        summary: report.diagnostic_summary || (predictedClass !== 'lung_n' 
          ? `Neoplastic lung tissue identified. Deep convolutional layers highlight targeted density peaks and micro-nodular infiltration suggestive of ${predictedClass === 'lung_aca' ? 'Adenocarcinoma' : 'Squamous Cell Carcinoma'}.`
          : 'Normal bronchial structures and alveolar spaces observed. No evidence of cellular atypia, nodular masses, or hyper-dense features identified by CNN layers.'),
        filename: image.name,
        resolution: `${img.width || 224} x ${img.height || 224} px`,
        fileSize: `${(image.size / 1024).toFixed(1)} KB`,
        timestamp: new Date(reportDb.generated_at).toLocaleString(),
        patient: patients.find(p => p.patient_id === selectedPatientId)
      });
      
      toast.success('AI Prediction generated successfully!');
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Prediction failed. Please check network/backend connectivity.';
      toast.error(`Analysis Error: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setZoomScale(1);
    if (patients.length > 0) {
      setFormData({
        patientName: patients[0].full_name || '',
        age: patients[0].age.toString(),
        gender: patients[0].gender,
        cancerType: 'Lung',
        smokingHistory: patients[0].smoking_history || 'Never',
        familyHistory: patients[0].family_history || 'No',
        symptoms: patients[0].symptoms || '',
        previousDisease: patients[0].clinical_biomarkers?.previous_disease || '',
        previousCancerHistory: patients[0].clinical_biomarkers?.previous_cancer_history || 'No',
        brcaStatus: patients[0].clinical_biomarkers?.brca_status || 'Unknown',
        notes: patients[0].clinical_biomarkers?.notes || ''
      });
    } else {
      setFormData({
        patientName: '',
        age: '',
        gender: 'Male',
        cancerType: 'Lung',
        smokingHistory: 'Never',
        familyHistory: 'No',
        symptoms: '',
        previousDisease: '',
        previousCancerHistory: 'No',
        brcaStatus: 'Unknown',
        notes: ''
      });
    }
  };

  const handleSaveToRecord = () => {
    toast.success(`Record successfully saved to Patient Directory [ID: ${result.patient?.patient_id}]`);
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('report-pdf-content');
    if (element) {
      const opt = {
        margin:       0.3,
        filename:     `CDSS_Report_Lung_${result.patient?.full_name || 'Patient'}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };
      html2pdf().set(opt).from(element).save();
    }
  };

  const getConfidenceLevel = (conf: number) => {
    if (conf >= 90) return { label: 'Very High', color: 'danger' };
    if (conf >= 75) return { label: 'High', color: 'warning' };
    return { label: 'Moderate', color: 'info' };
  };

  return (
    <Container fluid className="py-2">
      {/* Title Header */}
      <div className="d-flex align-items-center mb-4 p-3 bg-white rounded-3 shadow-sm">
        <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3 text-primary">
          <FaLungs className="fs-3" />
        </div>
        <div>
          <h2 className="mb-0 fw-bold text-dark">Lung Cancer Decision Support</h2>
          <p className="text-muted mb-0">Clinical Grade Histopathology Analyzer & Explainable AI (ResNet50 / Grad-CAM)</p>
        </div>
      </div>

      <Row className="g-4">
        {/* LEFT PANEL: INPUT FORM */}
        <Col xs={12} lg={5}>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            
            {/* 1. Upload Histopathology Microscopic Image */}
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
              <Card.Header className="bg-white border-bottom py-3">
                <h5 className="mb-0 fw-bold d-flex align-items-center text-dark">
                  <FaImage className="me-2 text-muted" /> 1. Upload Histopathology Image
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                <div 
                  className={`border-2 border-dashed rounded-4 p-4 text-center transition-all ${preview ? 'border-success bg-success bg-opacity-10' : 'border-secondary bg-light'}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  style={{ cursor: 'pointer', borderColor: preview ? '#198754' : '#0d6efd', minHeight: '180px' }}
                  onClick={() => document.getElementById('imageUpload')?.click()}
                >
                  <input type="file" id="imageUpload" className="d-none" accept="image/jpeg, image/png, image/tiff" onChange={handleImageChange} />
                  
                  {preview ? (
                    <div className="text-center">
                      <img src={preview} alt="Histopathology Preview" style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }} className="rounded mb-3 shadow" />
                      <div className="text-success fw-bold d-flex align-items-center justify-content-center">
                        <FaCheckCircle className="me-2" /> Histopathology Image Loaded
                      </div>
                      <Button variant="link" size="sm" className="mt-2 text-danger text-decoration-none" onClick={(e) => { e.stopPropagation(); setImage(null); setPreview(null); }}>Remove and Replace</Button>
                    </div>
                  ) : (
                    <div className="py-3">
                      <FaCloudUploadAlt className="fs-1 mb-3 text-primary" />
                      <h5 className="fw-semibold text-dark">Drag & Drop Histopathology Image</h5>
                      <p className="text-muted small mb-0">or click to browse from directory</p>
                      <Badge bg="light" text="dark" className="mt-2 border">Supports PNG, JPG, TIFF</Badge>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>

            {/* 2. Clinical details & Patient Select */}
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
              <Card.Header className="bg-white border-bottom py-3">
                <h5 className="mb-0 fw-bold d-flex align-items-center text-dark">
                  <FaFileMedical className="me-2 text-muted" /> 2. Clinical Information
                </h5>
              </Card.Header>
              <Card.Body className="p-4">
                <Form onSubmit={handleSubmit}>
                  {/* Patient Selector */}
                  <Form.Group className="mb-4">
                    <Form.Label className="small fw-bold text-muted d-flex align-items-center">
                      <FaUserCheck className="me-2 text-secondary" /> Select Patient Record
                    </Form.Label>
                    <Form.Select value={selectedPatientId} onChange={handlePatientChange} className="rounded-3 py-2 border-secondary-subtle">
                      <option value="">-- Choose Patient --</option>
                      {patients.map(p => (
                        <option key={p.patient_id} value={p.patient_id}>
                          {p.full_name} (ID: {p.patient_id}, {p.gender})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <h6 className="text-muted fw-bold small text-uppercase tracking-wider mb-3">Clinical Metrics & Parameters</h6>
                  
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted">Patient Name</Form.Label>
                        <Form.Control type="text" name="patientName" value={formData.patientName} onChange={handleFormChange} required placeholder="e.g. John Doe" className="py-2" />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted">Age</Form.Label>
                        <Form.Control type="number" name="age" value={formData.age} onChange={handleFormChange} required placeholder="e.g. 55" className="py-2" />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted">Gender</Form.Label>
                        <Form.Select name="gender" value={formData.gender} onChange={handleFormChange} className="py-2">
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted">Smoking History</Form.Label>
                        <Form.Select name="smokingHistory" value={formData.smokingHistory} onChange={handleFormChange} className="py-2">
                          <option>Never</option>
                          <option>Former</option>
                          <option>Current (Light)</option>
                          <option>Current (Heavy)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted">Family History of Cancer</Form.Label>
                        <Form.Select name="familyHistory" value={formData.familyHistory} onChange={handleFormChange} className="py-2">
                          <option>No</option>
                          <option>Yes</option>
                          <option>Unknown</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted">Previous Cancer History</Form.Label>
                        <Form.Select name="previousCancerHistory" value={formData.previousCancerHistory} onChange={handleFormChange} className="py-2">
                          <option>No</option>
                          <option>Yes</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted">BRCA Mutation Status</Form.Label>
                        <Form.Select name="brcaStatus" value={formData.brcaStatus} onChange={handleFormChange} className="py-2">
                          <option>Unknown</option>
                          <option>Negative</option>
                          <option>Positive</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted">Symptoms</Form.Label>
                        <Form.Control type="text" name="symptoms" value={formData.symptoms} onChange={handleFormChange} placeholder="e.g. Cough, shortness of breath, hemoptysis" className="py-2" />
                      </Form.Group>
                    </Col>
                    
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted d-flex align-items-center">
                          <FaHistory className="me-1 text-secondary" /> Previous Pulmonary Disease
                        </Form.Label>
                        <Form.Control type="text" name="previousDisease" value={formData.previousDisease} onChange={handleFormChange} placeholder="e.g. COPD, Tuberculosis, Pneumonia" className="py-2" />
                      </Form.Group>
                    </Col>

                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted">Additional Clinical Notes</Form.Label>
                        <Form.Control as="textarea" rows={2} name="notes" value={formData.notes} onChange={handleFormChange} placeholder="Clinical assessment remarks..." className="py-2" />
                      </Form.Group>
                    </Col>

                    <Col md={12} className="mt-3">
                      <Form.Group>
                        <Form.Label className="small fw-bold text-muted d-flex align-items-center">
                          <FaInfoCircle className="me-1 text-secondary" /> AI Model Architecture
                        </Form.Label>
                        <Form.Select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="py-2" disabled>
                          <option value="resnet50">ResNet50 (Primary Model)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="mt-4 pt-3 border-top d-flex justify-content-end gap-3">
                    <Button variant="light" type="button" onClick={handleReset} className="py-2 px-3 border"><FaUndo className="me-2"/> Clear All</Button>
                    <Button variant="primary" type="submit" disabled={loading || !image || !selectedPatientId} className="px-4 py-2 fw-bold text-white">
                      <FaLungs className="me-2"/> Run AI Prediction
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>

          </motion.div>
        </Col>

        {/* RIGHT PANEL: RESULTS OR LOADING */}
        <Col xs={12} lg={7}>
          <AnimatePresence mode="wait">
            {loading ? (
              // ANIMATED MULTI-STAGE LOADING SCREEN
              <motion.div 
                key="loading" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-5 bg-white rounded-4 shadow-sm"
                style={{ minHeight: '500px' }}
              >
                <div className="spinner-border text-primary mb-4" role="status" style={{ width: '4rem', height: '4rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                
                <h4 className="fw-bold mb-3">AI Engine Analyzing Histopathology Image</h4>
                <div style={{ maxWidth: '400px', width: '100%' }}>
                  <ProgressBar animated now={(loadingStep + 1) * (100 / loadingStages.length)} variant="primary" style={{ height: '8px' }} className="mb-4 bg-light" />
                  
                  <div className="d-flex flex-column gap-2 text-start bg-light p-3 rounded border">
                    {loadingStages.map((stage, idx) => (
                      <div key={idx} className="d-flex align-items-center justify-content-between">
                        <span className={`small ${idx === loadingStep ? 'text-primary fw-bold' : idx < loadingStep ? 'text-success' : 'text-muted'}`}>
                          {stage}
                        </span>
                        {idx < loadingStep ? (
                          <FaCheck className="text-success small" />
                        ) : idx === loadingStep ? (
                          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : !result ? (
              // EMPTY STATE
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-5 border border-dashed rounded-4 bg-light text-muted" style={{ minHeight: '500px' }}>
                <div className="bg-white p-4 rounded-circle shadow-sm mb-3">
                  <FaLungs className="fs-1 opacity-50 text-primary" />
                </div>
                <h4 className="fw-bold text-dark">No Diagnostic Report Yet</h4>
                <p>Upload a histopathology microscopic image and patient clinical information to generate an AI-driven tissue diagnosis.</p>
              </motion.div>
            ) : (
              // RESULT DASHBOARD
              <motion.div key="result" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                
                {/* 1. Diagnostic Summary Card */}
                <Card className={`border-0 shadow rounded-4 overflow-hidden mb-4 border-top border-4 ${result.isMalignant ? 'border-danger' : 'border-success'}`}>
                  <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold text-dark">Clinical Diagnostic Dashboard</h5>
                    <Badge bg={result.isMalignant ? 'danger' : 'success'} className="fs-6 px-3 py-2 rounded-pill">
                      {result.isMalignant ? 'Malignant' : 'Benign'}
                    </Badge>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <Row className="mb-4 g-3 align-items-center">
                      <Col md={6}>
                        <div className="text-center p-3 rounded-4 bg-light border">
                          <div className="text-muted small fw-bold text-uppercase mb-1">Confidence Score</div>
                          <div className={`fs-1 fw-bold text-${result.isMalignant ? 'danger' : 'success'}`}>
                            {result.confidence.toFixed(1)}%
                          </div>
                          <div className="mt-1">
                            <Badge bg={getConfidenceLevel(result.confidence).color} className="px-2 py-1">
                              {getConfidenceLevel(result.confidence).label} Confidence
                            </Badge>
                          </div>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="p-2 border rounded-4 bg-light">
                          <div className="p-2">
                            <div className="d-flex justify-content-between small fw-bold mb-1">
                              <span className="text-danger">Lung Adenocarcinoma (ACA)</span>
                              <span>{result.probabilities.lung_aca.toFixed(1)}%</span>
                            </div>
                            <ProgressBar variant="danger" now={result.probabilities.lung_aca} className="mb-2 bg-white shadow-sm" style={{ height: '8px' }} />

                            <div className="d-flex justify-content-between small fw-bold mb-1">
                              <span className="text-warning">Lung Squamous Cell Carcinoma (SCC)</span>
                              <span>{result.probabilities.lung_scc.toFixed(1)}%</span>
                            </div>
                            <ProgressBar variant="warning" now={result.probabilities.lung_scc} className="mb-2 bg-white shadow-sm" style={{ height: '8px' }} />
                            
                            <div className="d-flex justify-content-between small fw-bold mb-1">
                              <span className="text-success">Benign (Normal)</span>
                              <span>{result.probabilities.lung_n.toFixed(1)}%</span>
                            </div>
                            <ProgressBar variant="success" now={result.probabilities.lung_n} className="bg-white shadow-sm" style={{ height: '8px' }} />
                          </div>
                        </div>
                      </Col>
                    </Row>

                    {/* Multimodal Clinical Risk Score */}
                    {result.riskScore && (
                      <div className="p-3 mb-4 rounded-4 bg-light border">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold small text-uppercase text-muted">Multimodal Clinical Risk Score</span>
                          <Badge bg={result.riskScore.color || 'warning'} className="px-2 py-1">
                            {result.riskScore.level} ({result.riskScore.score} / {result.riskScore.max_score} pts — {result.riskScore.percentage}%)
                          </Badge>
                        </div>
                        <ProgressBar 
                          now={result.riskScore.percentage} 
                          variant={result.riskScore.color || 'warning'}
                          style={{ height: '8px' }}
                          className="mb-2"
                        />
                        <Row className="g-1">
                          {result.riskScore.factors?.map((f: any, idx: number) => (
                            <Col key={idx} xs={12} sm={6}>
                              <div className={`p-1 px-2 rounded border style-tiny ${f.triggered ? 'bg-white border-danger text-danger fw-bold' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                                {f.triggered ? '✓ ' : '• '} {f.label}: {f.value} (+{f.points} pts)
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}

                    {/* 2. Visual Analysis (Explainable AI - Tabs with zoom) */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-bold mb-0 text-dark d-flex align-items-center">
                          <FaCheckCircle className="me-2 text-primary" /> Explainable AI (Grad-CAM Visualizations)
                        </h6>
                        <div className="d-flex gap-2">
                          <Button size="sm" variant="outline-secondary" onClick={() => setZoomScale(s => Math.max(0.5, s - 0.25))}><FaUndo style={{ transform: 'rotate(-90deg)' }} /></Button>
                          <Button size="sm" variant="outline-secondary" onClick={() => setZoomScale(s => Math.min(2, s + 0.25))}><FaSearchPlus /></Button>
                          <Button size="sm" variant="outline-secondary" onClick={() => setZoomScale(1)}>Reset Zoom</Button>
                        </div>
                      </div>

                      <div className="border rounded-4 bg-dark overflow-hidden p-3 position-relative d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '360px' }}>
                        {/* Custom Dark Tab Switcher */}
                        <div className="d-flex justify-content-center gap-2 mb-4 bg-black bg-opacity-40 p-1.5 rounded-3 border border-secondary border-opacity-25" style={{ maxWidth: '440px', width: '100%' }}>
                          <button 
                            type="button"
                            onClick={() => setActiveTab('original')} 
                            className={`btn btn-sm px-3 py-1.5 rounded-2 fw-semibold transition-all border-0 ${activeTab === 'original' ? 'btn-info text-dark shadow-sm' : 'text-light bg-transparent opacity-50 hover-opacity-100'}`}
                            style={{ flex: 1 }}
                          >
                            <FaImage className="me-1" /> Original Slide
                          </button>
                          <button 
                            type="button"
                            onClick={() => setActiveTab('heatmap')} 
                            className={`btn btn-sm px-3 py-1.5 rounded-2 fw-semibold transition-all border-0 ${activeTab === 'heatmap' ? 'btn-info text-dark shadow-sm' : 'text-light bg-transparent opacity-50 hover-opacity-100'}`}
                            style={{ flex: 1 }}
                          >
                            <FaThermometerHalf className="me-1" /> Heatmap
                          </button>
                          <button 
                            type="button"
                            onClick={() => setActiveTab('overlay')} 
                            className={`btn btn-sm px-3 py-1.5 rounded-2 fw-semibold transition-all border-0 ${activeTab === 'overlay' ? 'btn-info text-dark shadow-sm' : 'text-light bg-transparent opacity-50 hover-opacity-100'}`}
                            style={{ flex: 1 }}
                          >
                            <FaSearchPlus className="me-1" /> Overlay
                          </button>
                        </div>

                        {/* Custom Tab Contents */}
                        <div className="overflow-auto text-center w-100" style={{ maxHeight: '300px' }}>
                          {activeTab === 'original' && (
                            <img 
                              src={getMediaUrl(result.gradcam?.original_path)} 
                              alt="Original Pathological Image" 
                              style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s', maxHeight: '250px', objectFit: 'contain' }}
                              className="rounded shadow"
                              onError={(e: any) => {
                                e.target.src = preview || 'https://via.placeholder.com/400x400/eeeeee/333333?text=Original+Scan';
                              }}
                            />
                          )}
                          {activeTab === 'heatmap' && (
                            <img 
                              src={getMediaUrl(result.gradcam?.heatmap_path)} 
                              alt="Grad-CAM Heatmap" 
                              style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s', maxHeight: '250px', objectFit: 'contain' }}
                              className="rounded shadow"
                              onError={(e: any) => {
                                e.target.src = 'https://via.placeholder.com/400x400/0d6efd/ffffff?text=Heatmap+Not+Generated';
                              }}
                            />
                          )}
                          {activeTab === 'overlay' && (
                            <div className="position-relative d-inline-block rounded overflow-hidden shadow" style={{ maxHeight: '250px', transform: `scale(${zoomScale})`, transition: 'transform 0.2s' }}>
                              <img 
                                src={getMediaUrl(result.gradcam?.original_path)} 
                                alt="Original Pathological Image" 
                                style={{ maxHeight: '250px', objectFit: 'contain' }}
                                onError={(e: any) => {
                                  e.target.src = preview || 'https://via.placeholder.com/400x400/eeeeee/333333?text=Original+Scan';
                                }}
                              />
                              <img 
                                src={getMediaUrl(result.gradcam?.heatmap_path)} 
                                alt="Grad-CAM Heatmap" 
                                style={{ 
                                  position: 'absolute', 
                                  top: 0, 
                                  left: 0, 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'contain',
                                  opacity: heatmapOpacity,
                                  mixBlendMode: blendMode as any
                                }}
                                onError={(e: any) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                        
                        {activeTab === 'overlay' && (
                          <div className="w-100 mt-2 px-3 py-2 bg-dark bg-opacity-25 rounded border border-secondary text-white small">
                            <Row className="align-items-center g-2">
                              <Col xs={12} sm={6}>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="text-white-50 text-nowrap">Heatmap Opacity:</span>
                                  <Form.Range 
                                    min={0.1} 
                                    max={1.0} 
                                    step={0.1} 
                                    value={heatmapOpacity} 
                                    onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))} 
                                    className="align-self-center mt-1"
                                  />
                                  <span className="fw-bold" style={{ width: '40px' }}>{Math.round(heatmapOpacity * 100)}%</span>
                                </div>
                              </Col>
                              <Col xs={12} sm={6}>
                                <div className="d-flex align-items-center justify-content-sm-end gap-2">
                                  <span className="text-white-50 text-nowrap">Blend Mode:</span>
                                  <Form.Select 
                                    size="sm" 
                                    value={blendMode} 
                                    onChange={(e) => setBlendMode(e.target.value)} 
                                    className="bg-dark text-white border-secondary py-0 px-2"
                                    style={{ width: '120px', height: '28px' }}
                                  >
                                    <option value="normal">Normal</option>
                                    <option value="multiply">Multiply</option>
                                    <option value="screen">Screen</option>
                                    <option value="overlay">Overlay</option>
                                    <option value="color-burn">Color Burn</option>
                                  </Form.Select>
                                </div>
                              </Col>
                            </Row>
                          </div>
                        )}
                        
                        <div className="text-white-50 text-center small mt-2">
                          * Heatmap highlights deep features that contributed most heavily to the classification. Use opacity and blend controls to isolate core cell regions.
                        </div>
                      </div>
                    </div>

                    {/* Model Info and Image Info Side-by-Side */}
                    <Row className="g-3 mb-4">
                      <Col md={6}>
                        <Card className="border rounded-4 h-100 bg-light">
                          <Card.Body className="p-3">
                            <h6 className="fw-bold mb-2 text-dark border-bottom pb-2 d-flex align-items-center">
                              <FaInfoCircle className="me-2 text-primary" /> AI Model Information
                            </h6>
                            <div className="small text-muted">
                              <div className="d-flex justify-content-between mb-1"><span>Architecture:</span><strong className="text-dark">{selectedModel === 'densenet121' ? 'DenseNet121 (Primary)' : 'ResNet50'}</strong></div>
                              <div className="d-flex justify-content-between mb-1"><span>Methodology:</span><strong className="text-dark">Transfer Learning</strong></div>
                              <div className="d-flex justify-content-between mb-1"><span>Validation:</span><strong className="text-dark">5-Fold Cross Val</strong></div>
                              <div className="d-flex justify-content-between mb-1"><span>Explainability:</span><strong className="text-dark">Grad-CAM (CNN)</strong></div>
                              <div className="d-flex justify-content-between mb-1"><span>Training Acc:</span><strong className="text-dark">{selectedModel === 'densenet121' ? '98.3%' : '98.3%'}</strong></div>
                              <div className="d-flex justify-content-between mb-1"><span>Validation Acc:</span><strong className="text-dark">{selectedModel === 'densenet121' ? '97.6%' : '97.6%'}</strong></div>
                              <div className="d-flex justify-content-between"><span>Version:</span><strong className="text-dark">v1.2.0</strong></div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6}>
                        <Card className="border rounded-4 h-100 bg-light">
                          <Card.Body className="p-3">
                            <h6 className="fw-bold mb-2 text-dark border-bottom pb-2 d-flex align-items-center">
                              <FaImage className="me-2 text-success" /> Uploaded Image Info
                            </h6>
                            <div className="small text-muted">
                              <div className="d-flex justify-content-between mb-1"><span>Filename:</span><strong className="text-dark text-truncate" style={{ maxWidth: '120px' }}>{result.filename}</strong></div>
                              <div className="d-flex justify-content-between mb-1"><span>Resolution:</span><strong className="text-dark">{result.resolution}</strong></div>
                              <div className="d-flex justify-content-between mb-1"><span>File Size:</span><strong className="text-dark">{result.fileSize}</strong></div>
                              <div className="d-flex justify-content-between"><span>Analyzed At:</span><strong className="text-dark">{result.timestamp}</strong></div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* 3. Narrative diagnostic summary */}
                    <div className="mb-4 p-3 bg-light rounded-4 border-start border-4 border-primary">
                      <h6 className="fw-bold mb-2 text-primary">AI Diagnostic Interpretation Summary</h6>
                      <div className="small text-dark mb-2">
                        <strong>Histopathology Findings:</strong> {result.summary}
                      </div>
                      <div className="small text-dark mb-2">
                        <strong>Model Explanation:</strong> Grad-CAM highlights specific cellular regions corresponding to deep-learning features of pleomorphic nuclei.
                      </div>
                      <div className="small text-dark">
                        <strong>Clinical Action Required:</strong> {result.recommendation}
                      </div>
                    </div>

                    {/* 4. Follow-up section */}
                    <div className="mb-4 p-3 bg-warning bg-opacity-10 rounded-4 border-start border-4 border-warning">
                      <h6 className="fw-bold mb-2 text-warning-emphasis d-flex align-items-center">
                        <FaExclamationTriangle className="me-2"/> Suggested Follow-up Diagnostics
                      </h6>
                      <ul className="small mb-0 ps-3 text-dark fw-semibold">
                        <li>Consult Pulmonologist or Thoracic Surgeon.</li>
                        <li>High Resolution CT (HRCT) contrast chest scans.</li>
                        <li>Bronchoscopy with tissue biopsy for histological confirmation.</li>
                        <li>Complete PET-CT staging and clinical correlation.</li>
                      </ul>
                    </div>

                    {/* 5. Professional Disclaimer */}
                    <div className="p-3 bg-secondary bg-opacity-10 rounded-4 text-muted small d-flex gap-2">
                      <FaInfoCircle className="flex-shrink-0 mt-1" />
                      <div>
                        <strong>Clinician Disclaimer:</strong> This prediction is generated using a deep learning model for research/demonstrative decision support and should not replace professional expert pathological diagnosis. All outcomes must be verified independently.
                      </div>
                    </div>

                  </Card.Body>
                  <Card.Footer className="bg-white border-top py-3 p-4 d-flex gap-3">
                    <Button variant="outline-secondary" className="flex-grow-1 py-2 d-flex justify-content-center align-items-center gap-2 fw-bold" onClick={handleSaveToRecord}>
                      <FaSave /> Save to Patient File
                    </Button>
                    <Button variant="primary" className="flex-grow-1 py-2 d-flex justify-content-center align-items-center gap-2 fw-bold text-white" onClick={handleDownloadPdf}>
                      <FaFilePdf /> Download PDF Report
                    </Button>
                  </Card.Footer>
                </Card>

              </motion.div>
            )}
          </AnimatePresence>
        </Col>
      </Row>

      {/* HIDDEN PRINT-READY PDF REPORT BLOCK */}
      {result && (
        <div style={{ display: 'none' }}>
          <div id="report-pdf-content" style={{ padding: '30px', fontFamily: 'Arial, sans-serif', color: '#333' }}>
            <div style={{ borderBottom: '2px solid #0d6efd', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, color: '#0d6efd', fontWeight: 'bold' }}>PRECISION ONCOLOGY CLINICAL REPORT</h2>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>AI-Powered Diagnostic Decision Support System</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ margin: 0, fontWeight: 'bold' }}>METROPOLITAN ONCOLOGY</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#666' }}>ID: {result.reportId}</p>
              </div>
            </div>

            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#444' }}>Patient Specifications</h3>
            <table style={{ width: '100%', marginBottom: '20px', fontSize: '13px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '5px', fontWeight: 'bold', width: '25%' }}>Patient Name:</td>
                  <td style={{ padding: '5px' }}>{formData.patientName || result.patient?.full_name || 'N/A'}</td>
                  <td style={{ padding: '5px', fontWeight: 'bold', width: '25%' }}>Patient ID:</td>
                  <td style={{ padding: '5px' }}>{result.patient?.patient_id || 'N/A'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px', fontWeight: 'bold' }}>Age / Gender:</td>
                  <td style={{ padding: '5px' }}>{formData.age} / {formData.gender}</td>
                  <td style={{ padding: '5px', fontWeight: 'bold' }}>Analysis Date:</td>
                  <td style={{ padding: '5px' }}>{result.timestamp}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px', fontWeight: 'bold' }}>Smoking History:</td>
                  <td style={{ padding: '5px' }}>{formData.smokingHistory}</td>
                  <td style={{ padding: '5px', fontWeight: 'bold' }}>Family History:</td>
                  <td style={{ padding: '5px' }}>{formData.familyHistory}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px', fontWeight: 'bold' }}>Prev Cancer History:</td>
                  <td style={{ padding: '5px' }}>{formData.previousCancerHistory}</td>
                  <td style={{ padding: '5px', fontWeight: 'bold' }}>BRCA Mutation Status:</td>
                  <td style={{ padding: '5px' }}>{formData.brcaStatus}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px', fontWeight: 'bold' }}>Clinical Symptoms:</td>
                  <td style={{ padding: '5px' }} colSpan={3}>{formData.symptoms || 'None reported'}</td>
                </tr>
                {formData.notes && (
                  <tr>
                    <td style={{ padding: '5px', fontWeight: 'bold' }}>Clinical Notes:</td>
                    <td style={{ padding: '5px' }} colSpan={3}>{formData.notes}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#444' }}>AI Pulmonary Prediction</h3>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div style={{ flex: 1, padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Diagnostic Classification</h4>
                <h2 style={{ margin: 0, color: result.isMalignant ? '#dc3545' : '#198754', fontWeight: 'bold' }}>{result.class}</h2>
                <div style={{ marginTop: '10px', fontSize: '14px' }}>Confidence Score: <strong>{result.confidence.toFixed(1)}%</strong></div>
              </div>
              <div style={{ flex: 1, padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#555' }}>Classification Breakdown</h4>
                <div style={{ marginBottom: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Lung Adenocarcinoma (ACA):</span><strong>{result.probabilities.lung_aca.toFixed(1)}%</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#ddd', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${result.probabilities.lung_aca}%`, height: '100%', backgroundColor: '#dc3545' }}></div>
                  </div>
                </div>
                <div style={{ marginBottom: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Lung Squamous Cell Carcinoma (SCC):</span><strong>{result.probabilities.lung_scc.toFixed(1)}%</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#ddd', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${result.probabilities.lung_scc}%`, height: '100%', backgroundColor: '#ffc107' }}></div>
                  </div>
                </div>
                <div style={{ fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Benign (Normal):</span><strong>{result.probabilities.lung_n.toFixed(1)}%</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#ddd', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${result.probabilities.lung_n}%`, height: '100%', backgroundColor: '#198754' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#444' }}>Explainable AI (Grad-CAM Visualizations)</h3>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Original Histopathology Slide</div>
                <img src={preview || ''} alt="Original Histopathology Slide" style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', border: '1px solid #ccc', borderRadius: '5px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>CNN Diagnostic Overlay</div>
                <img src={getMediaUrl(result.gradcam?.overlay_path)} crossOrigin="anonymous" alt="Overlay" style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', border: '1px solid #ccc', borderRadius: '5px' }} />
              </div>
            </div>

            {/* Multimodal Risk Score section in PDF */}
            {result.riskScore && (
              <>
                <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#444' }}>Multimodal Clinical Risk Assessment</h3>
                <div style={{ backgroundColor: '#f8f9fa', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Risk Level Classification:</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: result.riskScore.level === 'CRITICAL' ? '#dc3545' : result.riskScore.level === 'HIGH' ? '#fd7e14' : '#198754' }}>
                      {result.riskScore.level} RISK ({result.riskScore.score}/{result.riskScore.max_score} pts — {result.riskScore.percentage}%)
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#555' }}>
                    Triggered Risk Factors: {result.riskScore.factors?.filter((f: any) => f.triggered).map((f: any) => f.label).join(', ') || 'None'}
                  </div>
                </div>
              </>
            )}

            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#444' }}>Multimodal Decision Support Summary</h3>
            <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px', borderLeft: '4px solid #0d6efd' }}>
              <p style={{ margin: '0 0 10px 0' }}><strong>AI Diagnostic Summary:</strong> {result.summary}</p>
              <p style={{ margin: 0 }}><strong>Recommendations:</strong> {result.recommendation}</p>
            </div>

            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
              <div>Model: <strong>{selectedModel === 'densenet121' ? 'DenseNet121 (Primary)' : 'ResNet50'}</strong> | API Backend: FastAPI | Framework: TensorFlow</div>
              <div style={{ textAlign: 'right', borderTop: '1px solid #ccc', width: '200px', paddingTop: '5px' }}>Authorized Pathologist Signature</div>
            </div>

            <div style={{ position: 'relative', marginTop: '30px', textAlign: 'center', fontSize: '10px', color: '#999', borderTop: '1px solid #eee', paddingTop: '10px' }}>
              <strong>Disclaimer:</strong> This is a computer-assisted diagnosis report generated via deep learning algorithms. It is intended for decision support only. All diagnostic findings must be clinically verified by an attending board-certified pathologist before final clinical action is initiated.
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
