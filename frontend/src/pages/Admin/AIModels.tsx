import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { FaTrophy, FaBrain, FaChartBar, FaCheckCircle } from 'react-icons/fa';

interface ModelInfo {
  name: string;
  model_id: string;
  cancer_type: string;
  architecture: string;
  status: string;
  is_best_performing: boolean;
  badge_note: string;
  deployment_status: string;
  evaluation_metrics: Record<string, number>;
}

const METRIC_LABELS: Record<string, string> = {
  test_accuracy: 'Test Accuracy',
  precision: 'Precision',
  recall: 'Recall',
  f1_score: 'F1 Score',
  auc_roc: 'AUC-ROC',
};

export default function AIModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [bestModel, setBestModel] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admin/models')
      .then(res => {
        setModels(res.data.models || []);
        setBestModel(res.data.best_model || 'ResNet50');
        setDescription(res.data.description || '');
      })
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, []);

  const MetricBar = ({ value }: { value: number }) => {
    const pct = Math.round(value * 100);
    const color = pct >= 95 ? '#10B981' : pct >= 90 ? '#0284C7' : '#F59E0B';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ flex: 1, height: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color, minWidth: '40px', textAlign: 'right' }}>{pct}%</span>
      </div>
    );
  };

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>AI Models & Transfer Learning Registry</h1>
        <p style={styles.pageSubtitle}>Deployed models for Precision Oncology cancer classification</p>
      </div>

      {/* Best Model Banner */}
      {bestModel && (
        <div style={styles.bestModelBanner}>
          <FaTrophy style={{ color: '#D97706', fontSize: '1.5rem' }} />
          <div>
            <div style={styles.bestModelTitle}>Best-Performing Model: <strong>{bestModel}</strong></div>
            <div style={styles.bestModelDesc}>{description}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.loadingBox}>Loading AI model registry...</div>
      ) : models.length === 0 ? (
        <div style={styles.noDataBox}>No data available</div>
      ) : (
        <div style={styles.modelsGrid}>
          {models.map(model => (
            <div key={model.model_id} style={{ ...styles.modelCard, ...(model.is_best_performing ? styles.bestCard : {}) }}>
              {model.is_best_performing && (
                <div style={styles.bestBadgeTop}>
                  <FaTrophy style={{ marginRight: '0.3rem', color: '#D97706' }} />
                  BEST-PERFORMING MODEL
                </div>
              )}

              <div style={styles.modelHeader}>
                <div style={{ ...styles.modelIconBox, backgroundColor: model.is_best_performing ? '#FEF3C7' : '#E0F2FE', color: model.is_best_performing ? '#D97706' : '#0284C7' }}>
                  <FaBrain style={{ fontSize: '1.25rem' }} />
                </div>
                <div>
                  <h3 style={styles.modelName}>{model.name}</h3>
                  <span style={styles.modelBadge}>{model.badge_note}</span>
                </div>
              </div>

              <div style={styles.modelMeta}>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Architecture</span>
                  <span style={styles.metaValue}>{model.architecture}</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Cancer Type</span>
                  <span style={styles.metaValue}>{model.cancer_type}</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Deployment</span>
                  <span style={{ ...styles.metaValue, color: '#10B981', fontWeight: 700 }}>
                    <FaCheckCircle style={{ marginRight: '0.3rem' }} />{model.deployment_status}
                  </span>
                </div>
              </div>

              {/* Evaluation Metrics */}
              <div style={styles.metricsSection}>
                <div style={styles.metricsTitle}>
                  <FaChartBar style={{ marginRight: '0.4rem' }} />
                  Evaluation Metrics
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {Object.entries(model.evaluation_metrics).map(([key, value]) => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={styles.metricLabel}>{METRIC_LABELS[key] || key}</span>
                      </div>
                      <MetricBar value={typeof value === 'number' ? value : 0} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Methodology Note */}
      <div style={styles.methodNote}>
        <h3 style={styles.methodTitle}>Evaluation Methodology</h3>
        <p style={styles.methodText}>
          Models are evaluated on independent test sets using standard classification metrics.
          ResNet50's superior performance is validated through empirical transfer learning experiments
          on both Lung Adenocarcinoma/Squamous Cell Carcinoma and Breast Cancer (IDC) datasets.
          Evaluation metrics are loaded from stored comparison reports when available.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: '1.25rem' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 },
  pageSubtitle: { fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' },
  bestModelBanner: { display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem' },
  bestModelTitle: { fontSize: '1rem', fontWeight: 700, color: '#92400E' },
  bestModelDesc: { fontSize: '0.82rem', color: '#B45309', marginTop: '0.25rem' },
  loadingBox: { textAlign: 'center', padding: '3rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' },
  noDataBox: { textAlign: 'center', padding: '3rem', color: '#94A3B8', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0' },
  modelsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' },
  modelCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative' as const },
  bestCard: { border: '2px solid #FCD34D', boxShadow: '0 4px 20px rgba(217, 119, 6, 0.15)' },
  bestBadgeTop: { display: 'flex', alignItems: 'center', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '0.7rem', fontWeight: 800, padding: '0.3rem 0.65rem', borderRadius: '8px', marginBottom: '1rem', width: 'fit-content', letterSpacing: '0.04em' },
  modelHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
  modelIconBox: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  modelName: { fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 },
  modelBadge: { fontSize: '0.72rem', color: '#64748B', fontWeight: 600 },
  modelMeta: { display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.1rem', paddingBottom: '1rem', borderBottom: '1px solid #F1F5F9' },
  metaRow: { display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  metaLabel: { fontSize: '0.68rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  metaValue: { fontSize: '0.82rem', color: '#334155' },
  metricsSection: {},
  metricsTitle: { display: 'flex', alignItems: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.75rem' },
  metricLabel: { fontSize: '0.78rem', color: '#64748B' },
  methodNote: { backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '1.25rem' },
  methodTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#0369A1', marginBottom: '0.5rem' },
  methodText: { fontSize: '0.85rem', color: '#0369A1', lineHeight: 1.6, margin: 0 },
};
