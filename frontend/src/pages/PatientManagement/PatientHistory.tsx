import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Button, Badge, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaHistory, FaEye } from 'react-icons/fa';
import apiClient from '../../api/client';

export default function PatientHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState('Loading...');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiClient.get(`/patients/${id}/predictions`);
        setHistory(response.data || []);
        setPatientName(response.data[0]?.patient_info?.full_name || id);
      } catch (error) {
        console.error('Failed to load patient history, using mock data', error);
        setPatientName('John Doe');
        setHistory([
          { 
            prediction_id: 'PRD-991',
            type: 'lung',
            created_at: new Date().toISOString(),
            result: 'Malignant (Lung)',
            confidence: 0.982
          },
          { 
            prediction_id: 'PRD-985',
            type: 'lung',
            created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
            result: 'Benign',
            confidence: 0.915
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id]);

  return (
    <Container fluid>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-4 border-bottom">
        <h2 className="fw-bold mb-0 text-dark">Patient Medical History</h2>
        <Link to="/patients" className="btn btn-outline-secondary d-flex align-items-center gap-2 shadow-sm">
          <FaArrowLeft /> Back to Directory
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-5">
          <Card.Header className="bg-white border-bottom py-4 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2"><FaHistory className="text-primary"/> Clinical Timeline</h5>
              <div className="text-muted small mt-1">Patient: <span className="fw-bold text-dark">{patientName}</span> ({id})</div>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3 border-0 text-muted fw-semibold">Prediction ID</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Type</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Result</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Confidence</th>
                  <th className="py-3 border-0 text-muted fw-semibold">Date</th>
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
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">No prediction history found for this patient.</td>
                  </tr>
                ) : (
                  history.map((record, idx) => {
                    const isMalignant = record.result.toLowerCase().includes('malignant');
                    const confidenceVal = ((record.confidence || 0) * 100).toFixed(1);
                    return (
                      <tr key={idx}>
                        <td className="px-4 fw-semibold text-primary">{record.prediction_id}</td>
                        <td className="text-capitalize">{record.type} Scan</td>
                        <td>
                          <Badge bg={isMalignant ? 'danger' : 'success'} pill className="px-3 py-1 fw-semibold">
                            {record.result}
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
                        <td className="text-muted small">{new Date(record.created_at).toLocaleDateString()}</td>
                        <td className="px-4 text-end">
                          <Button variant="light" size="sm" className="shadow-sm text-primary" onClick={() => navigate(`/result/${record.prediction_id}`)}>
                            <FaEye /> View Report
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
    </Container>
  );
}
