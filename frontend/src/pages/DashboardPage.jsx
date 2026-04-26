import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import PatientNotesPreview from '../components/PatientNotesPreview';

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

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyToast, setCopyToast] = useState('');
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

  useEffect(() => {
    if (user?.userType === 'CAREGIVER') fetchPatients();
    if (user?.userType === 'DEMENTIA_PATIENT') fetchCaregivers();
  }, [user]);

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
      if (r.data.success) { setCaregivers(Array.isArray(r.data.data) ? r.data.data : [r.data.data]); }
    } catch { setError('Failed to load caregivers.'); }
    finally { setLoadingCaregivers(false); }
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

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(240,231,214,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-cream-dark)', padding: '0 5vw',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 'var(--nav-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-charcoal)' }}>
            Digital<span style={{ color: 'var(--color-ember)' }}>Twin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {firstName[0]?.toUpperCase()}
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-charcoal)' }}>{firstName}</span>
            </div>
            <button onClick={handleLogout} disabled={loading} style={{
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)',
              background: 'var(--color-ember)', color: '#fff', border: 'none',
              borderRadius: 'var(--radius-full)', padding: '8px 20px', cursor: 'pointer',
              opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
            }}>
              {loading ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </nav>

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

            {/* My Caregivers */}
            <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1.5px solid var(--color-sage-light)', marginBottom: 'var(--space-8)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: 'var(--space-4)' }}>My Caregivers</h3>
              {loadingCaregivers
                ? <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}><div style={{ width: 28, height: 28, border: '3px solid var(--color-sage)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} /></div>
                : caregivers.length > 0
                  ? <div style={{ display: 'grid', gridTemplateColumns: caregivers.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
                    {caregivers.map((c, i) => (
                      <div key={c.id || i} style={{ background: 'var(--color-cream)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>{c.fullName?.[0] || 'C'}</div>
                          <div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-charcoal)' }}>{c.fullName || 'Caregiver'}</div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)' }}>{c.email}</div>
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)' }}>
                          👤 @{c.username || 'unknown'} {c.phoneNumber ? ` • 📱 ${c.phoneNumber}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                  : <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-charcoal-mid)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>No caregivers linked yet.</div>
              }
            </div>

            <PatientNotesPreview />
            <SectionHeading label="Your tools" title="What would you like to do?" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
              {patientCards.map((c, i) => <ActionCard key={c.title} {...c} accentColor={c.color} index={i} />)}
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