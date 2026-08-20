import { motion } from 'framer-motion';
import { FaArrowDown } from 'react-icons/fa';
import PublicLayout from '../../components/PublicLayout';

const steps = [
  { label: 'Patient & Clinical Information', desc: 'Demographics, history, symptoms, and clinical context are entered by the authorised clinician.', color: '#0066CC', bg: '#EBF5FF' },
  { label: 'Histopathology Image Upload', desc: 'The clinician uploads the digitised histopathology slide image for the selected cancer type.', color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Image Preprocessing', desc: 'The image is normalised, resized, and preprocessed to the required input format for deep learning models.', color: '#0891B2', bg: '#ECFEFF' },
  { label: 'Deep Learning Models', desc: 'ResNet50, DenseNet121, and EfficientNetB0 models independently analyse the preprocessed image and produce classification outputs.', color: '#6D28D9', bg: '#EDE9FE' },
  { label: 'Best Model Selection', desc: 'The system evaluates model performance metrics and selects the best-performing architecture for the current analysis task.', color: '#059669', bg: '#ECFDF5' },
  { label: 'Cancer Prediction', desc: 'The selected model outputs a cancer classification (e.g., Malignant / Benign) with associated confidence probability.', color: '#DC2626', bg: '#FEF2F2' },
  { label: 'Grad-CAM Explanation', desc: 'Gradient-weighted Class Activation Maps highlight the tissue regions that most influenced the prediction, providing visual explainability.', color: '#D97706', bg: '#FFFBEB' },
  { label: 'Clinical Risk Assessment', desc: 'Clinical metadata is integrated with AI output to compute a personalised dynamic risk score for the patient.', color: '#0066CC', bg: '#EBF5FF' },
  { label: 'Clinical Decision Support', desc: 'A structured clinical summary is generated, combining imaging analysis, risk score, and clinical context.', color: '#00897B', bg: '#F0FDFA' },
  { label: 'Professional Review', desc: 'The attending pathologist or oncologist reviews the AI output, Grad-CAM, and clinical summary to form their clinical judgment.', color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Diagnostic Report', desc: 'A structured PDF diagnostic report is generated and stored for the patient record, including all AI findings and clinical notes.', color: '#1e293b', bg: '#f1f5f9' },
];

export default function HowItWorksPage() {
  return (
    <PublicLayout>
      {/* Header */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span style={styles.badge}>Workflow</span>
            <h1 style={styles.heroTitle}>How the System Works</h1>
            <p style={styles.heroDesc}>
              A step-by-step overview of the complete clinical AI workflow — from patient information entry
              through to diagnostic report generation.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Workflow steps */}
      <section style={{ padding: '3rem 1.5rem 5rem' }}>
        <div style={{ ...styles.container, maxWidth: '700px' }}>
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* Step card */}
              <div style={{ ...styles.stepCard, borderLeftColor: step.color }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ ...styles.stepBadge, backgroundColor: step.bg, color: step.color }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...styles.stepLabel, color: step.color }}>{step.label}</div>
                    <div style={styles.stepDesc}>{step.desc}</div>
                  </div>
                </div>
              </div>

              {/* Arrow connector */}
              {i < steps.length - 1 && (
                <div style={styles.arrowConnector}>
                  <FaArrowDown style={{ color: '#94a3b8', fontSize: '1.1rem' }} />
                </div>
              )}
            </motion.div>
          ))}

          {/* Final note */}
          <motion.div
            style={styles.finalNote}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <strong>Important:</strong> Every step is logged in the audit trail. AI-generated content at every stage
            requires validation by a qualified healthcare professional before clinical use.
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    background: 'linear-gradient(135deg, #EBF5FF 0%, #F5F3FF 100%)',
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
  stepCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid #0066CC',
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
  },
  stepBadge: {
    minWidth: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  stepLabel: {
    fontSize: '0.95rem',
    fontWeight: 700,
    marginBottom: '0.3rem',
  },
  stepDesc: {
    fontSize: '0.82rem',
    color: '#64748b',
    lineHeight: 1.65,
  },
  arrowConnector: {
    padding: '0.5rem 0',
    display: 'flex',
    justifyContent: 'center',
  },
  finalNote: {
    marginTop: '2rem',
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    fontSize: '0.85rem',
    color: '#92400E',
    lineHeight: 1.65,
  },
};
