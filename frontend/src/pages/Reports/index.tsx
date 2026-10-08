import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Table, Button, Badge, Spinner, InputGroup, Form, Modal, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaFileMedical, FaEye, FaSearch, FaDownload, FaFilter, FaUndo, FaLungs, FaRibbon } from 'react-icons/fa';
import apiClient from '../../api/client';
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

  const handleDownloadStub = (e: React.MouseEvent, report: any) => {
    e.stopPropagation();
    toast.info(`Generating PDF report for ${report.report_id}...`);
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
          <p className="text-muted small mb-0">Browse, filter, and export patient diagnostic reports</p>
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
                          <Button 
                            variant="light" 
                            size="sm" 
                            className="me-2 shadow-sm text-primary fw-bold" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              navigate(`/result/${report.prediction_id || report.report_id}`, { state: { report } }); 
                            }}
                          >
                            <FaEye className="me-1" /> View
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm" 
                            className="shadow-sm" 
                            onClick={(e) => handleDownloadStub(e, report)}
                          >
                            <FaDownload />
                          </Button>
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
