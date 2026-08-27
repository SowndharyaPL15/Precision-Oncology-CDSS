import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStethoscope, FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/technology', label: 'Technology' },
    { to: '/security', label: 'Security' },
    { to: '/contact', label: 'Contact' },
  ];

  const isActive = (path: string) =>
    location.pathname === path ? 'nav-active' : '';

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        {/* Logo */}
        <Link to="/" style={styles.logo}>
          <FaStethoscope style={{ color: '#0066CC', fontSize: '1.4rem' }} />
          <span style={styles.logoText}>Precision<strong>Oncology</strong></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="public-desktop-nav" style={styles.desktopNav}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                ...styles.navLink,
                ...(isActive(link.to) ? styles.navLinkActive : {}),
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="public-cta-group" style={styles.ctaGroup}>
          {isAuthenticated ? (
            <Link to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} style={styles.btnPrimary}>
              Go to Portal
            </Link>
          ) : (
            <>
              <Link to="/login" style={styles.btnOutline}>Sign In</Link>
              <Link to="/signup" style={styles.btnPrimary}>Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="public-hamburger"
          style={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={styles.mobileMenu}
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={styles.mobileLink}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 1.5rem 1rem' }}>
              {isAuthenticated ? (
                <Link to={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'} style={{ ...styles.btnPrimary, flex: 1, textAlign: 'center' }} onClick={() => setMenuOpen(false)}>
                  Go to Portal
                </Link>
              ) : (
                <>
                  <Link to="/login" style={{ ...styles.btnOutline, flex: 1, textAlign: 'center' }} onClick={() => setMenuOpen(false)}>Sign In</Link>
                  <Link to="/signup" style={{ ...styles.btnPrimary, flex: 1, textAlign: 'center' }} onClick={() => setMenuOpen(false)}>Sign Up</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottom: '1px solid #e2e8f0',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
    height: '68px',
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: '#1a2332',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '1.1rem',
    letterSpacing: '-0.02em',
    color: '#1a2332',
  },
  desktopNav: {
    display: 'flex',
    gap: '0.25rem',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  navLink: {
    textDecoration: 'none',
    color: '#4a5568',
    fontSize: '0.9rem',
    fontWeight: 500,
    padding: '0.4rem 0.85rem',
    borderRadius: '6px',
    transition: 'all 0.15s',
  },
  navLinkActive: {
    color: '#0066CC',
    backgroundColor: '#EBF5FF',
  },
  ctaGroup: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexShrink: 0,
  },
  btnOutline: {
    textDecoration: 'none',
    color: '#0066CC',
    border: '1.5px solid #0066CC',
    padding: '0.4rem 1.1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  btnPrimary: {
    textDecoration: 'none',
    color: '#fff',
    backgroundColor: '#0066CC',
    padding: '0.4rem 1.1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  hamburger: {
    display: 'none',
    background: 'none',
    border: 'none',
    fontSize: '1.3rem',
    color: '#1a2332',
    cursor: 'pointer',
    padding: '0.25rem',
    marginLeft: 'auto',
  },
  mobileMenu: {
    backgroundColor: '#fff',
    borderTop: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  mobileLink: {
    display: 'block',
    textDecoration: 'none',
    color: '#4a5568',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: 500,
    borderBottom: '1px solid #f0f4f8',
  },
};
