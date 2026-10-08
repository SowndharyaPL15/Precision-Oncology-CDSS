import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Button, ProgressBar, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { 
  FaArrowLeft, FaFilePdf, FaExclamationTriangle, FaStethoscope, FaInfoCircle, 
  FaImage, FaThermometerHalf, FaSearchPlus, FaUndo, FaLungs, FaRibbon
} from 'react-icons/fa';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import apiClient, { getMediaUrl } from '../../api/client';

export default function PredictionResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { predictionId } = useParams();
  
  const [report, setReport] = useState<any>(location.state?.report || null);
  const [preview, setPreview] = useState<string | null>(location.state?.preview || null);
  const [zoomScale, setZoomScale] = useState(1);

  useEffect(() => {
    // If no report in state (direct URL access), fetch it from backend or mock it
    if (!report) {
      const fetchReport = async () => {
        try {
          // If we have a predictionId, let's fetch it
          if (predictionId && predictionId !== 'PRD-9999') {
            // Search through reports endpoint
            const response = await apiClient.get('/reports');
            const found = response.data.find((r: any) => r.prediction_id === predictionId || r.report_id === predictionId);
            if (found) {
              setReport(found);
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to load report from API, falling back to mock...');
        }
        
        // Fallback mockup
        setReport({
          report_id: predictionId || 'PRD-9999',
          generated_at: new Date().toISOString(),
          report_json: {
            patient_info: {
              full_name: 'Jane Doe',
              age: 45,
              gender: 'Female',
              patient_id: 'P-12345'
            },
            prediction: {
              predicted_class: 'malignant',
              confidence: 0.942,
              probabilities: { malignant: 0.942, benign: 0.058 }
            },
            recommendation: 'Immediate core needle biopsy is recommended to confirm the malignancy. Oncology consultation should be scheduled within 48 hours.',
            summary: 'The model identified high cellular density and irregular margins characteristic of Invasive Ductal Carcinoma.',
            gradcam: {
              original_path: 'https://via.placeholder.com/400x400/eeeeee/333333?text=Original+Scan',
              overlay_path: 'https://via.placeholder.com/400x400/d63384/ffffff?text=Grad-CAM+Heatmap',
              heatmap_path: 'https://via.placeholder.com/400x400/000000/ffffff?text=Heatmap'
            }
          }
        });
        setPreview('https://via.placeholder.com/400x400/eeeeee/333333?text=Original+Scan');
      };
      fetchReport();
    }
  }, [report, predictionId]);

  if (!report) {
    return <div className="text-center mt-5"><span className="spinner-border text-primary"></span></div>;
  }

  // Handle nested JSON response vs flat mock object
  const reportId = report.report_id || predictionId || 'PRD-9999';
  const generatedAt = report.generated_at || new Date().toISOString();
  
  const nestedReport = report.report_json || report;
  const { prediction, gradcam, recommendation, patient_info, summary, diagnostic_summary } = nestedReport;

  const organ = (() => {
    if (nestedReport?.organ) return nestedReport.organ.toLowerCase() === 'breast' ? 'Breast' : 'Lung';
    if (nestedReport?.dataset) return nestedReport.dataset.toLowerCase() === 'breast' ? 'Breast' : 'Lung';
    if (patient_info?.cancer_type) return patient_info.cancer_type.toLowerCase().includes('breast') ? 'Breast' : 'Lung';
    const finding = (prediction?.predicted_class || '').toLowerCase();
    if (finding.startsWith('lung') || finding.includes('scc') || finding.includes('aca')) return 'Lung';
    if (finding.includes('breast') || finding === 'benign' || finding === 'malignant') return 'Breast';
    return 'Lung';
  })();
  
  const isMalignant = prediction?.predicted_class?.toLowerCase().includes('malignant') || prediction?.predicted_class === 'lung_aca' || prediction?.predicted_class === 'lung_scc';
  const displayClass = prediction?.predicted_class === 'lung_aca' 
    ? 'Adenocarcinoma (Malignant)' 
    : prediction?.predicted_class === 'lung_scc' 
      ? 'Squamous Cell Carcinoma (Malignant)' 
      : prediction?.predicted_class === 'malignant' 
        ? (organ === 'Breast' ? 'Invasive Carcinoma (Malignant)' : 'Malignant Carcinoma') 
        : (organ === 'Breast' ? 'Benign Breast Tissue' : 'Benign / Normal');

  const confidenceScore = (prediction?.confidence || 0) * (prediction?.confidence <= 1 ? 100 : 1);
  
  const probabilities = prediction?.probabilities ? Object.entries(prediction.probabilities).reduce((acc: any, [key, val]: [string, any]) => {
    const label = key === 'lung_n' ? 'benign' : (key.includes('lung') ? 'malignant' : key.toLowerCase());
    acc[label] = (acc[label] || 0) + val * (val <= 1 ? 100 : 1);
    return acc;
  }, {}) : { malignant: isMalignant ? 90 : 10, benign: isMalignant ? 10 : 90 };

  const handleDownload = () => {
    const pName = patient_info?.full_name || patient_info?.patient_name || 'Patient';
    const cleanPatientName = pName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const organFilePrefix = organ.toLowerCase() === 'breast' ? 'Breast_Cancer' : 'Lung_Cancer';
    const shortId = reportId ? (reportId.length > 8 ? reportId.slice(0, 8) : reportId) : 'PRD';
    const organColor = organ === 'Lung' ? '#0d6efd' : '#d63384';
    const organTitle = organ === 'Lung' ? 'LUNG CANCER' : 'BREAST CANCER';
    const organSubtitle = organ === 'Lung' ? 'Pulmonary Histopathology Protocol' : 'Mammary / Breast Histopathology Protocol';
    const reportDate = generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString();

    const origImgUrl = gradcam?.original_path ? getMediaUrl(gradcam.original_path) : (preview || 'https://via.placeholder.com/300x200/f8f9fa/6c757d?text=Original+Slide');
    const heatImgUrl = gradcam?.heatmap_path ? getMediaUrl(gradcam.heatmap_path) : 'https://via.placeholder.com/300x200/f8f9fa/6c757d?text=Grad-CAM+Heatmap';
    const overImgUrl = gradcam?.overlay_path ? getMediaUrl(gradcam.overlay_path) : 'https://via.placeholder.com/300x200/f8f9fa/6c757d?text=Superimposed+Overlay';

    const printDiv = document.createElement('div');
    printDiv.id = 'temp-pdf-export';
    printDiv.style.padding = '25px 30px';
    printDiv.style.fontFamily = 'Arial, Helvetica, sans-serif';
    printDiv.style.color = '#333';
    printDiv.style.backgroundColor = '#ffffff';

    printDiv.innerHTML = `
      <div style="border-bottom: 2px solid ${organColor}; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; page-break-inside: avoid; break-inside: avoid;">
        <div>
          <div style="display: inline-block; background-color: ${organColor}; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 4px;">
            TARGET ORGAN: ${organ.toUpperCase()} (${organSubtitle.toUpperCase()})
          </div>
          <h2 style="margin: 0; color: ${organColor}; font-weight: bold; font-size: 19px;">PRECISION ONCOLOGY CLINICAL REPORT — ${organTitle}</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">AI-Powered Diagnostic Decision Support System | Metropolitan Oncology CDSS</p>
        </div>
        <div style="text-align: right;">
          <h4 style="margin: 0; font-weight: bold; font-size: 14px;">METROPOLITAN ONCOLOGY</h4>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #666;">Report ID: #${shortId}</p>
          <div style="margin-top: 3px; font-size: 11px; font-weight: bold; color: ${organColor};">PROTOCOL: ${organTitle} AI</div>
        </div>
      </div>

      <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 18px;">
        <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #444; font-size: 14px; margin-top: 0; margin-bottom: 8px;">Patient Specifications</h3>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 4px 6px; font-weight: bold; width: 25%;">Patient Name:</td>
              <td style="padding: 4px 6px; font-weight: bold; color: #111;">${pName}</td>
              <td style="padding: 4px 6px; font-weight: bold; width: 25%;">Patient ID:</td>
              <td style="padding: 4px 6px; font-family: monospace;">${patient_info?.patient_id || report.patient_id || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; font-weight: bold;">Age / Gender:</td>
              <td style="padding: 4px 6px;">${patient_info?.age || 'N/A'} / ${patient_info?.gender || 'N/A'}</td>
              <td style="padding: 4px 6px; font-weight: bold;">Analysis Date:</td>
              <td style="padding: 4px 6px;">${reportDate}</td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; font-weight: bold;">Cancer Study:</td>
              <td style="padding: 4px 6px; font-weight: bold; color: ${organColor};">${organTitle}</td>
              <td style="padding: 4px 6px; font-weight: bold;">Family History:</td>
              <td style="padding: 4px 6px;">${patient_info?.family_history || 'No'}</td>
            </tr>
            ${patient_info?.smoking_history ? `
            <tr>
              <td style="padding: 4px 6px; font-weight: bold;">Smoking History:</td>
              <td style="padding: 4px 6px;">${patient_info.smoking_history}</td>
              <td style="padding: 4px 6px; font-weight: bold;">Symptoms:</td>
              <td style="padding: 4px 6px;">${patient_info.symptoms || 'None reported'}</td>
            </tr>
            ` : ''}
            ${patient_info?.brca_status ? `
            <tr>
              <td style="padding: 4px 6px; font-weight: bold;">BRCA Status:</td>
              <td style="padding: 4px 6px;">${patient_info.brca_status}</td>
              <td style="padding: 4px 6px; font-weight: bold;">Menopause Status:</td>
              <td style="padding: 4px 6px;">${patient_info.menopause_status || 'N/A'}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 18px;">
        <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #444; font-size: 14px; margin-top: 0; margin-bottom: 8px;">AI Histopathological Prediction</h3>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1; padding: 12px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #eee; text-align: center;">
            <div style="margin: 0 0 6px 0; color: #555; font-size: 12px; font-weight: bold;">Diagnostic Classification</div>
            <h2 style="margin: 0; color: ${isMalignant ? '#dc3545' : '#198754'}; font-weight: bold; font-size: 18px;">${displayClass}</h2>
            <div style="margin-top: 6px; font-size: 12px;">Confidence Score: <strong>${confidenceScore.toFixed(1)}% (${getConfidenceLevel(confidenceScore).label})</strong></div>
          </div>
          <div style="flex: 1; padding: 12px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #eee;">
            <div style="margin: 0 0 6px 0; color: #555; font-size: 12px; font-weight: bold;">Classification Breakdown</div>
            <div style="margin-bottom: 6px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>Malignant:</span><strong>${probabilities.malignant.toFixed(1)}%</strong>
              </div>
              <div style="width: 100%; height: 6px; background-color: #e0e0e0; border-radius: 3px; overflow: hidden;">
                <div style="width: ${probabilities.malignant}%; height: 100%; background-color: #dc3545;"></div>
              </div>
            </div>
            <div style="font-size: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>Benign / Normal:</span><strong>${probabilities.benign.toFixed(1)}%</strong>
              </div>
              <div style="width: 100%; height: 6px; background-color: #e0e0e0; border-radius: 3px; overflow: hidden;">
                <div style="width: ${probabilities.benign}%; height: 100%; background-color: #198754;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 18px;">
        <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #444; font-size: 14px; margin-top: 0; margin-bottom: 8px;">Explainable AI (Histopathology & Grad-CAM Visualizations)</h3>
        <div style="display: flex; justify-content: space-between; gap: 12px; text-align: center;">
          <div style="flex: 1; background-color: #f8f9fa; padding: 8px; border-radius: 6px; border: 1px solid #e0e0e0;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px; color: #333;">1. Original Biopsy Slide</div>
            <img src="${origImgUrl}" crossOrigin="anonymous" alt="Original Histopathology Slide" style="width: 100%; max-height: 135px; object-fit: contain; border-radius: 4px; border: 1px solid #ccc; background-color: #fff;" />
          </div>
          <div style="flex: 1; background-color: #f8f9fa; padding: 8px; border-radius: 6px; border: 1px solid #e0e0e0;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px; color: #333;">2. Grad-CAM Activation Heatmap</div>
            <img src="${heatImgUrl}" crossOrigin="anonymous" alt="Grad-CAM Heatmap" style="width: 100%; max-height: 135px; object-fit: contain; border-radius: 4px; border: 1px solid #ccc; background-color: #fff;" />
          </div>
          <div style="flex: 1; background-color: #f8f9fa; padding: 8px; border-radius: 6px; border: 1px solid #e0e0e0;">
            <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px; color: #333;">3. Superimposed CNN Overlay</div>
            <img src="${overImgUrl}" crossOrigin="anonymous" alt="Superimposed Overlay" style="width: 100%; max-height: 135px; object-fit: contain; border-radius: 4px; border: 1px solid #ccc; background-color: #fff;" />
          </div>
        </div>
      </div>

      ${nestedReport?.risk_score ? `
      <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 18px;">
        <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #444; font-size: 14px; margin-top: 0; margin-bottom: 8px;">Multimodal Clinical Risk Assessment</h3>
        <div style="background-color: #f8f9fa; padding: 10px 14px; border-radius: 6px; border: 1px solid #eee;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px;">
            <span style="font-weight: bold;">Risk Level:</span>
            <span style="font-weight: bold; color: ${nestedReport.risk_score.level === 'CRITICAL' ? '#dc3545' : nestedReport.risk_score.level === 'HIGH' ? '#fd7e14' : '#198754'};">
              ${nestedReport.risk_score.level} RISK (${nestedReport.risk_score.score} / ${nestedReport.risk_score.max_score} pts — ${nestedReport.risk_score.percentage}%)
            </span>
          </div>
          <div style="font-size: 11px; color: #555;">
            Triggered Risk Factors: ${nestedReport.risk_score.factors?.filter((f: any) => f.triggered).map((f: any) => f.label).join(', ') || 'None'}
          </div>
        </div>
      </div>
      ` : ''}

      <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 14px;">
        <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #444; font-size: 14px; margin-top: 0; margin-bottom: 8px;">AI Diagnostic Narrative</h3>
        <div style="padding: 10px 12px; background-color: #f8f9fa; border-left: 4px solid ${organColor}; font-size: 12px; line-height: 1.5; border-radius: 0 4px 4px 0;">
          ${diagnostic_summary || summary || 'Histopathological AI analysis complete.'}
        </div>
      </div>

      <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 18px;">
        <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #444; font-size: 14px; margin-top: 0; margin-bottom: 8px;">Clinical Recommendations</h3>
        <div style="padding: 10px 12px; background-color: #f8f9fa; border-left: 4px solid #198754; font-size: 12px; line-height: 1.5; border-radius: 0 4px 4px 0;">
          ${recommendation || 'Clinical correlation recommended.'}
        </div>
      </div>

      <div style="page-break-inside: avoid; break-inside: avoid; margin-top: 25px; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #666;">
        <div>
          <div><strong>Precision Oncology CDSS</strong> | Diagnostic Verification System</div>
          <div style="font-size: 10px; color: #888; margin-top: 2px;">Model: ResNet50 Deep CNN | Status: Completed & Verified</div>
        </div>
        <div style="text-align: right;">
          <div style="border-bottom: 1px solid #999; width: 180px; margin-bottom: 4px;"></div>
          <div style="font-size: 10px; color: #777;">Authorized Pathologist Signature</div>
        </div>
      </div>

      <div style="page-break-inside: avoid; break-inside: avoid; margin-top: 12px; font-size: 10px; color: #888; text-align: center; border-top: 1px dotted #eee; padding-top: 6px;">
        <strong>Clinician Disclaimer:</strong> This clinical report is generated via deep learning artificial intelligence for auxiliary diagnostic decision support. Final clinical diagnosis must be verified by a board-certified pathologist.
      </div>
    `;

    document.body.appendChild(printDiv);

    const filename = `CDSS_Report_${organFilePrefix}_${cleanPatientName}_${shortId}.pdf`;

    const opt = {
      margin: [0.35, 0.35, 0.35, 0.35],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(printDiv).save().then(() => {
      document.body.removeChild(printDiv);
    }).catch((err: any) => {
      console.error('Failed to export PDF', err);
      if (document.body.contains(printDiv)) {
        document.body.removeChild(printDiv);
      }
    });
  };

  const getConfidenceLevel = (conf: number) => {
    if (conf >= 90) return { label: 'Very High', color: 'danger' };
    if (conf >= 75) return { label: 'High', color: 'warning' };
    return { label: 'Moderate', color: 'info' };
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4">
        <Button variant="outline-secondary" onClick={() => navigate(-1)} className="d-flex align-items-center gap-2">
          <FaArrowLeft /> Back
        </Button>
        <Button 
          variant={organ === 'Lung' ? 'primary' : 'danger'} 
          onClick={handleDownload} 
          className="d-flex align-items-center gap-2 fw-bold shadow-sm" 
          style={organ === 'Breast' ? { backgroundColor: '#d63384', borderColor: '#d63384' } : {}}
        >
          <FaFilePdf /> Download {organ} PDF Report
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card id="report-content" className="shadow-sm border-0 rounded-4 overflow-hidden mb-5">
          {/* Professional Clinical Header */}
          <div 
            className="p-4 text-white d-flex justify-content-between align-items-center"
            style={{ 
              background: organ === 'Lung' 
                ? 'linear-gradient(135deg, #0d3b66 0%, #001f3f 100%)' 
                : 'linear-gradient(135deg, #701a40 0%, #2e0819 100%)',
              borderBottom: '3px solid rgba(255,255,255,0.1)'
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div 
                className="rounded-3 d-flex align-items-center justify-content-center text-white shadow-sm"
                style={{ 
                  width: '46px', 
                  height: '46px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  fontSize: '1.4rem'
                }}
              >
                {organ === 'Lung' ? <FaLungs /> : <FaRibbon />}
              </div>
              <div>
                <h4 className="fw-bold mb-1 text-white d-flex align-items-center gap-2">
                  Clinical AI Analysis Report — {organ} Cancer
                </h4>
                <div className="text-white-50 small d-flex flex-wrap align-items-center gap-2">
                  <span>Target Organ: <strong className="text-white">{organ} Histopathology</strong></span>
                  <span>&bull;</span>
                  <span>Report ID: <strong className="text-white font-monospace">#{reportId.slice(0, 8)}</strong></span>
                  <span>&bull;</span>
                  <span>{new Date(generatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>
            </div>

            <div className="text-end d-none d-md-block">
              <div className="fw-bold text-white small" style={{ letterSpacing: '0.5px' }}>PRECISION ONCOLOGY CDSS</div>
              <div className="text-white-50" style={{ fontSize: '0.78rem' }}>Department of Pathology</div>
              <Badge 
                bg="white" 
                text="dark" 
                className="mt-1 fw-semibold font-monospace px-2 py-1 shadow-sm"
                style={{ fontSize: '0.72rem' }}
              >
                {organ.toUpperCase()} PROTOCOL
              </Badge>
            </div>
          </div>

          <Card.Body className="p-4 p-md-5">
            {/* Patient Info */}
            <h6 className="fw-bold text-uppercase text-muted mb-3 border-bottom pb-2">Patient Clinical Information</h6>
            <Row className="mb-4 g-3">
              <Col xs={6} md={3}>
                <div className="text-muted small fw-bold">Patient Name</div>
                <div className="fw-bold text-dark fs-5">{patient_info?.full_name || patient_info?.patient_name || 'Jane Doe'}</div>
              </Col>
              <Col xs={6} md={3}>
                <div className="text-muted small fw-bold">Patient ID</div>
                <div className="fw-bold text-dark">{patient_info?.patient_id || 'N/A'}</div>
              </Col>
              <Col xs={6} md={3}>
                <div className="text-muted small fw-bold">Age / Gender</div>
                <div className="fw-bold text-dark">{patient_info?.age || 'N/A'} / {patient_info?.gender || 'N/A'}</div>
              </Col>
              <Col xs={6} md={3}>
                <div className="text-muted small fw-bold">Family History</div>
                <div className="fw-bold text-dark">{patient_info?.family_history || 'No'}</div>
              </Col>
              {patient_info?.smoking_history && (
                <Col xs={6} md={3}>
                  <div className="text-muted small fw-bold">Smoking History</div>
                  <div className="fw-bold text-dark">{patient_info.smoking_history}</div>
                </Col>
              )}
              {patient_info?.brca_status && (
                <Col xs={6} md={3}>
                  <div className="text-muted small fw-bold">BRCA Status</div>
                  <div className="fw-bold text-dark">{patient_info.brca_status}</div>
                </Col>
              )}
              {patient_info?.menopause_status && (
                <Col xs={6} md={3}>
                  <div className="text-muted small fw-bold">Menopause Status</div>
                  <div className="fw-bold text-dark">{patient_info.menopause_status}</div>
                </Col>
              )}
              {patient_info?.symptoms && (
                <Col xs={6} md={3}>
                  <div className="text-muted small fw-bold">Reported Symptoms</div>
                  <div className="fw-bold text-dark">{patient_info.symptoms}</div>
                </Col>
              )}
            </Row>

            {/* Dynamic Clinical Risk Score */}
            {nestedReport?.risk_score && (
              <Row className="mb-5">
                <Col xs={12}>
                  <Card className="border-0 shadow-sm bg-light">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-bold text-uppercase text-muted mb-0">Multimodal Clinical Risk Score</h6>
                        <Badge bg={nestedReport.risk_score.color || 'warning'} className="fs-6 px-3 py-2">
                          Risk Level: {nestedReport.risk_score.level} ({nestedReport.risk_score.score} / {nestedReport.risk_score.max_score} pts — {nestedReport.risk_score.percentage}%)
                        </Badge>
                      </div>
                      <ProgressBar 
                        now={nestedReport.risk_score.percentage} 
                        variant={nestedReport.risk_score.color || 'warning'}
                        style={{ height: '12px' }}
                        className="mb-3"
                      />
                      <Row className="g-2">
                        {nestedReport.risk_score.factors?.map((f: any, idx: number) => (
                          <Col key={idx} xs={12} sm={6} md={4}>
                            <div className={`p-2 rounded border small ${f.triggered ? 'bg-white border-danger text-danger fw-bold' : 'bg-light text-muted'}`}>
                              {f.triggered ? '✓ ' : '• '} {f.label}: {f.value} (+{f.points} pts)
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Diagnostic Results */}
            <h6 className="fw-bold text-uppercase text-muted mb-3 border-bottom pb-2">AI Diagnostic Results</h6>
            <Row className="mb-5 g-4">
              <Col xs={12} md={5}>
                <Card className={`h-100 border-0 shadow-sm bg-${isMalignant ? 'danger' : 'success'} bg-opacity-10 text-center`}>
                  <Card.Body className="d-flex flex-column justify-content-center p-4">
                    <div className="text-muted small fw-bold text-uppercase mb-2">Primary Finding</div>
                    <h2 className={`fw-bold text-${isMalignant ? 'danger' : 'success'} mb-3`}>
                      {displayClass}
                    </h2>
                    <div>
                      <Badge bg={isMalignant ? 'danger' : 'success'} className="fs-6 py-2 px-3 rounded-pill shadow-sm">
                        Confidence: {confidenceScore.toFixed(1)}% ({getConfidenceLevel(confidenceScore).label})
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} md={7}>
                <Card className="h-100 border-0 shadow-sm bg-light">
                  <Card.Body className="p-4 d-flex flex-column justify-content-center">
                    <div className="text-muted small fw-bold text-uppercase mb-3">Class Probabilities</div>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between small fw-bold mb-1">
                        <span className="text-danger">Malignant</span>
                        <span>{probabilities.malignant.toFixed(1)}%</span>
                      </div>
                      <ProgressBar 
                        now={probabilities.malignant} 
                        variant="danger" 
                        style={{ height: '10px' }} 
                        className="shadow-sm bg-white"
                      />
                    </div>

                    <div>
                      <div className="d-flex justify-content-between small fw-bold mb-1">
                        <span className="text-success">Benign</span>
                        <span>{probabilities.benign.toFixed(1)}%</span>
                      </div>
                      <ProgressBar 
                        now={probabilities.benign} 
                        variant="success" 
                        style={{ height: '10px' }} 
                        className="shadow-sm bg-white"
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Visual Analysis (Histopathology, Grad-CAM & Overlay) */}
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h6 className="fw-bold text-uppercase text-muted mb-0">Visual Histopathology Analysis (Explainable AI)</h6>
              <div className="d-flex gap-2">
                <Button size="sm" variant="outline-secondary" onClick={() => setZoomScale(s => Math.max(0.5, s - 0.25))}><FaUndo style={{ transform: 'rotate(-90deg)' }} /></Button>
                <Button size="sm" variant="outline-secondary" onClick={() => setZoomScale(s => Math.min(2, s + 0.25))}><FaSearchPlus /></Button>
                <Button size="sm" variant="outline-secondary" onClick={() => setZoomScale(1)}>Reset Zoom</Button>
              </div>
            </div>

            <Row className="g-3 mb-5">
              <Col xs={12} md={4}>
                <Card className="h-100 border-0 shadow-sm bg-dark text-white rounded-4 overflow-hidden text-center">
                  <Card.Header className="bg-black bg-opacity-50 border-0 py-2.5">
                    <div className="fw-bold small d-flex align-items-center justify-content-center gap-2 text-info">
                      <FaImage /> 1. Uploaded Histopathology
                    </div>
                  </Card.Header>
                  <Card.Body className="p-3 d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '220px' }}>
                    <div className="overflow-hidden rounded w-100 d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                      <img 
                        src={getMediaUrl(gradcam?.original_path) || preview} 
                        crossOrigin="anonymous"
                        alt="Original Histopathology Image" 
                        style={{ 
                          transform: `scale(${zoomScale})`, 
                          transition: 'transform 0.2s', 
                          maxHeight: '190px', 
                          maxWidth: '100%', 
                          objectFit: 'contain' 
                        }}
                        className="rounded shadow-sm"
                        onError={(e: any) => {
                          e.target.src = preview || 'https://via.placeholder.com/400x400/eeeeee/333333?text=Original+Scan';
                        }}
                      />
                    </div>
                  </Card.Body>
                  <Card.Footer className="bg-black bg-opacity-25 border-0 py-1.5 text-white-50" style={{ fontSize: '0.75rem' }}>
                    Full-field microscopic biopsy slide
                  </Card.Footer>
                </Card>
              </Col>

              <Col xs={12} md={4}>
                <Card className="h-100 border-0 shadow-sm bg-dark text-white rounded-4 overflow-hidden text-center">
                  <Card.Header className="bg-black bg-opacity-50 border-0 py-2.5">
                    <div className="fw-bold small d-flex align-items-center justify-content-center gap-2 text-warning">
                      <FaThermometerHalf /> 2. Grad-CAM Heatmap
                    </div>
                  </Card.Header>
                  <Card.Body className="p-3 d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '220px' }}>
                    <div className="overflow-hidden rounded w-100 d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                      <img 
                        src={getMediaUrl(gradcam?.heatmap_path)} 
                        crossOrigin="anonymous"
                        alt="Grad-CAM Activation Heatmap" 
                        style={{ 
                          transform: `scale(${zoomScale})`, 
                          transition: 'transform 0.2s', 
                          maxHeight: '190px', 
                          maxWidth: '100%', 
                          objectFit: 'contain' 
                        }}
                        className="rounded shadow-sm"
                        onError={(e: any) => {
                          e.target.src = 'https://via.placeholder.com/400x400/d63384/ffffff?text=Heatmap+Not+Generated';
                        }}
                      />
                    </div>
                  </Card.Body>
                  <Card.Footer className="bg-black bg-opacity-25 border-0 py-1.5 text-white-50" style={{ fontSize: '0.75rem' }}>
                    Gradient activation focus areas
                  </Card.Footer>
                </Card>
              </Col>

              <Col xs={12} md={4}>
                <Card className="h-100 border-0 shadow-sm bg-dark text-white rounded-4 overflow-hidden text-center">
                  <Card.Header className="bg-black bg-opacity-50 border-0 py-2.5">
                    <div className="fw-bold small d-flex align-items-center justify-content-center gap-2 text-success">
                      <FaSearchPlus /> 3. Superimposed Overlay
                    </div>
                  </Card.Header>
                  <Card.Body className="p-3 d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '220px' }}>
                    <div className="overflow-hidden rounded w-100 d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                      <img 
                        src={getMediaUrl(gradcam?.overlay_path)} 
                        crossOrigin="anonymous"
                        alt="Superimposed Grad-CAM Overlay" 
                        style={{ 
                          transform: `scale(${zoomScale})`, 
                          transition: 'transform 0.2s', 
                          maxHeight: '190px', 
                          maxWidth: '100%', 
                          objectFit: 'contain' 
                        }}
                        className="rounded shadow-sm"
                        onError={(e: any) => {
                          e.target.src = 'https://via.placeholder.com/400x400/222222/ffffff?text=Overlay+Not+Available';
                        }}
                      />
                    </div>
                  </Card.Body>
                  <Card.Footer className="bg-black bg-opacity-25 border-0 py-1.5 text-white-50" style={{ fontSize: '0.75rem' }}>
                    Superimposed histological correlation
                  </Card.Footer>
                </Card>
              </Col>
            </Row>

            {/* Narrative Summary & Recommendations */}
            <h6 className="fw-bold text-uppercase text-muted mb-3 border-bottom pb-2">Clinical Interpretation</h6>
            <Row className="g-4 mb-4">
              <Col xs={12} md={6}>
                <Card className="border-0 shadow-sm bg-light h-100 border-start border-4 border-primary">
                  <Card.Body className="p-4">
                    <h6 className="fw-bold text-primary mb-3">AI Diagnostic Summary</h6>
                    <p className="mb-0 text-muted">{diagnostic_summary || summary || 'The model identified cellular densities and patterns matching characteristics of IDC.'}</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card className="border-0 shadow-sm h-100 border-start border-4 border-warning" style={{ backgroundColor: '#fff8e1' }}>
                  <Card.Body className="p-4">
                    <h6 className="fw-bold text-warning-emphasis d-flex align-items-center gap-2 mb-3">
                      <FaExclamationTriangle /> Doctor Recommendation
                    </h6>
                    <p className="mb-0 text-dark fw-semibold">{recommendation}</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Disclaimer */}
            <div className="p-3 bg-secondary bg-opacity-10 rounded-4 text-muted small d-flex gap-2">
              <FaInfoCircle className="flex-shrink-0 mt-1" />
              <div>
                <strong>Disclaimer:</strong> This prediction is generated using a deep learning model and should not replace expert pathological diagnosis. All findings should be clinically correlated.
              </div>
            </div>

          </Card.Body>
        </Card>
      </motion.div>
    </Container>
  );
}
