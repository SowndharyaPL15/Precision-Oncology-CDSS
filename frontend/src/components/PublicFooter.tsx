import { Link } from 'react-router-dom';
import { FaStethoscope, FaEnvelope, FaGithub } from 'react-icons/fa';

export default function PublicFooter() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.grid}>
          {/* Brand */}
          <div>
            <div style={styles.brand}>
              <FaStethoscope style={{ color: '#0066CC' }} />
              <span style={styles.brandText}>Precision<strong>Oncology</strong></span>
            </div>
            <p style={styles.brandDesc}>
              AI-assisted clinical decision support for lung and breast cancer histopathology analysis.
            </p>
            <div style={styles.disclaimer}>
              <strong>Medical Disclaimer:</strong> AI-generated results are intended to support qualified
              healthcare professionals and should not be used as a substitute for professional medical
              diagnosis or clinical judgment.
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 style={styles.colTitle}>Platform</h4>
            <div style={styles.linkCol}>
              <Link to="/" style={styles.footLink}>Home</Link>
              <Link to="/about" style={styles.footLink}>About</Link>
              <Link to="/how-it-works" style={styles.footLink}>How It Works</Link>
              <Link to="/technology" style={styles.footLink}>Technology</Link>
              <Link to="/security" style={styles.footLink}>Security</Link>
            </div>
          </div>

          {/* Access */}
          <div>
            <h4 style={styles.colTitle}>Access</h4>
            <div style={styles.linkCol}>
              <Link to="/login" style={styles.footLink}>Clinical Login</Link>
              <Link to="/signup" style={styles.footLink}>Register Account</Link>
              <Link to="/contact" style={styles.footLink}>Contact Support</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 style={styles.colTitle}>Contact</h4>
            <div style={styles.linkCol}>
              <a href="mailto:support@precisiononcology.ai" style={styles.footLink}>
                <FaEnvelope style={{ marginRight: '0.4rem' }} />
                support@precisiononcology.ai
              </a>
              <a href="https://github.com" target="_blank" rel="noreferrer" style={styles.footLink}>
                <FaGithub style={{ marginRight: '0.4rem' }} />
                GitHub Repository
              </a>
            </div>
          </div>
        </div>

        <div style={styles.bottom}>
          <span style={styles.bottomText}>
            © {new Date().getFullYear()} Precision Oncology CDSS. All rights reserved.
          </span>
          <span style={styles.bottomText}>
            For research and clinical decision support use only.
          </span>
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    padding: '3.5rem 0 1.5rem',
    marginTop: 'auto',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '2.5rem',
    paddingBottom: '2.5rem',
    borderBottom: '1px solid #1e293b',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    fontSize: '1rem',
  },
  brandText: {
    color: '#e2e8f0',
    letterSpacing: '-0.01em',
  },
  brandDesc: {
    fontSize: '0.82rem',
    lineHeight: 1.6,
    marginBottom: '0.75rem',
  },
  disclaimer: {
    fontSize: '0.75rem',
    lineHeight: 1.6,
    color: '#64748b',
    backgroundColor: '#1e293b',
    padding: '0.75rem',
    borderRadius: '8px',
    borderLeft: '3px solid #0066CC',
  },
  colTitle: {
    color: '#e2e8f0',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '1rem',
  },
  linkCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  footLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  },
  bottom: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem',
    paddingTop: '1.5rem',
  },
  bottomText: {
    fontSize: '0.78rem',
    color: '#475569',
  },
};
