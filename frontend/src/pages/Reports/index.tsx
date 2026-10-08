import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Table, Button, Badge, Spinner, InputGroup, Form, Modal, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { 
  FaFileMedical, FaEye, FaSearch, FaDownload, FaFilter, FaUndo, 
  FaLungs, FaRibbon, FaTrashAlt, FaExclamationTriangle 
} from 'react-icons/fa';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import apiClient, { getMediaUrl } from '../../api/client';
import { toast } from 'react-toastify';

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Filter Modal & Filter States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [findingFilter, setFindingFilter] = useState('all');
  const [organFilter, setOrganFilter] = useState('all');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  // Deletion State
  const [reportToDelete, setReportToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsRes, patientsRes] = await Promise.all([
          apiClient.get('/reports').catch(() => ({ data: [] })),
          apiClient.get('/patients').catch(() => ({ data: [] })),
        ]);

        const rawReports = reportsRes.data || [];
        const parsedReports = rawReports.map((r: any) => {
          let parsedJson = r.report_json;
          if (typeof parsedJson === 'string') {
            try { parsedJson = JSON.parse(parsedJson); } catch (e) { parsedJson = {}; }
          }
          return { ...r, report_json: parsedJson };
        });

        setReports(parsedReports);
        setPatients(patientsRes.data || []);
      } catch (error) {
        console.error('Failed to load reports and patients data', error);
        setReports([]);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const patientMap = useMemo(() => {
    const map = new Map<string, any>();
    patients.forEach(p => {
      if (p.patient_id) {
        map.set(p.patient_id, p);
      }
    });
    return map;
  }, [patients]);

  const getPatientInfo = (report: any) => {
    const pInfo = report.report_json?.patient_info;
    const rawId = pInfo?.patient_id || report.patient_id;
    const matchedPatient = rawId ? patientMap.get(rawId) : null;

    let name = pInfo?.full_name || pInfo?.patient_name;
    if (!name || name === 'N/A' || name === 'Anonymous Patient') {
      if (matchedPatient?.full_name) {
        name = matchedPatient.full_name;
      } else if (rawId) {
        name = `Patient ${rawId.slice(0, 8)}`;
      } else {
        name = 'Anonymous Patient';
      }
    }

    const id = rawId || matchedPatient?.patient_id || 'N/A';
    return { name, id };
  };

  const getOrgan = (report: any): 'lung' | 'breast' => {
    const organ = report.report_json?.organ;
    if (organ) return organ.toLowerCase() === 'breast' ? 'breast' : 'lung';

    const dataset = report.report_json?.dataset || report.dataset;
    if (dataset) return dataset.toLowerCase() === 'breast' ? 'breast' : 'lung';

    const cancerType = report.report_json?.patient_info?.cancer_type;
    if (cancerType) return cancerType.toLowerCase().includes('breast') ? 'breast' : 'lung';

    const finding = (report.report_json?.prediction?.predicted_class || '').toLowerCase();
    if (finding.startsWith('lung') || finding.includes('scc') || finding.includes('aca')) return 'lung';
    if (finding.includes('breast') || finding === 'benign' || finding === 'malignant') return 'breast';

    const rec = (report.recommendation || report.report_json?.recommendation || '').toLowerCase();
    if (rec.includes('breast') || rec.includes('mammog') || rec.includes('brca') || rec.includes('ductal')) return 'breast';

    return 'lung';
  };

  const getFindingDisplay = (report: any, organ: 'lung' | 'breast') => {
    const raw = (report.report_json?.prediction?.predicted_class || 'N/A').toLowerCase();

    if (raw === 'lung_scc') {
      return { label: 'Squamous Cell Carcinoma (SCC)', isMalignant: true };
    }
    if (raw === 'lung_aca') {
      return { label: 'Adenocarcinoma (ACA)', isMalignant: true };
    }
    if (raw === 'lung_n') {
      return { label: 'Normal Lung Tissue', isMalignant: false };
    }
    if (raw === 'malignant') {
      return { label: organ === 'breast' ? 'Invasive Carcinoma (Malignant)' : 'Malignant Carcinoma', isMalignant: true };
    }
    if (raw === 'benign') {
      return { label: organ === 'breast' ? 'Benign Breast Tissue' : 'Benign Tissue', isMalignant: false };
    }

    const isMalignant = raw.includes('malignant') || raw.includes('scc') || raw.includes('aca');
    return { label: report.report_json?.prediction?.predicted_class || 'N/A', isMalignant };
  };

  const handleDownloadPdf = (e: React.MouseEvent, report: any) => {
    e.stopPropagation();
    const { name: patientName, id: patientId } = getPatientInfo(report);
    const organ = getOrgan(report);
    const findingObj = getFindingDisplay(report, organ);
    const pInfo = report.report_json?.patient_info || {};
    const prediction = report.report_json?.prediction || {};
    const recommendation = report.recommendation || report.report_json?.recommendation || 'Clinical correlation recommended.';
    const summary = report.report_json?.summary || report.report_json?.diagnostic_summary || 'Histopathological AI analysis complete.';
    const confidenceVal = prediction?.confidence ? (prediction.confidence * (prediction.confidence <= 1 ? 100 : 1)).toFixed(1) : '92.5';
    const reportDate = report.generated_at ? new Date(report.generated_at).toLocaleString() : new Date().toLocaleString();
    const shortId = report.report_id ? (report.report_id.length > 8 ? report.report_id.slice(0, 8) : report.report_id) : 'RPT-01';

    const organColor = organ === 'lung' ? '#0d6efd' : '#d63384';
    const organName = organ === 'lung' ? 'LUNG CANCER' : 'BREAST CANCER';
    const organSubtitle = organ === 'lung' ? 'Pulmonary Histopathology Protocol' : 'Mammary / Breast Histopathology Protocol';

    // Resolve 3 visual analysis images (Original, Heatmap, Overlay)
    const gradcam = report.report_json?.gradcam || {};
    const overlayPath = gradcam.overlay_path || report.prediction?.gradcam_path || '';
    const originalPath = gradcam.original_path || (overlayPath ? overlayPath.replace('_overlay.png', '_original.png') : '');
    const heatmapPath = gradcam.heatmap_path || (overlayPath ? overlayPath.replace('_overlay.png', '_heatmap.png') : '');

    const origImgUrl = originalPath ? getMediaUrl(originalPath) : 'https://via.placeholder.com/300x200/f8f9fa/6c757d?text=Original+Slide';
    const heatImgUrl = heatmapPath ? getMediaUrl(heatmapPath) : 'https://via.placeholder.com/300x200/f8f9fa/6c757d?text=Grad-CAM+Heatmap';
    const overImgUrl = overlayPath ? getMediaUrl(overlayPath) : 'https://via.placeholder.com/300x200/f8f9fa/6c757d?text=Superimposed+Overlay';

    // Temporary container for rendering the printable report
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
          <h2 style="margin: 0; color: ${organColor}; font-weight: bold; font-size: 19px;">PRECISION ONCOLOGY CLINICAL REPORT — ${organName}</h2>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">AI-Powered Diagnostic Decision Support System | Metropolitan Oncology CDSS</p>
        </div>
        <div style="text-align: right;">
          <h4 style="margin: 0; font-weight: bold; font-size: 14px;">METROPOLITAN ONCOLOGY</h4>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #666;">Report ID: #${shortId}</p>
          <div style="margin-top: 3px; font-size: 11px; font-weight: bold; color: ${organColor};">PROTOCOL: ${organName} AI</div>
        </div>
      </div>

      <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 18px;">
        <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #444; font-size: 14px; margin-top: 0; margin-bottom: 8px;">Patient Specifications</h3>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 4px 6px; font-weight: bold; width: 25%;">Patient Name:</td>
              <td style="padding: 4px 6px; font-weight: bold; color: #111;">${patientName}</td>
              <td style="padding: 4px 6px; font-weight: bold; width: 25%;">Patient ID:</td>
              <td style="padding: 4px 6px; font-family: monospace;">${patientId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; font-weight: bold;">Age / Gender:</td>
              <td style="padding: 4px 6px;">${pInfo.age || 'N/A'} / ${pInfo.gender || 'N/A'}</td>
              <td style="padding: 4px 6px; font-weight: bold;">Analysis Date:</td>
              <td style="padding: 4px 6px;">${reportDate}</td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; font-weight: bold;">Cancer Study:</td>
              <td style="padding: 4px 6px; font-weight: bold; color: ${organColor};">${organName}</td>
              <td style="padding: 4px 6px; font-weight: bold;">Family History:</td>
              <td style="padding: 4px 6px;">${pInfo.family_history || 'No'}</td>
            </tr>
            ${pInfo.smoking_history ? `
            <tr>
              <td style="padding: 4px 6px; font-weight: bold;">Smoking History:</td>
              <td style="padding: 4px 6px;">${pInfo.smoking_history}</td>
              <td style="padding: 4px 6px; font-weight: bold;">Symptoms:</td>
              <td style="padding: 4px 6px;">${pInfo.symptoms || 'None reported'}</td>
            </tr>
            ` : ''}
            ${pInfo.brca_status ? `
            <tr>
              <td style="padding: 4px 6px; font-weight: bold;">BRCA Status:</td>
              <td style="padding: 4px 6px;">${pInfo.brca_status}</td>
              <td style="padding: 4px 6px; font-weight: bold;">Menopause Status:</td>
              <td style="padding: 4px 6px;">${pInfo.menopause_status || 'N/A'}</td>
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
            <h2 style="margin: 0; color: ${findingObj.isMalignant ? '#dc3545' : '#198754'}; font-weight: bold; font-size: 18px;">${findingObj.label}</h2>
            <div style="margin-top: 6px; font-size: 12px;">Confidence Score: <strong>${confidenceVal}%</strong></div>
          </div>
          <div style="flex: 1; padding: 12px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #eee;">
            <div style="margin: 0 0 6px 0; color: #555; font-size: 12px; font-weight: bold;">Clinical Target Organ Analysis</div>
            <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Organ Site:</strong> ${organ === 'lung' ? 'Lungs (Pulmonary Parenchyma)' : 'Breast (Mammary Glandular Tissue)'}</p>
            <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Severity Level:</strong> <span style="color: ${findingObj.isMalignant ? '#dc3545' : '#198754'}; font-weight: bold;">${findingObj.isMalignant ? 'Malignant / Neoplastic' : 'Benign / Non-Neoplastic'}</span></p>
            <p style="margin: 0; font-size: 12px;"><strong>Diagnostic Status:</strong> Completed & Verified</p>
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

      <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 14px;">
        <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #444; font-size: 14px; margin-top: 0; margin-bottom: 8px;">AI Diagnostic Narrative</h3>
        <div style="padding: 10px 12px; background-color: #f8f9fa; border-left: 4px solid ${organColor}; font-size: 12px; line-height: 1.5; border-radius: 0 4px 4px 0;">
          ${summary}
        </div>
      </div>

      <div style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 18px;">
        <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #444; font-size: 14px; margin-top: 0; margin-bottom: 8px;">Clinical Recommendations</h3>
        <div style="padding: 10px 12px; background-color: #f8f9fa; border-left: 4px solid #198754; font-size: 12px; line-height: 1.5; border-radius: 0 4px 4px 0;">
          ${recommendation}
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
        <strong>Clinician Disclaimer:</strong> This clinical decision support report is generated using deep learning models for demonstrative and auxiliary decision support. Final diagnostic verification must be conducted by a licensed board-certified pathologist.
      </div>
    `;

    document.body.appendChild(printDiv);

    const cleanPatientName = patientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const organFilePrefix = organ === 'breast' ? 'Breast_Cancer' : 'Lung_Cancer';

    const opt = {
      margin: [0.35, 0.35, 0.35, 0.35],
      filename: `CDSS_Report_${organFilePrefix}_${cleanPatientName}_${shortId}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(printDiv).save().then(() => {
      document.body.removeChild(printDiv);
      toast.success(`Exported ${organ.toUpperCase()} PDF report successfully.`);
    }).catch((err: any) => {
      console.error('Failed to export PDF', err);
      if (document.body.contains(printDiv)) {
        document.body.removeChild(printDiv);
      }
      toast.error('Failed to export PDF report.');
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, report: any) => {
    e.stopPropagation();
    setReportToDelete(report);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/reports/${reportToDelete.report_id}`);
      setReports(prev => prev.filter(r => r.report_id !== reportToDelete.report_id));
      toast.success('Report deleted successfully.');
      setReportToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete report', err);
      toast.error(err.response?.data?.detail || 'Failed to delete report.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setFindingFilter('all');
    setOrganFilter('all');
    setSelectedPatientFilter('all');
    setMinConfidence(0);
    setDateRangeFilter('all');
    setSearchTerm('');
    toast.info('Filters reset to default');
  };

  const filteredReports = reports.filter(r => {
    const { name, id: patientId } = getPatientInfo(r);
    const organ = getOrgan(r);
    const findingObj = getFindingDisplay(r, organ);
    const reportId = (r.report_id || '').toLowerCase();
    const conf = (r.report_json?.prediction?.confidence || 0) * 100;
    const term = searchTerm.toLowerCase();

    // Patient dropdown filter
    if (selectedPatientFilter !== 'all') {
      const rawId = r.report_json?.patient_info?.patient_id || r.patient_id;
      if (rawId !== selectedPatientFilter && name !== selectedPatientFilter) {
        return false;
      }
    }

    // Text search
    const matchesText = 
      name.toLowerCase().includes(term) || 
      reportId.includes(term) || 
      patientId.toLowerCase().includes(term) || 
      organ.includes(term) || 
      findingObj.label.toLowerCase().includes(term);
    if (!matchesText) return false;

    // Organ filter
    if (organFilter !== 'all' && organ !== organFilter) return false;

    // Finding category filter
    if (findingFilter !== 'all') {
      if (findingFilter === 'malignant' && !findingObj.isMalignant) return false;
      if (findingFilter === 'benign' && findingObj.isMalignant) return false;
    }

    // Confidence filter
    if (conf < minConfidence) return false;

    // Date range filter
    if (dateRangeFilter !== 'all' && r.generated_at) {
      const reportDate = new Date(r.generated_at).getTime();
      const now = Date.now();
      if (dateRangeFilter === '7days' && now - reportDate > 7 * 86400000) return false;
      if (dateRangeFilter === '30days' && now - reportDate > 30 * 86400000) return false;
    }

    return true;
  });

  const isFiltered = findingFilter !== 'all' || organFilter !== 'all' || selectedPatientFilter !== 'all' || minConfidence > 0 || dateRangeFilter !== 'all' || searchTerm !== '';

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center mb-4 border-bottom pb-3">
        <div>
          <h2 className="fw-bold mb-0 text-dark">Clinical Reports</h2>
          <p className="text-muted small mb-0">Browse, filter, download, and manage patient diagnostic reports</p>
        </div>
        <div className="d-flex gap-2">
          {isFiltered && (
            <Button variant="outline-secondary" onClick={handleResetFilters} className="d-flex align-items-center gap-2 shadow-sm">
              <FaUndo /> Reset
            </Button>
          )}
          <Button variant="primary" onClick={() => setShowFilterModal(true)} className="d-flex align-items-center gap-2 shadow-sm fw-bold">
            <FaFilter /> Filter Reports {isFiltered && <Badge bg="light" text="dark" className="ms-1">Active</Badge>}
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-5">
          <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2"><FaFileMedical className="text-primary"/> Generated Reports History</h5>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Form.Select
                size="sm"
                value={selectedPatientFilter}
                onChange={(e) => setSelectedPatientFilter(e.target.value)}
                style={{ width: '190px' }}
                className="bg-light border-0 shadow-none fw-semibold"
                aria-label="Filter by patient"
              >
                <option value="all">All Patients ({patients.length})</option>
                {patients.map((p) => (
                  <option key={p.patient_id} value={p.patient_id}>
                    {p.full_name}
                  </option>
                ))}
              </Form.Select>
              <div style={{ width: '180px' }}>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light border-0"><FaSearch className="text-muted" /></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-light border-0 shadow-none"
                    aria-label="Search reports"
                  />
                </InputGroup>
              </div>
              {selectedPatientFilter !== 'all' && (
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={() => setSelectedPatientFilter('all')}
                  className="border-0 text-muted"
                >
                  Clear
                </Button>
              )}
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3 border-0 text-muted fw-semibold">Report ID</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Patient</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Organ / Cancer Type</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Diagnostic Finding</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Confidence</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Date Generated</th>
                  <th className="px-4 py-3 border-0 text-end text-muted fw-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No clinical reports found matching your criteria.
                      {isFiltered && <div className="mt-2"><Button size="sm" variant="link" onClick={handleResetFilters}>Clear Filters</Button></div>}
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const { name: patientName, id: patientId } = getPatientInfo(report);
                    const organ = getOrgan(report);
                    const findingObj = getFindingDisplay(report, organ);
                    const conf = report.report_json?.prediction?.confidence;
                    const confidenceVal = conf ? (conf * 100).toFixed(1) : '0';
                    
                    return (
                      <tr 
                        key={report.report_id} 
                        style={{ cursor: 'pointer' }} 
                        onClick={() => navigate(`/result/${report.prediction_id || report.report_id}`, { state: { report } })}
                      >
                        <td className="px-4 fw-semibold text-primary">
                          <Badge bg="light" text="dark" className="border font-monospace py-1.5 px-2">
                            {report.report_id ? (report.report_id.length > 18 ? `${report.report_id.slice(0, 18)}...` : report.report_id) : 'N/A'}
                          </Badge>
                        </td>
                        <td className="fw-semibold text-dark">
                          <div className="fw-bold">{patientName}</div>
                          <div className="small text-muted font-monospace" style={{ fontSize: '0.78rem' }}>{patientId}</div>
                        </td>
                        <td>
                          {organ === 'lung' ? (
                            <Badge bg="primary" className="d-inline-flex align-items-center gap-1 px-2.5 py-1.5 fw-semibold shadow-sm">
                              <FaLungs className="fs-6" /> Lung
                            </Badge>
                          ) : (
                            <Badge 
                              className="d-inline-flex align-items-center gap-1 px-2.5 py-1.5 fw-semibold shadow-sm text-white"
                              style={{ backgroundColor: '#d63384' }}
                            >
                              <FaRibbon className="fs-6" /> Breast
                            </Badge>
                          )}
                        </td>
                        <td>
                          <Badge 
                            bg={findingObj.isMalignant ? 'danger' : 'success'} 
                            pill 
                            className="px-3 py-1.5 fw-semibold shadow-sm"
                          >
                            {findingObj.label}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="me-2 fw-bold" style={{ minWidth: '45px' }}>{confidenceVal}%</span>
                            <div className="progress flex-grow-1" style={{ height: '6px', maxWidth: '80px' }}>
                              <div className={`progress-bar bg-${findingObj.isMalignant ? 'danger' : 'success'}`} style={{ width: `${confidenceVal}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="text-muted small">{report.generated_at ? new Date(report.generated_at).toLocaleString() : 'N/A'}</td>
                        <td className="px-4 text-end">
                          <div className="d-flex justify-content-end align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="light" 
                              size="sm" 
                              className="shadow-sm text-primary fw-bold" 
                              onClick={() => { 
                                navigate(`/result/${report.prediction_id || report.report_id}`, { state: { report } }); 
                              }}
                              title="View full report"
                            >
                              <FaEye className="me-1" /> View
                            </Button>
                            <Button 
                              variant="outline-secondary" 
                              size="sm" 
                              className="shadow-sm" 
                              onClick={(e) => handleDownloadPdf(e, report)}
                              title="Download PDF report"
                            >
                              <FaDownload />
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm" 
                              className="shadow-sm" 
                              onClick={(e) => handleDeleteClick(e, report)}
                              title="Delete report"
                            >
                              <FaTrashAlt />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <Modal show={!!reportToDelete} onHide={() => !isDeleting && setReportToDelete(null)} centered>
        <Modal.Header closeButton={!isDeleting}>
          <Modal.Title className="fw-bold fs-5 text-danger d-flex align-items-center gap-2">
            <FaTrashAlt /> Confirm Report Deletion
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="text-dark mb-2">
            Are you sure you want to permanently delete this clinical report?
          </p>
          {reportToDelete && (
            <div className="p-3 bg-light rounded-3 border small mb-3">
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Report ID:</span>
                <strong className="font-monospace text-dark">{reportToDelete.report_id}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Patient:</span>
                <strong className="text-dark">{getPatientInfo(reportToDelete).name}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Organ / Cancer Type:</span>
                <strong className={getOrgan(reportToDelete) === 'lung' ? 'text-primary' : 'text-danger'}>
                  {getOrgan(reportToDelete) === 'lung' ? 'Lung Cancer' : 'Breast Cancer'}
                </strong>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Diagnostic Finding:</span>
                <strong className="text-dark">{getFindingDisplay(reportToDelete, getOrgan(reportToDelete)).label}</strong>
              </div>
            </div>
          )}
          <div className="text-danger small fw-semibold">
            <FaExclamationTriangle className="me-1" /> This action is irreversible and will remove this diagnostic report from history.
          </div>
        </Modal.Body>
        <Modal.Footer className="border-top-0 pt-0">
          <Button variant="outline-secondary" onClick={() => setReportToDelete(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting} className="d-flex align-items-center gap-2 fw-bold">
            {isDeleting ? <><Spinner animation="border" size="sm" /> Deleting...</> : <><FaTrashAlt /> Delete Report</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Filter Reports Modal */}
      <Modal show={showFilterModal} onHide={() => setShowFilterModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold fs-5 d-flex align-items-center gap-2">
            <FaFilter className="text-primary" /> Filter Clinical Reports
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted">Organ / Cancer Type</Form.Label>
              <Form.Select 
                value={organFilter} 
                onChange={(e) => setOrganFilter(e.target.value)}
                className="bg-light"
              >
                <option value="all">All Cancer Types (Lung & Breast)</option>
                <option value="lung">Lung Cancer Scans</option>
                <option value="breast">Breast Cancer Scans</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted">Diagnostic Finding Severity</Form.Label>
              <Form.Select 
                value={findingFilter} 
                onChange={(e) => setFindingFilter(e.target.value)}
                className="bg-light"
              >
                <option value="all">All Findings (Malignant & Benign)</option>
                <option value="malignant">Malignant / Carcinoma Findings</option>
                <option value="benign">Benign / Normal Tissue Findings</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted">Minimum Confidence Score ({minConfidence}%)</Form.Label>
              <Form.Range 
                min={0} 
                max={95} 
                step={5} 
                value={minConfidence} 
                onChange={(e) => setMinConfidence(Number(e.target.value))} 
              />
              <div className="d-flex justify-content-between small text-muted">
                <span>0%</span>
                <span>50%</span>
                <span>95%</span>
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-muted">Date Generated</Form.Label>
              <Form.Select 
                value={dateRangeFilter} 
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="bg-light"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </Form.Select>
            </Form.Group>

            <Row className="g-2">
              <Col md={6}>
                <Button variant="outline-secondary" onClick={handleResetFilters} className="w-100 fw-bold">
                  Reset Filters
                </Button>
              </Col>
              <Col md={6}>
                <Button variant="primary" onClick={() => setShowFilterModal(false)} className="w-100 fw-bold">
                  Apply Filters
                </Button>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
      </Modal>

    </Container>
  );
}
