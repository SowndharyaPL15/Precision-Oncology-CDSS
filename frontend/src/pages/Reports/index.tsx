import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Table, Button, Badge, Spinner, InputGroup, Form, Modal, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaFileMedical, FaEye, FaSearch, FaDownload, FaFilter, FaUndo } from 'react-icons/fa';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Filter Modal & Filter States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [findingFilter, setFindingFilter] = useState('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await apiClient.get('/reports');
        const parsedReports = (response.data || []).map((r: any) => {
          let parsedJson = r.report_json;
          if (typeof parsedJson === 'string') {
            try { parsedJson = JSON.parse(parsedJson); } catch (e) { parsedJson = {}; }
          }
          return { ...r, report_json: parsedJson };
        });
        setReports(parsedReports);
      } catch (error) {
        console.error('Failed to load reports, using mock data', error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleDownloadStub = (e: React.MouseEvent, report: any) => {
    e.stopPropagation();
    toast.info(`Generating PDF report for ${report.report_id}...`);
  };

  const handleResetFilters = () => {
    setFindingFilter('all');
    setMinConfidence(0);
    setDateRangeFilter('all');
    setSearchTerm('');
    toast.info('Filters reset to default');
  };

  const filteredReports = reports.filter(r => {
    const name = r.report_json?.patient_info?.full_name?.toLowerCase() || '';
    const patientId = r.report_json?.patient_info?.patient_id?.toLowerCase() || '';
    const reportId = (r.report_id || '').toLowerCase();
    const finding = (r.report_json?.prediction?.predicted_class || '').toLowerCase();
    const conf = (r.report_json?.prediction?.confidence || 0) * 100;
    const term = searchTerm.toLowerCase();

    // Text search
    const matchesText = name.includes(term) || reportId.includes(term) || patientId.includes(term) || finding.includes(term);
    if (!matchesText) return false;

    // Finding category filter
    if (findingFilter !== 'all') {
      if (findingFilter === 'malignant' && (!finding.includes('malignant') && !finding.includes('scc') && !finding.includes('aca'))) return false;
      if (findingFilter === 'benign' && (!finding.includes('benign') && !finding.includes('n'))) return false;
      if (findingFilter === 'lung' && !finding.includes('lung')) return false;
      if (findingFilter === 'breast' && !finding.includes('breast')) return false;
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

  const isFiltered = findingFilter !== 'all' || minConfidence > 0 || dateRangeFilter !== 'all' || searchTerm !== '';

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center mb-4 border-bottom pb-3">
        <div>
          <h2 className="fw-bold mb-0 text-dark">Clinical Reports</h2>
          <p className="text-muted small mb-0">Browse, filter, and export patient diagnostic reports</p>
        </div>
        <div className="d-flex gap-2">
          {isFiltered && (
            <Button variant="outline-secondary" onClick={handleResetFilters} className="d-flex align-items-center gap-2">
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
          <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2"><FaFileMedical className="text-primary"/> Generated Reports History</h5>
            <div style={{ width: '320px' }}>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-light border-0"><FaSearch className="text-muted" /></InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by Report ID, Patient, Finding..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-light border-0"
                />
              </InputGroup>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3 border-0 text-muted fw-semibold">Report ID</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Patient</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Finding</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Confidence</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Date Generated</th>
                  <th className="px-4 py-3 border-0 text-end text-muted fw-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      No clinical reports found matching your criteria.
                      {isFiltered && <div className="mt-2"><Button size="sm" variant="link" onClick={handleResetFilters}>Clear Filters</Button></div>}
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const finding = report.report_json?.prediction?.predicted_class || 'N/A';
                    const isMalignant = finding.toLowerCase().includes('malignant') || finding.toLowerCase().includes('scc') || finding.toLowerCase().includes('aca');
                    const conf = report.report_json?.prediction?.confidence;
                    const confidenceVal = conf ? (conf * 100).toFixed(1) : '0';
                    
                    return (
                      <tr key={report.report_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/result/${report.prediction_id}`, { state: { report } })}>
                        <td className="px-4 fw-semibold text-primary">{report.report_id}</td>
                        <td className="fw-semibold text-dark">
                          {report.report_json?.patient_info?.full_name || 'N/A'}
                          <div className="small text-muted fw-normal">{report.report_json?.patient_info?.patient_id}</div>
                        </td>
                        <td>
                          <Badge bg={isMalignant ? 'danger' : 'success'} pill className="px-3 py-1 fw-semibold">
                            {finding}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="me-2 fw-bold">{confidenceVal}%</span>
                            <div className="progress flex-grow-1" style={{ height: '6px', maxWidth: '80px' }}>
                              <div className={`progress-bar bg-${isMalignant ? 'danger' : 'success'}`} style={{ width: `${confidenceVal}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="text-muted small">{report.generated_at ? new Date(report.generated_at).toLocaleString() : 'N/A'}</td>
                        <td className="px-4 text-end">
                          <Button variant="light" size="sm" className="me-2 shadow-sm text-primary fw-bold" onClick={(e) => { e.stopPropagation(); navigate(`/result/${report.prediction_id}`, { state: { report } }); }}>
                            <FaEye className="me-1" /> View
                          </Button>
                          <Button variant="outline-secondary" size="sm" className="shadow-sm" onClick={(e) => handleDownloadStub(e, report)}>
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
              <Form.Label className="fw-bold small text-muted">Diagnostic Finding Type</Form.Label>
              <Form.Select 
                value={findingFilter} 
                onChange={(e) => setFindingFilter(e.target.value)}
                className="bg-light"
              >
                <option value="all">All Findings (Malignant, Benign, Lung, Breast)</option>
                <option value="malignant">Malignant / Carcinoma</option>
                <option value="benign">Benign / Normal</option>
                <option value="lung">Lung Cancer Scans</option>
                <option value="breast">Breast Cancer Scans</option>
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
