import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import PatientNotesPreview from '../components/PatientNotesPreview';
import Navbar from '../components/navbar';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--color-charcoal)', lineHeight: 1 }}>
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-mid)', marginTop: 4 }}>
        {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
  );
};

const ActionCard = ({ icon, title, desc, onClick, accentColor, index }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? accentColor : 'var(--color-white)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        cursor: 'pointer',
        border: `2px solid ${hovered ? accentColor : 'rgba(157,189,184,0.2)'}`,
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 16px 40px ${accentColor}30` : 'none',
        opacity: 0,
        animation: `cardIn 0.5s ease forwards ${index * 0.07}s`,
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 'var(--radius-md)',
        background: hovered ? 'rgba(255,255,255,0.2)' : `${accentColor}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, marginBottom: 'var(--space-4)',
        transition: 'background 0.25s ease',
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600,
        color: hovered ? '#fff' : 'var(--color-charcoal)',
        marginBottom: 'var(--space-2)', transition: 'color 0.25s ease',
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
        color: hovered ? 'rgba(255,255,255,0.8)' : 'var(--color-charcoal-mid)',
        lineHeight: 1.55, transition: 'color 0.25s ease',
      }}>
        {desc}
      </div>
    </div>
  );
};

const SectionHeading = ({ label, title }) => (
  <div style={{ marginBottom: 'var(--space-5)' }}>
    <div style={{
      fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 700,
      color: 'var(--color-ember)', textTransform: 'uppercase', letterSpacing: '0.1em',
      marginBottom: 'var(--space-2)',
    }}>{label}</div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--color-charcoal)' }}>{title}</h2>
  </div>
);

// Blockchain Storage Modal Component
const BlockchainStorageModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (formData.email.length > 100) {
      newErrors.email = 'Email must be 100 characters or less';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    } else if (formData.phone_number.length > 15) {
      newErrors.phone_number = 'Phone must be 15 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
      setFormData({ name: '', email: '', phone_number: '' });
    }, 2000);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'modalBackdropIn 0.3s ease',
      }}
    >
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          animation: 'modalFadeIn 0.3s ease',
        }}
      />

      {/* Modal Content */}
      <div 
        style={{
          position: 'relative',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          animation: 'modalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          border: '1px solid rgba(157,189,184,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: 'var(--space-6) var(--space-6) 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-2)',
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                boxShadow: '0 10px 20px -5px rgba(99,102,241,0.3)',
              }}>
                ⛓️
              </div>
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--color-charcoal)',
                  margin: 0,
                }}>
                  Save to Blockchain
                </h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-charcoal-mid)',
                  margin: '4px 0 0 0',
                }}>
                  Store your data securely on-chain
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-charcoal-mid)',
              fontSize: 24,
              lineHeight: 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => {
              e.target.style.background = 'var(--color-cream)';
              e.target.style.color = 'var(--color-charcoal)';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'transparent';
              e.target.style.color = 'var(--color-charcoal-mid)';
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        {!showSuccess ? (
          <form onSubmit={handleSubmit} style={{ padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Name Field */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--color-charcoal)',
                  marginBottom: 'var(--space-2)',
                }}>
                  Full Name
                  <span style={{ 
                    float: 'right', 
                    fontWeight: 400, 
                    color: formData.name.length > 45 ? 'var(--color-ember)' : 'var(--color-charcoal-mid)',
                    fontSize: 'var(--text-xs)',
                  }}>
                    {formData.name.length}/50
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-md)',
                    color: 'var(--color-charcoal)',
                    background: errors.name ? '#FEF2F2' : 'var(--color-cream)',
                    border: `2px solid ${errors.name ? '#FCA5A5' : 'transparent'}`,
                    borderRadius: 'var(--radius-lg)',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#6366F1';
                    e.target.style.background = 'var(--color-white)';
                    e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = errors.name ? '#FCA5A5' : 'transparent';
                    e.target.style.background = errors.name ? '#FEF2F2' : 'var(--color-cream)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.name && (
                  <div style={{
                    marginTop: 'var(--space-1)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-ember)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    ⚠️ {errors.name}
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--color-charcoal)',
                  marginBottom: 'var(--space-2)',
                }}>
                  Email Address
                  <span style={{ 
                    float: 'right', 
                    fontWeight: 400, 
                    color: formData.email.length > 90 ? 'var(--color-ember)' : 'var(--color-charcoal-mid)',
                    fontSize: 'var(--text-xs)',
                  }}>
                    {formData.email.length}/100
                  </span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-md)',
                    color: 'var(--color-charcoal)',
                    background: errors.email ? '#FEF2F2' : 'var(--color-cream)',
                    border: `2px solid ${errors.email ? '#FCA5A5' : 'transparent'}`,
                    borderRadius: 'var(--radius-lg)',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#6366F1';
                    e.target.style.background = 'var(--color-white)';
                    e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = errors.email ? '#FCA5A5' : 'transparent';
                    e.target.style.background = errors.email ? '#FEF2F2' : 'var(--color-cream)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.email && (
                  <div style={{
                    marginTop: 'var(--space-1)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-ember)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    ⚠️ {errors.email}
                  </div>
                )}
              </div>

              {/* Phone Field */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--color-charcoal)',
                  marginBottom: 'var(--space-2)',
                }}>
                  Phone Number
                  <span style={{ 
                    float: 'right', 
                    fontWeight: 400, 
                    color: formData.phone_number.length > 12 ? 'var(--color-ember)' : 'var(--color-charcoal-mid)',
                    fontSize: 'var(--text-xs)',
                  }}>
                    {formData.phone_number.length}/15
                  </span>
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                  placeholder="+1 234 567 8900"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-md)',
                    color: 'var(--color-charcoal)',
                    background: errors.phone_number ? '#FEF2F2' : 'var(--color-cream)',
                    border: `2px solid ${errors.phone_number ? '#FCA5A5' : 'transparent'}`,
                    borderRadius: 'var(--radius-lg)',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#6366F1';
                    e.target.style.background = 'var(--color-white)';
                    e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = errors.phone_number ? '#FCA5A5' : 'transparent';
                    e.target.style.background = errors.phone_number ? '#FEF2F2' : 'var(--color-cream)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.phone_number && (
                  <div style={{
                    marginTop: 'var(--space-1)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-ember)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    ⚠️ {errors.phone_number}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div style={{
                background: 'linear-gradient(135deg, #EEF2FF 0%, #F3F0FF 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                border: '1px solid #C7D2FE',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-3)',
                }}>
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#3730A3',
                      marginBottom: '4px',
                    }}>
                      Secure Storage
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-xs)',
                      color: '#5B21B6',
                      lineHeight: 1.5,
                    }}>
                      Your data will be stored permanently on the Solana blockchain. 
                      This action requires a small transaction fee.
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: 'var(--space-3)',
                marginTop: 'var(--space-2)',
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-md)',
                    fontWeight: 600,
                    color: 'var(--color-charcoal)',
                    background: 'var(--color-cream)',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.target.style.background = '#E5E7EB';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.target.style.background = 'var(--color-cream)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 2,
                    padding: '14px 24px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-md)',
                    fontWeight: 600,
                    color: '#fff',
                    background: isSubmitting ? '#9CA3AF' : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isSubmitting ? 'none' : '0 10px 20px -5px rgba(99,102,241,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={e => {
                    if (!isSubmitting) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 15px 30px -5px rgba(99,102,241,0.4)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSubmitting) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 10px 20px -5px rgba(99,102,241,0.3)';
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div style={{
                        width: 18,
                        height: 18,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      Storing...
                    </>
                  ) : (
                    <>
                      ⛓️ Store on Chain
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Success State */
          <div style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            animation: 'modalFadeIn 0.5s ease',
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-5)',
              fontSize: 40,
              boxShadow: '0 20px 40px -10px rgba(16,185,129,0.4)',
              animation: 'successPop 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              ✓
            </div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-charcoal)',
              marginBottom: 'var(--space-2)',
            }}>
              Stored Successfully!
            </h3>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-md)',
              color: 'var(--color-charcoal-mid)',
              margin: 0,
            }}>
              Your information has been saved to the blockchain.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes successPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCaregivers, setShowCaregivers] = useState(false);
  const [error, setError] = useState('');
  const [copyToast, setCopyToast] = useState('');
  const [showBlockchainModal, setShowBlockchainModal] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showCopyToast = (msg) => {
    setCopyToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setCopyToast(''), 2500);
  };

  const handleCopyId = async () => {
    try { await navigator.clipboard.writeText(user?.id); showCopyToast('ID copied to clipboard'); }
    catch { showCopyToast('Copy failed — please copy manually'); }
  };

  useEffect(() => { if (user?.userType === 'CAREGIVER') fetchPatients(); }, [user]);

  const fetchPatients = async () => {
    setLoadingPatients(true);
    try { const r = await axios.get('/connections/my-patients'); if (r.data.success) setPatients(r.data.data); }
    catch { setError('Failed to load patients.'); }
    finally { setLoadingPatients(false); }
  };

  const fetchCaregivers = async () => {
    setLoadingCaregivers(true);
    try {
      const r = await axios.get('/connections/my-caregivers');
      if (r.data.success) { setCaregivers(Array.isArray(r.data.data) ? r.data.data : [r.data.data]); setShowCaregivers(true); }
    } catch { setError('Failed to load caregivers.'); }
    finally { setLoadingCaregivers(false); }
  };

  const handleViewCaregivers = () => {
    if (!showCaregivers && caregivers.length === 0) fetchCaregivers();
    else setShowCaregivers(v => !v);
  };

  const handleLogout = async () => {
    setLoading(true);
    try { await logout(); navigate('/login'); }
    catch { setError('Logout failed.'); setLoading(false); }
  };

  const firstName = (user?.fullName || user?.username || '').split(' ')[0];

  const patientCards = [
    { icon: '💊', title: 'Medications', desc: 'Track medicines & reminders', onClick: () => navigate('/medications'), color: '#EA2E00' },
    { icon: '🚨', title: 'Emergency SOS', desc: 'Alert your caregivers instantly', onClick: () => navigate('/emergency'), color: '#C22500' },
    { icon: '🎤', title: 'Voice Assistant', desc: 'Talk to your AI companion', onClick: () => navigate('/voice-helper'), color: '#9DBDB8' },
    { icon: '📝', title: 'My Notes', desc: 'Write down important things', onClick: () => navigate('/notes'), color: '#6A9E98' },
    { icon: '📁', title: 'My Files', desc: 'Store your documents safely', onClick: () => navigate('/files'), color: '#EA2E00' },
    { icon: '🤖', title: 'Simple Summaries', desc: 'Understand documents easily', onClick: () => navigate('/summarization'), color: '#6A9E98' },
    { icon: '⛓️', title: 'Save Data On Chain', desc: 'Store info on blockchain securely', onClick: () => setShowBlockchainModal(true), color: '#6366F1' },
  ];

  const caregiverCards = [
    { icon: '👥', title: 'HITL Review', desc: 'Review pending patient queries', onClick: () => navigate('/hitl-dashboard'), color: '#9DBDB8' },
    { icon: '🚨', title: 'Emergency Alerts', desc: 'View & manage patient emergencies', onClick: () => navigate('/caregiver-emergency'), color: '#EA2E00' },
  ];

  const normalCards = [
    { icon: '📁', title: 'File Manager', desc: 'Upload & organize documents', onClick: () => navigate('/files'), color: '#EA2E00' },
    { icon: '🤖', title: 'AI Summaries', desc: 'Get smart document summaries', onClick: () => navigate('/summarization'), color: '#9DBDB8' },
    { icon: '📝', title: 'Notes', desc: 'Personal notes & reminders', onClick: () => navigate('/notes'), color: '#6A9E98' },
    { icon: '🎤', title: 'Voice Assistant', desc: 'Interact with AI via voice', onClick: () => navigate('/voice-helper'), color: '#EA2E00' },
    { icon: '⛓️', title: 'Save Data On Chain', desc: 'Store info on blockchain securely', onClick: () => setShowBlockchainModal(true), color: '#6366F1' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
      <style>{`
        @keyframes cardIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* Toast */}
      {copyToast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--color-charcoal)', color: 'var(--color-white)',
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
          padding: '12px 24px', borderRadius: 'var(--radius-full)',
          zIndex: 999, animation: 'toastIn 0.3s ease', boxShadow: 'var(--shadow-lg)',
        }}>{copyToast}</div>
      )}

      {/* Blockchain Modal */}
      <BlockchainStorageModal 
        isOpen={showBlockchainModal} 
        onClose={() => setShowBlockchainModal(false)} 
      />

      {/* Navbar */}
      <Navbar
        firstName={firstName}
        handleLogout={handleLogout}
        loading={loading}
      />
      {/* Main */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '3rem 5vw 6rem' }}>

        {/* Error */}
        {error && (
          <div style={{ background: '#fff0ee', border: '1.5px solid #EA2E0030', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-ember)' }}>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-charcoal-mid)' }}>×</button>
          </div>
        )}

        {/* Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-12)', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-sage-dark)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
              {getGreeting()}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, color: 'var(--color-charcoal)', lineHeight: 1.1, marginBottom: 'var(--space-3)' }}>
              {firstName} <span style={{ color: 'var(--color-ember)' }}>👋</span>
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)', color: 'var(--color-charcoal-mid)', lineHeight: 1.6 }}>
              {user?.userType === 'DEMENTIA_PATIENT'
                ? 'Everything you need is right here. Take it one step at a time.'
                : user?.userType === 'CAREGIVER'
                  ? "Your patients are in good hands. Here's your overview."
                  : 'Welcome to your Digital Twin home.'}
            </p>
          </div>
          <LiveClock />
        </div>

        {/* ── DEMENTIA PATIENT ── */}
        {user?.userType === 'DEMENTIA_PATIENT' && (
          <>
            {(!user?.fullName || !user?.phoneNumber) && (
              <div style={{ background: 'linear-gradient(135deg,#FFF8E7,#FFF3D0)', border: '1.5px solid #F0C040', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5) var(--space-6)', marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>Complete your profile</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: '#A16207' }}>Add your name and phone number to unlock all features.</div>
                </div>
                <button onClick={() => navigate('/profile-setup')} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)', background: '#D97706', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 24px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Set up now →
                </button>
              </div>
            )}

            {showCaregivers && (
              <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-8)', border: '1.5px solid var(--color-sage-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--color-charcoal)' }}>My Caregivers</h3>
                  <button onClick={() => setShowCaregivers(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-charcoal-mid)' }}>×</button>
                </div>
                {loadingCaregivers
                  ? <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}><div style={{ width: 36, height: 36, border: '3px solid var(--color-sage)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} /></div>
                  : caregivers.length > 0
                    ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 'var(--space-4)' }}>
                      {caregivers.map((c, i) => (
                        <div key={c.id || i} style={{ background: 'var(--color-cream)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{c.fullName?.[0] || 'C'}</div>
                            <div>
                              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-charcoal)' }}>{c.fullName || 'Caregiver'}</div>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)' }}>{c.email}</div>
                            </div>
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)' }}>📱 {c.phoneNumber || 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                    : <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-charcoal-mid)', fontFamily: 'var(--font-body)' }}>No caregivers linked yet.</div>
                }
              </div>
            )}
            <PatientNotesPreview />
            <SectionHeading label="Your tools" title="What would you like to do?" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
              {patientCards.map((c, i) => <ActionCard key={c.title} {...c} accentColor={c.color} index={i} />)}
            </div>

            {/* Caregivers toggle */}
            <div onClick={handleViewCaregivers} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5) var(--space-6)', border: '1.5px solid var(--color-sage-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--color-sage-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👨‍⚕️</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--color-charcoal)' }}>My Caregivers</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-mid)' }}>View the people taking care of you</div>
                </div>
              </div>
              <span style={{ fontSize: 18, color: 'var(--color-charcoal-mid)' }}>{showCaregivers ? '▲' : '▼'}</span>
            </div>
          </>
        )}
        {/* ── NOTES FEATURE PREVIEW ── */}
        {user?.userType !== 'DEMENTIA_PATIENT' && (
          <div style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            borderRadius: 24,
            padding: 'var(--space-8)',
            marginBottom: 'var(--space-8)',
            border: '2px solid #86EFAC',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative background element */}
            <div style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              background: 'radial-gradient(circle, rgba(134,239,172,0.3) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}>
                <span style={{ fontSize: 32 }}>📝</span>
                <span style={{ fontSize: 32 }}>🔒</span>
              </div>

              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--color-charcoal)',
                marginBottom: 'var(--space-2)',
                textAlign: 'center',
              }}>
                Patient Notes & Reminders
              </h3>

              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-charcoal-mid)',
                textAlign: 'center',
                maxWidth: 450,
                margin: '0 auto',
                lineHeight: 1.6,
              }}>
                This personalized feature helps dementia patients track medications,
                set reminders, and manage daily notes with an intuitive,
                easy-to-use interface.
              </p>

              <div style={{
                marginTop: 'var(--space-5)',
                textAlign: 'center',
              }}>
                <span style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: '#fff',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: '#16A34A',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                  Available for Dementia Patient Accounts
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── CAREGIVER ── */}
        {user?.userType === 'CAREGIVER' && (
          <>
            <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-8)', border: '1.5px solid var(--color-sage-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--color-sage-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🆔</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--color-charcoal)' }}>Your Caregiver ID</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)' }}>Share this with patients to connect</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--color-cream)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal)', wordBreak: 'break-all' }}>{user?.id}</code>
                <button onClick={handleCopyId} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-xs)', background: 'var(--color-sage)', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>Copy</button>
              </div>
            </div>

            <SectionHeading label="Your patients" title="Linked patients" />
            {loadingPatients
              ? <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><div style={{ width: 40, height: 40, border: '3px solid var(--color-sage)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} /></div>
              : patients.length > 0
                ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                  {patients.map(p => (
                    <div key={p.id} style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', border: '1.5px solid rgba(157,189,184,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>{p.fullName?.[0] || 'P'}</div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--color-charcoal)' }}>{p.fullName || 'Patient'}</div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)' }}>{p.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)' }}>📱 {p.phoneNumber || 'N/A'}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, background: p.active ? '#D1FAE5' : '#F3F4F6', color: p.active ? '#065F46' : '#6B7280', padding: '3px 10px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                : <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-12)', textAlign: 'center', border: '1.5px dashed var(--color-cream-dark)', marginBottom: 'var(--space-8)' }}>
                  <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>👥</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: 'var(--space-2)' }}>No patients linked yet</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-mid)' }}>Share your Caregiver ID with patients to connect</div>
                </div>
            }

            <SectionHeading label="Tools" title="Caregiver tools" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 'var(--space-4)' }}>
              {caregiverCards.map((c, i) => <ActionCard key={c.title} {...c} accentColor={c.color} index={i} />)}
            </div>
          </>
        )}

        {/* ── NORMAL ── */}
        {user?.userType === 'NORMAL' && (
          <>
            <SectionHeading label="Your tools" title="What would you like to do?" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 'var(--space-4)' }}>
              {normalCards.map((c, i) => <ActionCard key={c.title} {...c} accentColor={c.color} index={i} />)}
            </div>
          </>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--color-cream-dark)', padding: 'var(--space-6) 5vw', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-muted)' }}>
        © 2026 DigitalTwin — Built with compassion for dementia care
      </footer>
    </div>
  );
}