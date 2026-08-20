import { motion } from 'framer-motion';
import { FaLock, FaArrowDown, FaShieldAlt, FaUserCheck, FaKey, FaClipboardList, FaDatabase } from 'react-icons/fa';
import PublicLayout from '../../components/PublicLayout';

const authFlow = [
  { icon: <FaKey />, label: 'Step 1 — Password', desc: 'Email and password verified against the encrypted hash stored in PostgreSQL.', color: '#0066CC', bg: '#EBF5FF' },
  { icon: <FaUserCheck />, label: 'Step 2 — Face Authentication', desc: 'Zero-centered 128D facial embedding extracted and compared via cosine similarity against the enrolled template.', color: '#7C3AED', bg: '#F5F3FF' },
  { icon: <FaLock />, label: 'Step 3 — WebAuthn / Fingerprint', desc: 'Hardware-backed biometric authentication using the W3C Web Authentication (WebAuthn) API with the device\'s fingerprint or platform authenticator.', color: '#00897B', bg: '#F0FDFA' },
  { icon: <FaShieldAlt />, label: 'Authenticated Session', desc: 'Upon all three factors passing, a signed JWT access token and refresh token are issued. All subsequent API requests require a valid Bearer token.', color: '#059669', bg: '#ECFDF5' },
];

const securityFeatures = [
  { icon: <FaUserCheck />, title: 'Role-Based Access Control (RBAC)', desc: 'User roles (doctor, pathologist, admin) are stored in the database and enforced server-side on every API endpoint. Roles cannot be set or elevated by the frontend.', color: '#0066CC' },
  { icon: <FaKey />, title: 'JWT Token Management', desc: 'Short-lived access tokens (60 minutes) are paired with refresh tokens for silent renewal. Tokens are signed with a secret key and validated on every protected request.', color: '#7C3AED' },
  { icon: <FaDatabase />, title: 'Secure Biometric Credential Storage', desc: 'Face embeddings are encrypted using AES-256 (Fernet) before storage. WebAuthn public keys are stored; private keys never leave the user\'s device.', color: '#00897B' },
  { icon: <FaClipboardList />, title: 'Audit Logging', desc: 'Every authentication event — login attempts, face verification results, WebAuthn registrations/revocations, and role changes — is recorded with timestamp, IP address, and outcome.', color: '#D97706' },
  { icon: <FaShieldAlt />, title: 'Secure Clinical Data Handling', desc: 'Patient records and prediction data are accessible only to authenticated, authorised users. All sensitive data is transmitted over HTTPS with CORS restrictions applied.', color: '#DC2626' },
];

export default function SecurityPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span style={styles.badge}>Security Architecture</span>
            <h1 style={styles.heroTitle}>Enterprise-Grade Clinical Security</h1>
            <p style={styles.heroDesc}>
              Protecting sensitive clinical data and patient records requires multiple layers of defence.
              Precision Oncology CDSS implements a three-factor authentication system with role-based
              access control and comprehensive audit logging.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 3FA Flow */}
      <section style={{ padding: '4rem 1.5rem' }}>
        <div style={{ ...styles.container, maxWidth: '680px' }}>
          <motion.div style={{ textAlign: 'center', marginBottom: '2.5rem' }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span style={styles.badge}>Authentication Flow</span>
            <h2 style={styles.sectionTitle}>Three-Factor Authentication (3FA)</h2>
            <p style={styles.sectionDesc}>Every login requires all three factors to be verified sequentially. Failure at any step denies access.</p>
          </motion.div>

          {authFlow.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div style={{ ...styles.flowCard, borderLeftColor: step.color }}>
                <div style={{ ...styles.flowIcon, backgroundColor: step.bg, color: step.color }}>{step.icon}</div>
                <div>
                  <div style={{ ...styles.flowLabel, color: step.color }}>{step.label}</div>
                  <div style={styles.flowDesc}>{step.desc}</div>
                </div>
              </div>
              {i < authFlow.length - 1 && (
                <div style={{ padding: '0.5rem', color: '#94a3b8' }}>
                  <FaArrowDown />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security Features */}
      <section style={{ ...styles.sectionAlt, padding: '4rem 1.5rem' }}>
        <div style={styles.container}>
          <motion.div style={{ textAlign: 'center', marginBottom: '2.5rem' }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span style={styles.badge}>Security Controls</span>
            <h2 style={styles.sectionTitle}>Additional Security Measures</h2>
          </motion.div>
          <div style={styles.featGrid}>
            {securityFeatures.map((f, i) => (
              <motion.div key={i} style={{ ...styles.featCard, borderTopColor: f.color }}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <div style={{ ...styles.featIconWrap, color: f.color }}>{f.icon}</div>
                <h3 style={{ ...styles.featTitle, color: f.color }}>{f.title}</h3>
                <p style={styles.featDesc}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsible Note */}
      <section style={{ padding: '2.5rem 1.5rem' }}>
        <div style={styles.container}>
          <div style={styles.responsibleNote}>
            <FaShieldAlt style={{ color: '#DC2626', fontSize: '1.1rem', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#7f1d1d', lineHeight: 1.65 }}>
              <strong>Responsible Disclosure:</strong> This security overview describes the architectural patterns implemented in the system.
              Specific implementation details, key material, or biometric template formats are not exposed publicly to prevent misuse.
              Biometric templates are never transmitted in plaintext.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    background: 'linear-gradient(135deg, #FEF2F2 0%, #EBF5FF 100%)',
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
  sectionTitle: {
    fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem',
  },
  sectionDesc: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: 1.7,
    maxWidth: '480px',
    margin: '0 auto',
  },
  sectionAlt: { backgroundColor: '#f8fafc' },
  flowCard: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid #0066CC',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  flowIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    flexShrink: 0,
  },
  flowLabel: {
    fontSize: '0.92rem',
    fontWeight: 700,
    marginBottom: '0.3rem',
  },
  flowDesc: {
    fontSize: '0.82rem',
    color: '#64748b',
    lineHeight: 1.6,
  },
  featGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  featCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
    borderTop: '4px solid #0066CC',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  featIconWrap: {
    fontSize: '1.4rem',
    marginBottom: '0.75rem',
  },
  featTitle: {
    fontSize: '0.9rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
  },
  featDesc: {
    fontSize: '0.8rem',
    color: '#64748b',
    lineHeight: 1.65,
  },
  responsibleNote: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FCA5A5',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
  },
};
