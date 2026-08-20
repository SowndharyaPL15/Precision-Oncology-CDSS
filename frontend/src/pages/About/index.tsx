import { motion } from 'framer-motion';
import { FaCheckCircle, FaMicroscope, FaUserMd, FaBrain, FaExclamationTriangle } from 'react-icons/fa';
import PublicLayout from '../../components/PublicLayout';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45 } }),
};

const pillars = [
  {
    icon: <FaMicroscope style={{ fontSize: '1.6rem', color: '#0066CC' }} />,
    title: 'AI-Assisted Histopathology Analysis',
    desc: 'The system applies deep convolutional neural network models — ResNet50, DenseNet121, and EfficientNetB0 — trained on labelled histopathology datasets to classify lung and breast cancer tissue slides. These models are evaluated comparatively, and the best-performing model is selected for clinical analysis.',
  },
  {
    icon: <FaBrain style={{ fontSize: '1.6rem', color: '#00897B' }} />,
    title: 'Explainable Predictions via Grad-CAM',
    desc: 'Gradient-weighted Class Activation Maps (Grad-CAM) are generated alongside each prediction to provide visual explanations. Clinicians can see which tissue regions most influenced the AI output, enabling informed review rather than blind acceptance.',
  },
  {
    icon: <FaUserMd style={{ fontSize: '1.6rem', color: '#7C3AED' }} />,
    title: 'Role of Clinical Information',
    desc: 'Patient clinical metadata — including age, diagnosis history, symptoms, and clinical context — is incorporated into a dynamic risk assessment model. This allows the system to generate a comprehensive risk score tailored to each patient\'s profile.',
  },
];

const values = [
  'Transparency through Grad-CAM explainability',
  'Comparative evaluation of multiple CNN architectures',
  'Integration of clinical context alongside imaging data',
  'Secure, role-based access for authorised clinicians',
  'Structured diagnostic reports to support professional review',
  'Audit trails for all clinical and authentication events',
];

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span style={styles.badge}>About the Platform</span>
            <h1 style={styles.heroTitle}>Precision Oncology Clinical Decision Support System</h1>
            <p style={styles.heroDesc}>
              A research and clinical-grade AI platform developed to assist qualified oncologists and pathologists
              in the analysis of lung and breast cancer histopathology images through explainable, transparent AI.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Disclaimer banner */}
      <section style={styles.disclaimerBanner}>
        <div style={styles.container}>
          <div style={styles.disclaimerBox}>
            <FaExclamationTriangle style={{ color: '#D97706', fontSize: '1.2rem', flexShrink: 0 }} />
            <p style={styles.disclaimerText}>
              <strong>Important Medical Disclaimer:</strong> The system is intended to assist qualified healthcare
              professionals and does not replace professional diagnosis. All AI-generated results must be reviewed
              and validated by a licensed clinician before any clinical decision is made.
            </p>
          </div>
        </div>
      </section>

      {/* Purpose */}
      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.twoCol}>
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <span style={styles.badge}>Purpose & Problem</span>
              <h2 style={styles.sectionTitle}>Addressing the Clinical Challenge</h2>
              <p style={styles.bodyText}>
                Cancer diagnosis from histopathology images requires specialised expertise and is inherently time-intensive.
                In many clinical settings, pathologists face high workloads that can affect diagnostic throughput.
                Misclassification of tissue samples can lead to inappropriate treatment decisions and patient harm.
              </p>
              <p style={styles.bodyText}>
                Precision Oncology CDSS was developed to address this gap — providing an AI-assisted second opinion
                that supports, rather than supplants, the clinical expert. By combining state-of-the-art CNN architectures
                with explainable visualisations and clinical risk scoring, the system aims to improve consistency,
                speed, and transparency in cancer diagnosis workflows.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} style={styles.valueBox}>
              <h3 style={styles.valueTitle}>Platform Values</h3>
              <ul style={styles.valueList}>
                {values.map((v, i) => (
                  <li key={i} style={styles.valueItem}>
                    <FaCheckCircle style={{ color: '#00897B', flexShrink: 0 }} />
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section style={{ ...styles.section, backgroundColor: '#f8fafc' }}>
        <div style={styles.container}>
          <motion.div style={{ textAlign: 'center', marginBottom: '3rem' }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span style={styles.badge}>How We Work</span>
            <h2 style={styles.sectionTitle}>Key Clinical Functions</h2>
          </motion.div>
          <div style={styles.pillarsGrid}>
            {pillars.map((p, i) => (
              <motion.div key={i} style={styles.pillarCard} custom={i} initial="hidden" whileInView="visible" variants={fadeUp} viewport={{ once: true }}>
                <div style={styles.pillarIcon}>{p.icon}</div>
                <h3 style={styles.pillarTitle}>{p.title}</h3>
                <p style={styles.pillarDesc}>{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pathologist role */}
      <section style={styles.section}>
        <div style={styles.container}>
          <div style={{ ...styles.infoCard, maxWidth: '800px', margin: '0 auto' }}>
            <FaUserMd style={{ fontSize: '2rem', color: '#0066CC', marginBottom: '1rem' }} />
            <h2 style={{ ...styles.sectionTitle, textAlign: 'center', fontSize: '1.4rem' }}>
              Importance of Professional Review
            </h2>
            <p style={{ ...styles.bodyText, textAlign: 'center' }}>
              No AI system, regardless of accuracy, should be used as a sole determinant of clinical diagnosis.
              All outputs from Precision Oncology CDSS — including cancer classifications, probability scores,
              Grad-CAM overlays, and risk assessments — are decision-support aids. The final diagnostic
              determination must always be made by a qualified, licensed pathologist or oncologist who
              applies their clinical expertise, patient history, and professional judgment.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    background: 'linear-gradient(135deg, #EBF5FF 0%, #f0fdf4 100%)',
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
    lineHeight: 1.2,
    marginBottom: '1rem',
    maxWidth: '800px',
  },
  heroDesc: {
    fontSize: '1.05rem',
    color: '#475569',
    lineHeight: 1.75,
    maxWidth: '700px',
  },
  disclaimerBanner: {
    backgroundColor: '#FFFBEB',
    borderBottom: '1px solid #FDE68A',
    padding: '1.25rem 1.5rem',
  },
  disclaimerBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  disclaimerText: {
    fontSize: '0.88rem',
    color: '#92400E',
    lineHeight: 1.6,
    margin: 0,
  },
  section: { padding: '4.5rem 1.5rem' },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '3rem',
    alignItems: 'start',
  },
  sectionTitle: {
    fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
    marginBottom: '1rem',
  },
  bodyText: {
    fontSize: '0.95rem',
    color: '#475569',
    lineHeight: 1.8,
    marginBottom: '1rem',
  },
  valueBox: {
    backgroundColor: '#f0f7ff',
    borderRadius: '14px',
    padding: '1.75rem',
    border: '1px solid #BFDBFE',
  },
  valueTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '1rem',
  },
  valueList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.7rem',
  },
  valueItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: 1.5,
  },
  pillarsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  pillarCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '1.75rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  pillarIcon: { marginBottom: '1rem' },
  pillarTitle: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.6rem' },
  pillarDesc: { fontSize: '0.875rem', color: '#64748b', lineHeight: 1.7 },
  infoCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: '16px',
    padding: '2.5rem',
    textAlign: 'center' as const,
    border: '1px solid #BFDBFE',
  },
};
