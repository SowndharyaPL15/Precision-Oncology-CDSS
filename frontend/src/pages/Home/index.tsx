import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaMicroscope, FaBrain, FaShieldAlt, FaChartLine,
  FaFileAlt, FaArrowRight, FaCheckCircle, FaFlask
} from 'react-icons/fa';
import PublicLayout from '../../components/PublicLayout';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const features = [
  {
    icon: <FaMicroscope style={{ fontSize: '1.8rem', color: '#0066CC' }} />,
    title: 'AI-Assisted Histopathology',
    desc: 'Deep learning models analyse lung and breast cancer histopathology slides using ResNet50, DenseNet121, and EfficientNetB0 for accurate classification.',
  },
  {
    icon: <FaBrain style={{ fontSize: '1.8rem', color: '#00897B' }} />,
    title: 'Explainable AI with Grad-CAM',
    desc: 'Gradient-weighted Class Activation Maps (Grad-CAM) highlight the tissue regions most influential in the model\'s prediction, providing transparency.',
  },
  {
    icon: <FaChartLine style={{ fontSize: '1.8rem', color: '#7C3AED' }} />,
    title: 'Clinical Risk Assessment',
    desc: 'Integrates patient clinical information with AI predictions to generate a dynamic, personalised risk assessment score for clinical decision support.',
  },
  {
    icon: <FaShieldAlt style={{ fontSize: '1.8rem', color: '#DC2626' }} />,
    title: 'Secure 3FA Access',
    desc: 'Three-factor authentication combining password, face recognition, and WebAuthn biometric fingerprint ensures only authorised clinicians gain access.',
  },
  {
    icon: <FaFileAlt style={{ fontSize: '1.8rem', color: '#D97706' }} />,
    title: 'Clinical Decision Support',
    desc: 'Integrated clinical summaries and structured diagnostic reports are generated to support professional pathologist and oncologist review.',
  },
  {
    icon: <FaFlask style={{ fontSize: '1.8rem', color: '#0891B2' }} />,
    title: 'Best-Model Selection',
    desc: 'The system automatically evaluates and selects the best-performing model from the CNN ensemble for each cancer type analysis task.',
  },
];

const stats = [
  { value: '3', label: 'CNN Architectures Evaluated' },
  { value: '2', label: 'Cancer Types Supported' },
  { value: '3FA', label: 'Authentication Factors' },
  { value: 'Grad-CAM', label: 'Explainability Method' },
];

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={styles.heroBadge}
          >
            <FaMicroscope style={{ marginRight: '0.4rem' }} />
            Clinical AI Decision Support System
          </motion.div>

          <motion.h1
            style={styles.heroTitle}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            Explainable AI for Smarter
            <span style={styles.heroTitleAccent}> Oncology Decision Support</span>
          </motion.h1>

          <motion.p
            style={styles.heroSubtitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            An AI-assisted clinical decision-support platform for lung and breast cancer
            histopathology analysis, explainable predictions, and clinical risk assessment.
          </motion.p>

          <motion.div
            style={styles.heroDisclaimer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <FaCheckCircle style={{ color: '#00897B', marginRight: '0.4rem', flexShrink: 0 }} />
            The system is intended to assist qualified healthcare professionals and does not replace professional diagnosis.
          </motion.div>

          <motion.div
            style={styles.heroButtons}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Link to="/signup" style={styles.btnPrimary}>
              Get Started (Sign Up) <FaArrowRight style={{ marginLeft: '0.4rem' }} />
            </Link>
            <Link to="/login" style={styles.btnOutline}>
              Sign In
            </Link>
          </motion.div>
        </div>

        {/* Hero visual */}
        <motion.div
          style={styles.heroVisual}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <div style={styles.heroCard}>
            <div style={styles.heroCardHeader}>
              <div style={styles.dot} /><div style={{ ...styles.dot, backgroundColor: '#fbbf24' }} /><div style={{ ...styles.dot, backgroundColor: '#34d399' }} />
              <span style={styles.heroCardTitle}>AI Analysis Dashboard</span>
            </div>
            <div style={styles.heroCardBody}>
              <div style={styles.slideLine}>
                <span style={styles.slideLabel}>Cancer Type</span>
                <span style={styles.slideValue}>Lung — Adenocarcinoma</span>
              </div>
              <div style={styles.slideLine}>
                <span style={styles.slideLabel}>Model</span>
                <span style={styles.slideValue}>ResNet50 (Best)</span>
              </div>
              <div style={styles.slideLine}>
                <span style={styles.slideLabel}>Confidence</span>
                <span style={{ ...styles.slideValue, color: '#0066CC', fontWeight: 700 }}>94.2%</span>
              </div>
              <div style={styles.slideLine}>
                <span style={styles.slideLabel}>Risk Level</span>
                <span style={{ ...styles.slideValue, color: '#DC2626', fontWeight: 700 }}>High</span>
              </div>
              <div style={{ ...styles.gradcamBox }}>
                <div style={styles.gradcamLabel}>Grad-CAM Activation</div>
                <div style={styles.gradcamHeatmap}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} style={{ ...styles.gradcamCell, opacity: 0.3 + (i % 5) * 0.14, backgroundColor: i % 3 === 0 ? '#DC2626' : i % 3 === 1 ? '#F97316' : '#FBBF24' }} />
                  ))}
                </div>
              </div>
              <div style={styles.reviewBadge}>
                ⚕️ Requires Pathologist Review
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Banner */}
      <section style={styles.statsBanner}>
        <div style={styles.statsGrid}>
          {stats.map((s, i) => (
            <motion.div key={i} style={styles.statItem} custom={i} initial="hidden" whileInView="visible" variants={fadeUp} viewport={{ once: true }}>
              <div style={styles.statValue}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={styles.section}>
        <div style={styles.container}>
          <motion.div style={styles.sectionHeader} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <span style={styles.sectionBadge}>Core Capabilities</span>
            <h2 style={styles.sectionTitle}>Built for Clinical Excellence</h2>
            <p style={styles.sectionDesc}>A comprehensive AI-assisted platform designed to support oncology decision-making at every step of the clinical workflow.</p>
          </motion.div>

          <div style={styles.featuresGrid}>
            {features.map((f, i) => (
              <motion.div key={i} style={styles.featureCard} custom={i} initial="hidden" whileInView="visible" variants={fadeUp} viewport={{ once: true }} whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,102,204,0.12)' }}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={styles.ctaBanner}>
        <div style={styles.container}>
          <motion.div style={styles.ctaInner} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 style={styles.ctaTitle}>Ready to Begin Clinical Analysis?</h2>
            <p style={styles.ctaDesc}>Authorised clinical users can log in with their registered credentials and 3FA biometrics.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/login" style={{ ...styles.btnPrimary, backgroundColor: '#fff', color: '#0066CC' }}>
                Clinical Login
              </Link>
              <Link to="/signup" style={{ ...styles.btnOutline, borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }}>
                Register Account
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 50%, #f0fdf4 100%)',
    padding: '5rem 1.5rem 4rem',
    display: 'flex',
    alignItems: 'center',
    gap: '3rem',
    maxWidth: '1200px',
    margin: '0 auto',
    flexWrap: 'wrap',
  },
  heroInner: {
    flex: '1 1 480px',
    minWidth: '280px',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    color: '#0066CC',
    fontSize: '0.78rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    padding: '0.35rem 0.9rem',
    borderRadius: '999px',
    marginBottom: '1.25rem',
    border: '1px solid #BFDBFE',
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.15,
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
  },
  heroTitleAccent: {
    color: '#0066CC',
  },
  heroSubtitle: {
    fontSize: '1.05rem',
    color: '#475569',
    lineHeight: 1.75,
    marginBottom: '1rem',
    maxWidth: '520px',
  },
  heroDisclaimer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.25rem',
    fontSize: '0.8rem',
    color: '#374151',
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '8px',
    padding: '0.6rem 0.9rem',
    marginBottom: '1.5rem',
    maxWidth: '520px',
  },
  heroButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'none',
    backgroundColor: '#0066CC',
    color: '#fff',
    padding: '0.7rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: 600,
    boxShadow: '0 4px 14px rgba(0,102,204,0.25)',
    transition: 'all 0.2s',
  },
  btnOutline: {
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: '#0066CC',
    border: '1.5px solid #0066CC',
    padding: '0.7rem 1.5rem',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  heroVisual: {
    flex: '0 1 420px',
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  heroCardHeader: {
    backgroundColor: '#1e293b',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#f87171',
  },
  heroCardTitle: {
    color: '#94a3b8',
    fontSize: '0.78rem',
    marginLeft: '0.5rem',
    fontFamily: 'monospace',
  },
  heroCardBody: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  slideLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.4rem 0',
    borderBottom: '1px solid #f1f5f9',
  },
  slideLabel: {
    fontSize: '0.78rem',
    color: '#64748b',
  },
  slideValue: {
    fontSize: '0.82rem',
    color: '#1e293b',
    fontWeight: 600,
  },
  gradcamBox: {
    marginTop: '0.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '0.75rem',
  },
  gradcamLabel: {
    fontSize: '0.72rem',
    color: '#64748b',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  gradcamHeatmap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: '3px',
  },
  gradcamCell: {
    height: '20px',
    borderRadius: '2px',
  },
  reviewBadge: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#7C3AED',
    backgroundColor: '#F5F3FF',
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
    fontWeight: 600,
    marginTop: '0.25rem',
  },
  statsBanner: {
    backgroundColor: '#0066CC',
    padding: '2.5rem 1.5rem',
  },
  statsGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '2rem',
  },
  statItem: {
    textAlign: 'center',
    color: '#fff',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: '0.4rem',
  },
  statLabel: {
    fontSize: '0.82rem',
    opacity: 0.8,
    fontWeight: 500,
  },
  section: {
    padding: '5rem 1.5rem',
    backgroundColor: '#f8fafc',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '3rem',
  },
  sectionBadge: {
    display: 'inline-block',
    backgroundColor: '#EBF5FF',
    color: '#0066CC',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '0.3rem 0.9rem',
    borderRadius: '999px',
    marginBottom: '0.75rem',
  },
  sectionTitle: {
    fontSize: 'clamp(1.6rem, 3vw, 2.25rem)',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '0.75rem',
    letterSpacing: '-0.02em',
  },
  sectionDesc: {
    fontSize: '1rem',
    color: '#64748b',
    maxWidth: '560px',
    margin: '0 auto',
    lineHeight: 1.7,
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '1.75rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    transition: 'all 0.2s',
    cursor: 'default',
  },
  featureIcon: {
    marginBottom: '1rem',
  },
  featureTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '0.5rem',
  },
  featureDesc: {
    fontSize: '0.875rem',
    color: '#64748b',
    lineHeight: 1.7,
  },
  ctaBanner: {
    background: 'linear-gradient(135deg, #0066CC, #004B99)',
    padding: '5rem 1.5rem',
  },
  ctaInner: {
    maxWidth: '640px',
    margin: '0 auto',
    textAlign: 'center',
  },
  ctaTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
    fontWeight: 800,
    color: '#fff',
    marginBottom: '0.75rem',
    letterSpacing: '-0.02em',
  },
  ctaDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '1rem',
    marginBottom: '2rem',
    lineHeight: 1.7,
  },
};
