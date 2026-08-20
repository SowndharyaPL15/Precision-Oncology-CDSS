import { motion } from 'framer-motion';
import { FaServer, FaBrain, FaDatabase, FaCheckCircle } from 'react-icons/fa';

const models = [
  { name: 'ResNet50', type: 'CNN', desc: 'Deep residual network with 50 layers and skip connections. Evaluated for lung and breast cancer histopathology.', status: 'Evaluated' },
  { name: 'DenseNet121', type: 'CNN', desc: 'Densely connected network with 121 layers. Dense connections allow feature reuse across layers.', status: 'Evaluated' },
  { name: 'EfficientNetB0', type: 'CNN', desc: 'Compound-scaled model balancing depth, width, and resolution. Typically highest accuracy.', status: 'Best Model Selected' },
];

export default function SystemInfo() {
  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}><FaServer style={{ marginRight: '0.5rem', color: '#0066CC' }} />System & AI Model Information</h1>
        <p style={styles.pageSubtitle}>Overview of deployed AI models, backend services, and database status.</p>
      </div>

      {/* System Status */}
      <div style={styles.statusGrid}>
        {[
          { label: 'FastAPI Backend', status: 'Online', color: '#059669', bg: '#ECFDF5' },
          { label: 'PostgreSQL Database', status: 'Connected', color: '#059669', bg: '#ECFDF5' },
          { label: 'AI Inference Service', status: 'Active', color: '#059669', bg: '#ECFDF5' },
          { label: 'WebAuthn Service', status: 'Active', color: '#059669', bg: '#ECFDF5' },
        ].map((s, i) => (
          <motion.div key={i} style={styles.statusCard} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <FaCheckCircle style={{ color: s.color }} />
            <div style={{ flex: 1 }}>
              <div style={styles.statusLabel}>{s.label}</div>
              <div style={{ ...styles.statusBadge, color: s.color, backgroundColor: s.bg }}>{s.status}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Models */}
      <motion.div style={styles.card} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 style={styles.cardTitle}><FaBrain style={{ marginRight: '0.5rem', color: '#7C3AED' }} />AI Model Evaluation</h2>
        <p style={styles.cardSubtitle}>The system evaluates three CNN architectures and deploys the best-performing model per analysis task.</p>
        <div style={styles.modelsGrid}>
          {models.map((m, i) => (
            <div key={i} style={{ ...styles.modelCard, ...(m.status === 'Best Model Selected' ? styles.modelCardBest : {}) }}>
              <div style={styles.modelHeader}>
                <span style={styles.modelName}>{m.name}</span>
                <span style={styles.modelType}>{m.type}</span>
              </div>
              <p style={styles.modelDesc}>{m.desc}</p>
              <span style={{ ...styles.modelStatus, ...(m.status === 'Best Model Selected' ? { color: '#059669', backgroundColor: '#ECFDF5' } : { color: '#64748b', backgroundColor: '#f1f5f9' }) }}>
                {m.status === 'Best Model Selected' ? '✓ ' : ''}{m.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Infrastructure */}
      <motion.div style={{ ...styles.card, marginTop: '1.5rem' }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 style={styles.cardTitle}><FaDatabase style={{ marginRight: '0.5rem', color: '#0891B2' }} />Infrastructure</h2>
        <div style={styles.infraGrid}>
          {[
            { label: 'Backend Framework', value: 'FastAPI (Python 3.x)' },
            { label: 'Database', value: 'PostgreSQL 14+ (asyncpg)' },
            { label: 'ML Framework', value: 'TensorFlow / Keras' },
            { label: 'Explainability', value: 'Grad-CAM (Gradient-weighted CAM)' },
            { label: 'Authentication', value: 'JWT + Face + WebAuthn (3FA)' },
            { label: 'Frontend', value: 'React 19 + TypeScript + Vite' },
            { label: 'Biometric Storage', value: 'AES-256 encrypted (Fernet)' },
            { label: 'API Prefix', value: '/api/v1' },
          ].map((item, i) => (
            <div key={i} style={styles.infraRow}>
              <span style={styles.infraLabel}>{item.label}</span>
              <span style={styles.infraValue}>{item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: '2rem' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' },
  pageSubtitle: { fontSize: '0.875rem', color: '#64748b' },
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem', marginBottom: '1.5rem' },
  statusCard: { backgroundColor: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' },
  statusLabel: { fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' },
  statusBadge: { fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', display: 'inline-block' },
  card: { backgroundColor: '#fff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' },
  cardTitle: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', marginBottom: '0.5rem' },
  cardSubtitle: { fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' },
  modelsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' },
  modelCard: { borderRadius: '10px', padding: '1.1rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' },
  modelCardBest: { border: '2px solid #059669', backgroundColor: '#ECFDF5' },
  modelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  modelName: { fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' },
  modelType: { fontSize: '0.68rem', backgroundColor: '#e2e8f0', color: '#64748b', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 },
  modelDesc: { fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6, marginBottom: '0.75rem' },
  modelStatus: { fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' },
  infraGrid: { display: 'flex', flexDirection: 'column', gap: '0' },
  infraRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.5rem' },
  infraLabel: { fontSize: '0.82rem', color: '#64748b', fontWeight: 500 },
  infraValue: { fontSize: '0.82rem', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace' },
};
