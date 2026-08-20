import { motion } from 'framer-motion';
import { FaBrain, FaServer, FaReact, FaShieldAlt, FaInfoCircle } from 'react-icons/fa';
import { SiPostgresql, SiTypescript, SiPython } from 'react-icons/si';
import PublicLayout from '../../components/PublicLayout';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45 } }),
};

const techCategories = [
  {
    icon: <FaBrain style={{ fontSize: '1.8rem', color: '#7C3AED' }} />,
    label: 'Artificial Intelligence',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    note: 'Models are comparatively evaluated; the best-performing model is deployed per analysis task.',
    items: [
      { name: 'ResNet50', desc: 'Deep residual network for feature extraction from histopathology images. 50-layer CNN with skip connections.' },
      { name: 'DenseNet121', desc: 'Densely connected network with 121 layers. Efficient gradient flow and parameter reuse.' },
      { name: 'EfficientNetB0', desc: 'Compound-scaled CNN balancing width, depth, and resolution for optimal accuracy/efficiency.' },
      { name: 'Grad-CAM', desc: 'Gradient-weighted Class Activation Maps for visual explainability of model decisions.' },
    ],
  },
  {
    icon: <FaServer style={{ fontSize: '1.8rem', color: '#0891B2' }} />,
    label: 'Backend',
    color: '#0891B2',
    bg: '#ECFEFF',
    border: '#A5F3FC',
    note: null,
    items: [
      { name: 'FastAPI', desc: 'High-performance Python API framework serving AI inference, authentication, and clinical data endpoints.' },
      { name: 'Node.js', desc: 'Supporting server-side services for session management and auxiliary API operations.' },
      { name: 'PostgreSQL', desc: 'Relational database for secure storage of user records, audit logs, biometric credentials, and clinical data.' },
      { name: 'SQLAlchemy', desc: 'Async ORM for type-safe, high-performance database access with asyncpg driver.' },
    ],
  },
  {
    icon: <FaReact style={{ fontSize: '1.8rem', color: '#0066CC' }} />,
    label: 'Frontend',
    color: '#0066CC',
    bg: '#EBF5FF',
    border: '#BFDBFE',
    note: null,
    items: [
      { name: 'React 19', desc: 'Component-based UI library for building the clinical portal and public website.' },
      { name: 'TypeScript', desc: 'Strongly typed JavaScript for reliable, maintainable clinical application code.' },
      { name: 'Vite', desc: 'Fast build tooling and development server for the React frontend.' },
      { name: 'Framer Motion', desc: 'Animation library for smooth, accessible UI transitions and interactions.' },
    ],
  },
  {
    icon: <FaShieldAlt style={{ fontSize: '1.8rem', color: '#DC2626' }} />,
    label: 'Security',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FCA5A5',
    note: null,
    items: [
      { name: 'JWT', desc: 'JSON Web Tokens for stateless, secure session management across API requests.' },
      { name: '3FA Authentication', desc: 'Three-factor authentication: password → face recognition → WebAuthn biometric fingerprint.' },
      { name: 'Face Authentication', desc: 'Zero-centered 128D facial embedding extraction and cosine similarity verification.' },
      { name: 'WebAuthn / Fingerprint', desc: 'W3C Web Authentication API for hardware-backed biometric fingerprint authentication.' },
      { name: 'RBAC', desc: 'Role-Based Access Control enforced server-side for doctor, pathologist, and admin roles.' },
      { name: 'Audit Logging', desc: 'Comprehensive event logs for all authentication and clinical data access events.' },
    ],
  },
];

export default function TechnologyPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span style={styles.badge}>Technology Stack</span>
            <h1 style={styles.heroTitle}>Built on Proven Clinical Technologies</h1>
            <p style={styles.heroDesc}>
              Every component in the Precision Oncology CDSS is selected for clinical reliability,
              security, and performance in medical AI applications.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tech categories */}
      <section style={{ padding: '3.5rem 1.5rem 5rem' }}>
        <div style={styles.container}>
          <div style={styles.categoriesGrid}>
            {techCategories.map((cat, ci) => (
              <motion.div
                key={ci}
                style={{ ...styles.catCard, borderTopColor: cat.color }}
                custom={ci}
                initial="hidden"
                whileInView="visible"
                variants={fadeUp}
                viewport={{ once: true }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ ...styles.catIconWrap, backgroundColor: cat.bg, border: `1px solid ${cat.border}` }}>
                    {cat.icon}
                  </div>
                  <h2 style={{ ...styles.catLabel, color: cat.color }}>{cat.label}</h2>
                </div>

                {cat.note && (
                  <div style={styles.noteBox}>
                    <FaInfoCircle style={{ color: '#D97706', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', color: '#92400E' }}>{cat.note}</span>
                  </div>
                )}

                <div style={styles.itemsList}>
                  {cat.items.map((item, ii) => (
                    <motion.div key={ii} style={styles.techItem} custom={ii} initial="hidden" whileInView="visible" variants={fadeUp} viewport={{ once: true }}>
                      <div style={{ ...styles.techName, color: cat.color }}>{item.name}</div>
                      <div style={styles.techDesc}>{item.desc}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tech logos row */}
          <motion.div style={styles.logosRow} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
            <div style={styles.logoChip}><SiPython style={{ color: '#3776AB' }} /> Python</div>
            <div style={styles.logoChip}><FaReact style={{ color: '#61DAFB' }} /> React</div>
            <div style={styles.logoChip}><SiTypescript style={{ color: '#3178C6' }} /> TypeScript</div>
            <div style={styles.logoChip}><SiPostgresql style={{ color: '#336791' }} /> PostgreSQL</div>
            <div style={styles.logoChip}><FaBrain style={{ color: '#FF6F00' }} /> TensorFlow / Keras</div>
            <div style={styles.logoChip}><FaShieldAlt style={{ color: '#DC2626' }} /> WebAuthn</div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    background: 'linear-gradient(135deg, #F5F3FF 0%, #EBF5FF 100%)',
    padding: '5rem 1.5rem 3.5rem',
  },
  container: { maxWidth: '1200px', margin: '0 auto' },
  badge: {
    display: 'inline-block',
    backgroundColor: '#EBF5FF',
    color: '#0066CC',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    padding: '0.3rem 0.9rem',
    borderRadius: '999px',
    marginBottom: '1rem',
    border: '1px solid #BFDBFE',
  },
  heroTitle: {
    fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
    marginBottom: '1rem',
  },
  heroDesc: {
    fontSize: '1.05rem',
    color: '#475569',
    lineHeight: 1.75,
    maxWidth: '640px',
  },
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.75rem',
    marginBottom: '3rem',
  },
  catCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '1.75rem',
    border: '1px solid #e2e8f0',
    borderTop: '4px solid #0066CC',
    boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
  },
  catIconWrap: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catLabel: {
    fontSize: '1.05rem',
    fontWeight: 800,
    letterSpacing: '-0.01em',
  },
  noteBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: '8px',
    padding: '0.6rem 0.8rem',
    marginBottom: '1rem',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  techItem: {
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '0.8rem',
  },
  techName: {
    fontSize: '0.9rem',
    fontWeight: 700,
    marginBottom: '0.2rem',
  },
  techDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    lineHeight: 1.6,
  },
  logosRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
    justifyContent: 'center',
    padding: '2rem 0',
    borderTop: '1px solid #e2e8f0',
  },
  logoChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.4rem 0.9rem',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#374151',
  },
};
