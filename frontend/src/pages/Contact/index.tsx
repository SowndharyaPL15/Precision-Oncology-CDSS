import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaEnvelope, FaUser, FaRegPaperPlane, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import PublicLayout from '../../components/PublicLayout';

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2) newErrors.name = 'Full name must be at least 2 characters.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Please enter a valid email address.';
    if (!form.subject.trim() || form.subject.trim().length < 4) newErrors.subject = 'Subject must be at least 4 characters.';
    if (!form.message.trim() || form.message.trim().length < 20) newErrors.message = 'Message must be at least 20 characters.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    // Simulate submission delay (no real backend endpoint needed)
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [e.target.name]: undefined }));
    }
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span style={styles.badge}>Contact Us</span>
            <h1 style={styles.heroTitle}>Get in Touch</h1>
            <p style={styles.heroDesc}>
              For access requests, technical support, or research collaboration enquiries, please use the form below.
              Our team will respond within 2 business days.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form + Info */}
      <section style={{ padding: '3.5rem 1.5rem 5rem' }}>
        <div style={styles.container}>
          <div style={styles.twoCol}>

            {/* Contact Form */}
            <motion.div style={styles.formCard} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              {submitted ? (
                <div style={styles.successBox}>
                  <FaCheckCircle style={{ fontSize: '2.5rem', color: '#059669', marginBottom: '1rem' }} />
                  <h3 style={{ color: '#065F46', fontWeight: 700, marginBottom: '0.5rem' }}>Message Sent</h3>
                  <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: 1.65 }}>
                    Thank you for reaching out. We will review your message and respond to <strong>{form.email}</strong> within 2 business days.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <h2 style={styles.formTitle}>Send a Message</h2>

                  {/* Name */}
                  <div style={styles.field}>
                    <label style={styles.label} htmlFor="contact-name">
                      <FaUser style={{ marginRight: '0.4rem', fontSize: '0.8rem' }} />Full Name *
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      placeholder="Dr. Jane Smith"
                      value={form.name}
                      onChange={handleChange}
                      style={{ ...styles.input, ...(errors.name ? styles.inputError : {}) }}
                    />
                    {errors.name && <span style={styles.errorMsg}><FaExclamationCircle /> {errors.name}</span>}
                  </div>

                  {/* Email */}
                  <div style={styles.field}>
                    <label style={styles.label} htmlFor="contact-email">
                      <FaEnvelope style={{ marginRight: '0.4rem', fontSize: '0.8rem' }} />Email Address *
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      placeholder="doctor@hospital.org"
                      value={form.email}
                      onChange={handleChange}
                      style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }}
                    />
                    {errors.email && <span style={styles.errorMsg}><FaExclamationCircle /> {errors.email}</span>}
                  </div>

                  {/* Subject */}
                  <div style={styles.field}>
                    <label style={styles.label} htmlFor="contact-subject">Subject *</label>
                    <select
                      id="contact-subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      style={{ ...styles.input, ...(errors.subject ? styles.inputError : {}) }}
                    >
                      <option value="">Select a subject...</option>
                      <option value="Access Request">Access Request</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="Research Collaboration">Research Collaboration</option>
                      <option value="Account Issue">Account Issue</option>
                      <option value="General Enquiry">General Enquiry</option>
                    </select>
                    {errors.subject && <span style={styles.errorMsg}><FaExclamationCircle /> {errors.subject}</span>}
                  </div>

                  {/* Message */}
                  <div style={styles.field}>
                    <label style={styles.label} htmlFor="contact-message">Message *</label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      placeholder="Please describe your enquiry in detail..."
                      value={form.message}
                      onChange={handleChange}
                      style={{ ...styles.input, resize: 'vertical', ...(errors.message ? styles.inputError : {}) }}
                    />
                    {errors.message && <span style={styles.errorMsg}><FaExclamationCircle /> {errors.message}</span>}
                  </div>

                  <button type="submit" disabled={loading} style={styles.submitBtn}>
                    {loading ? (
                      <span>Sending...</span>
                    ) : (
                      <><FaRegPaperPlane style={{ marginRight: '0.5rem' }} />Send Message</>
                    )}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Info panel */}
            <motion.div style={styles.infoPanel} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <div style={styles.infoCard}>
                <h3 style={styles.infoTitle}>Project Information</h3>
                <p style={styles.infoText}>
                  The Precision Oncology CDSS is a research and clinical AI platform for histopathology-based
                  cancer decision support. Access is granted only to qualified, verified clinical professionals.
                </p>

                <div style={styles.infoDivider} />

                <div style={styles.infoItem}>
                  <FaEnvelope style={{ color: '#0066CC' }} />
                  <div>
                    <div style={styles.infoItemLabel}>Email Support</div>
                    <a href="mailto:support@precisiononcology.ai" style={styles.infoItemValue}>
                      support@precisiononcology.ai
                    </a>
                  </div>
                </div>

                <div style={styles.infoDivider} />

                <div style={styles.noticeBox}>
                  <strong>Note:</strong> This platform is for use by authorised clinical and research personnel only.
                  Public access is not available. All access requests are subject to verification and approval.
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    background: 'linear-gradient(135deg, #f0fdf4 0%, #EBF5FF 100%)',
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
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    alignItems: 'start',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
  },
  formTitle: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '1.5rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.35rem',
    marginBottom: '1.1rem',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    border: '1.5px solid #d1d5db',
    borderRadius: '8px',
    padding: '0.6rem 0.9rem',
    fontSize: '0.88rem',
    color: '#1a2332',
    outline: 'none',
    fontFamily: 'inherit',
    backgroundColor: '#f9fafb',
    width: '100%',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  errorMsg: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.75rem',
    color: '#DC2626',
    fontWeight: 500,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#0066CC',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    marginTop: '0.5rem',
    transition: 'all 0.2s',
  },
  successBox: {
    textAlign: 'center' as const,
    padding: '3rem 1rem',
  },
  infoPanel: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '1.75rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  infoTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '0.75rem',
  },
  infoText: {
    fontSize: '0.85rem',
    color: '#64748b',
    lineHeight: 1.7,
    margin: 0,
  },
  infoDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    margin: '1.25rem 0',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    fontSize: '1rem',
  },
  infoItemLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  infoItemValue: {
    fontSize: '0.875rem',
    color: '#0066CC',
    textDecoration: 'none',
    fontWeight: 600,
  },
  noticeBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.9rem',
    fontSize: '0.8rem',
    color: '#64748b',
    lineHeight: 1.65,
  },
};
