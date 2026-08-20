import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Button, ProgressBar, Badge, Tab, Tabs } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { 
  FaArrowLeft, FaFilePdf, FaExclamationTriangle, FaStethoscope, FaInfoCircle, 
  FaImage, FaThermometerHalf, FaSearchPlus, FaUndo
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
  const [activeTab, setActiveTab] = useState<string>('overlay');

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
  
  const isMalignant = prediction?.predicted_class?.toLowerCase().includes('malignant') || prediction?.predicted_class === 'lung_aca' || prediction?.predicted_class === 'lung_scc';
  const displayClass = prediction?.predicted_class === 'lung_aca' 
    ? 'Adenocarcinoma (Malignant)' 
    : prediction?.predicted_class === 'lung_scc' 
      ? 'Squamous Cell Carcinoma (Malignant)' 
      : prediction?.predicted_class === 'malignant' 
        ? 'Malignant (IDC)' 
        : 'Benign';

  const confidenceScore = (prediction?.confidence || 0) * (prediction?.confidence <= 1 ? 100 : 1);
  
  const probabilities = prediction?.probabilities ? Object.entries(prediction.probabilities).reduce((acc: any, [key, val]: [string, any]) => {
    const label = key === 'lung_n' ? 'benign' : (key.includes('lung') ? 'malignant' : key.toLowerCase());
    acc[label] = (acc[label] || 0) + val * (val <= 1 ? 100 : 1);
    return acc;
  }, {}) : { malignant: isMalignant ? 90 : 10, benign: isMalignant ? 10 : 90 };

  const handleDownload = () => {
    const element = document.getElementById('report-content');
    if (element) {
      const opt = {
        margin:       0.3,
        filename:     `CDSS_Report_${reportId}.pdf`,
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
    <Container fluid>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4">
        <Button variant="outline-secondary" onClick={() => navigate(-1)} className="d-flex align-items-center gap-2">
          <FaArrowLeft /> Back
        </Button>
        <Button variant="danger" onClick={handleDownload} className="d-flex align-items-center gap-2 fw-bold shadow-sm" style={{ backgroundColor: '#d63384', borderColor: '#d63384' }}>
          <FaFilePdf /> Download PDF Report
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card id="report-content" className="shadow-sm border-0 rounded-4 overflow-hidden mb-5">
          <div className="bg-dark text-white p-4 d-flex justify-content-between align-items-center">
            <div>
              <h3 className="fw-bold mb-1 d-flex align-items-center gap-2"><FaStethoscope /> Clinical AI Analysis Report</h3>
              <div className="text-white-50 small">Report ID: {reportId} | Generated: {new Date(generatedAt).toLocaleString()}</div>
            </div>
            <div className="text-end d-none d-md-block">
              <h5 className="mb-0 fw-bold">Precision Oncology CDSS</h5>
              <div className="text-white-50 small">Department of Pathology</div>
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

            {/* Visual Analysis */}
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h6 className="fw-bold text-uppercase text-muted mb-0">Visual Analysis (Explainable AI)</h6>
              <div className="d-flex gap-2">
                <Button size="sm" variant="outline-secondary" onClick={() => setZoomScale(s => Math.max(0.5, s - 0.25))}><FaUndo style={{ transform: 'rotate(-90deg)' }} /></Button>
                <Button size="sm" variant="outline-secondary" onClick={() => setZoomScale(s => Math.min(2, s + 0.25))}><FaSearchPlus /></Button>
                <Button size="sm" variant="outline-secondary" onClick={() => setZoomScale(1)}>Reset</Button>
              </div>
            </div>

            <Row className="mb-5">
              <Col xs={12}>
                <div className="border rounded-4 bg-dark overflow-hidden p-3 position-relative d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '380px' }}>
                  <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overlay')} className="w-100 justify-content-center border-0 mb-3 bg-dark bg-opacity-50 rounded p-1">
                    <Tab eventKey="original" title={<span className="text-white small px-2"><FaImage className="me-1"/> Original Scan</span>}>
                      <div className="overflow-auto text-center" style={{ maxHeight: '300px' }}>
                        <img 
                          src={getMediaUrl(gradcam?.original_path)} 
                          crossOrigin="anonymous"
                          alt="Original Pathological Image" 
                          style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s', maxHeight: '250px', objectFit: 'contain' }}
                          className="rounded shadow"
                          onError={(e: any) => {
                            e.target.src = preview || 'https://via.placeholder.com/400x400/eeeeee/333333?text=Original+Scan';
                          }}
                        />
                      </div>
                    </Tab>
                    <Tab eventKey="heatmap" title={<span className="text-white small px-2"><FaThermometerHalf className="me-1"/> Heatmap</span>}>
                      <div className="overflow-auto text-center" style={{ maxHeight: '300px' }}>
                        <img 
                          src={getMediaUrl(gradcam?.heatmap_path)} 
                          crossOrigin="anonymous"
                          alt="Grad-CAM Heatmap" 
                          style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s', maxHeight: '250px', objectFit: 'contain' }}
                          className="rounded shadow"
                          onError={(e: any) => {
                            e.target.src = 'https://via.placeholder.com/400x400/d63384/ffffff?text=Heatmap+Not+Generated';
                          }}
                        />
                      </div>
                    </Tab>
                    <Tab eventKey="overlay" title={<span className="text-white small px-2"><FaSearchPlus className="me-1"/> Combined Overlay</span>}>
                      <div className="overflow-auto text-center" style={{ maxHeight: '300px' }}>
                        <img 
                          src={getMediaUrl(gradcam?.overlay_path)} 
                          crossOrigin="anonymous"
                          alt="Grad-CAM Overlay" 
                          style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.2s', maxHeight: '250px', objectFit: 'contain' }}
                          className="rounded shadow"
                          onError={(e: any) => {
                            e.target.src = 'https://via.placeholder.com/400x400/222222/ffffff?text=Overlay+Not+Available';
                          }}
                        />
                      </div>
                    </Tab>
                  </Tabs>
                </div>
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
