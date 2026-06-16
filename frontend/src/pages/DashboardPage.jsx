import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { hitlApi } from '../api/hitlApi';
import { emergencyApi } from '../api/emergencyApi';
import { useWebSocket } from '../hooks/useWebSocket';
import PatientNotesPreview from '../components/PatientNotesPreview';
import Navbar from '../components/Navbar';
import UserProfileModal from '../components/userDataModal';
import UserFormModal from '../components/UserFormModal';

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
    <div style={{ textAlign: 'right', minWidth: 180 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--color-charcoal)', lineHeight: 1 }}>
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-mid)', marginTop: 4 }}>
        {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
  );
};

const ActionCard = ({ icon, title, desc, onClick, index, badge }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.75rem',
        cursor: 'pointer',
        border: `1.5px solid ${hovered ? 'var(--color-charcoal)' : 'var(--color-sage-subtle)'}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 30px rgba(44, 44, 42, 0.08)' : '0 2px 8px rgba(44, 44, 42, 0.03)',
        opacity: 0,
        animation: `cardIn 0.5s ease forwards ${index * 0.07}s`,
      }}
    >
      {badge && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: 'var(--color-ember)', color: '#fff',
          fontSize: '10px', fontWeight: 700, padding: '4px 8px',
          borderRadius: 'var(--radius-full)', textTransform: 'uppercase',
          letterSpacing: '0.05em', boxShadow: '0 2px 4px rgba(234, 46, 0, 0.2)'
        }}>
          {badge}
        </div>
      )}
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: hovered ? 'var(--color-charcoal)' : 'var(--color-sage-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, marginBottom: 'var(--space-4)',
        transition: 'all 0.3s ease',
        color: hovered ? '#fff' : 'inherit'
      }}>
        <span style={{ transform: hovered ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.3s ease' }}>{icon}</span>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
        color: 'var(--color-charcoal)',
        marginBottom: 'var(--space-2)', transition: 'color 0.3s ease',
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
        color: 'var(--color-charcoal-mid)',
        lineHeight: 1.55, transition: 'color 0.3s ease',
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
  const [pendingQueue, setPendingQueue] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [resolvingEmergencyId, setResolvingEmergencyId] = useState(null);
  const [error, setError] = useState('');
  const [copyToast, setCopyToast] = useState('');
  const toastTimer = useRef(null);

  const { lastMessage } = useWebSocket('/topic/hitl');

  useEffect(() => {
    if (user?.userType === 'CAREGIVER' && lastMessage) {
      if (lastMessage.type === 'NEW_HITL_ITEM' || lastMessage.type === 'QUEUE_UPDATE') {
        fetchPendingHitl();
      }
    }
  }, [lastMessage, user]);

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
    let interval;
    if (user?.userType === 'CAREGIVER') {
      fetchPatients();
      fetchPendingHitl();
      fetchActiveEmergencies();
      interval = setInterval(fetchActiveEmergencies, 5000);
    }
    if (user?.userType === 'DEMENTIA_PATIENT') fetchCaregivers();
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const fetchActiveEmergencies = async () => {
    try {
      const response = await emergencyApi.getCaregiverAlerts();
      if (response.success) {
        const active = (response.data || []).filter(a => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED');
        setActiveEmergencies(active);
      }
    } catch (err) {
      console.error('Failed to load emergencies', err);
    }
  };

  const handleResolveEmergency = async (alertId) => {
    setResolvingEmergencyId(alertId);
    try {
      await emergencyApi.resolveAlert(alertId, 'Resolved from dashboard');
      fetchActiveEmergencies();
      showCopyToast('Emergency marked as resolved!');
    } catch (err) {
      console.error('Failed to resolve emergency', err);
      setError('Failed to resolve emergency.');
    } finally {
      setResolvingEmergencyId(null);
    }
  };

  const fetchPendingHitl = async () => {
    try {
      const response = await hitlApi.getPendingQueue();
      if (response.success && response.data) {
        setPendingQueue(response.data);
      }
    } catch (err) {
      console.error('Failed to load pending HITL queue', err);
    }
  };

  const handleResolveHitl = async (itemId) => {
    setResolvingId(itemId);
    try {
      await hitlApi.assignToReviewer(itemId);
      await hitlApi.resolveOffline(itemId);
      fetchPendingHitl();
      showCopyToast('Issue marked as resolved!');
    } catch (err) {
      console.error('Failed to resolve issue', err);
      setError('Failed to resolve issue.');
    } finally {
      setResolvingId(null);
    }
  };

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const patientCards = [
    { icon: '📅', title: 'Daily Routines', desc: 'Manage your daily schedule', onClick: () => navigate('/routines') },
    { icon: '🚨', title: 'Emergency SOS', desc: 'Alert your caregivers instantly', onClick: () => navigate('/emergency') },
    { icon: '🎤', title: 'Voice Assistant', desc: 'Talk to your AI companion', onClick: () => navigate('/voice-helper') },
    { icon: '📝', title: 'My Notes', desc: 'Write down important things', onClick: () => navigate('/notes') },
    { icon: '📁', title: 'My Files', desc: 'Store your documents safely', onClick: () => navigate('/files') },
    { icon: '🤖', title: 'Simple Summaries', desc: 'Understand documents easily', onClick: () => navigate('/summarization') },
  ];

  const normalCards = [
    { icon: '📁', title: 'File Manager', desc: 'Upload & organize documents', onClick: () => navigate('/files') },
    { icon: '🤖', title: 'AI Summaries', desc: 'Get smart document summaries', onClick: () => navigate('/summarization') },
    { icon: '📅', title: 'Daily Routines', desc: 'Manage your daily schedule', onClick: () => navigate('/routines') },
    { icon: '📝', title: 'Notes', desc: 'Personal notes & reminders', onClick: () => navigate('/notes') },
    { icon: '🎤', title: 'Voice Assistant', desc: 'Interact with AI via voice', onClick: () => navigate('/voice-helper') },
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

      <Navbar />

      

      {/* Main */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'calc(var(--nav-height) + var(--space-8)) 5vw 6rem' }}>

        {/* Error */}
        {error && (
          <div style={{ background: '#fff0ee', border: '1.5px solid #EA2E0030', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-ember)' }}>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-charcoal-mid)' }}>×</button>
          </div>
        )}

        {/* Greeting */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'start', marginBottom: 'var(--space-10)', gap: 'var(--space-8)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-sage-dark)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
              {getGreeting()}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 4vw, 56px)', fontWeight: 700, color: 'var(--color-charcoal)', lineHeight: 1.05, marginBottom: 'var(--space-3)' }}>
              {firstName} <span style={{ color: 'var(--color-ember)' }}>👋</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              {user?.userType === 'CAREGIVER' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--color-white)', border: '1.5px solid var(--color-sage-light)', padding: '8px 14px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-sm)', boxShadow: 'var(--shadow-sm)', maxWidth: '100%' }}>
                  <span style={{ color: 'var(--color-charcoal-mid)', fontWeight: 600 }}>Caregiver ID:</span>
                  <code style={{ fontFamily: 'monospace', color: 'var(--color-charcoal)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.id}</code>
                  <button onClick={handleCopyId} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: 'var(--color-sage-dark)', flexShrink: 0 }} title="Copy ID">
                    📋
                  </button>
                </div>
              )}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)', color: 'var(--color-charcoal-mid)', lineHeight: 1.6, margin: 0 }}>
                {user?.userType === 'DEMENTIA_PATIENT'
                  ? 'Everything you need is right here. Take it one step at a time.'
                  : user?.userType === 'CAREGIVER'
                    ? "Your patients are in good hands. Here's your overview."
                    : 'Welcome to your Digital Twin home.'}
              </p>
            </div>
          </div>
          <LiveClock />
        </div>

        {/* ── DEMENTIA PATIENT ── */}
        {user?.userType === 'DEMENTIA_PATIENT' && (
          <>
            {(!user?.fullName || !user?.phoneNumber || !user?.emergencyContacts?.length) && (
              <div style={{ background: 'var(--color-cream)', border: '1.5px solid var(--color-ember)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5) var(--space-6)', marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', boxShadow: '0 4px 12px rgba(44, 44, 42, 0.05)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: 4 }}>
                    <span style={{ color: 'var(--color-ember)', marginRight: '8px' }}>💡</span>
                    Recommended: Complete Your Health & Safety Profile
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-mid)' }}>
                    Add emergency contacts and your phone number to enable SMS reminders and SOS alerts.
                  </div>
                </div>
                <button onClick={() => navigate('/profile-setup')} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)', background: 'var(--color-charcoal)', color: 'var(--color-white)', border: '1px solid var(--color-charcoal)', borderRadius: 'var(--radius-full)', padding: '10px 24px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Complete Profile →
                </button>
              </div>
            )}

            {/* View On-Chain Data Card */}
            <div style={{ background: '#eff6ff', border: '1.5px solid #dbeafe', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5) var(--space-6)', marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', boxShadow: '0 4px 12px rgba(44, 44, 42, 0.05)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#1e3a8a', marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>🔍</span>
                  View On-Chain Data
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: '#1e40af', marginTop: '4px' }}>
                  See your identity and emergency contacts stored permanently on the blockchain.
                </div>
              </div>
              <button onClick={() => setIsModalOpen(true)} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 24px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.background = '#1d4ed8'} onMouseOut={(e) => e.target.style.background = '#2563eb'}>
                View Data →
              </button>
            </div>

            {/* My Caregivers */}
            <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', border: '1.5px solid var(--color-sage-light)', marginBottom: 'var(--space-6)', boxShadow: 'var(--shadow-sm)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-sage-dark)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Care team</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-charcoal)', margin: 0 }}>My Caregivers</h3>
              </div>
              {loadingCaregivers
                ? <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 'var(--space-2)' }}><div style={{ width: 26, height: 26, border: '3px solid var(--color-sage)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
                : caregivers.length > 0
                  ? <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {caregivers.map((c, i) => (
                      <div key={c.id || i} style={{ background: 'var(--color-cream)', borderRadius: 'var(--radius-full)', padding: '8px 14px 8px 8px', border: '1px solid var(--color-cream-dark)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', maxWidth: 360, minWidth: 220 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--color-sage-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-white)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{c.fullName?.[0] || 'C'}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.fullName || 'Caregiver'}</div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-muted)', whiteSpace: 'nowrap' }}>@{c.username || 'unknown'}</div>
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.phoneNumber || c.email || 'Connected caregiver'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  : <div style={{ textAlign: 'right', padding: 'var(--space-2) 0', color: 'var(--color-charcoal-mid)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>No caregivers linked yet.</div>
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
        {user?.userType === 'NORMAL' && (
          <div style={{
            background: 'var(--color-white)',
            borderRadius: 24,
            padding: 'var(--space-8)',
            marginBottom: 'var(--space-8)',
            border: '1.5px solid var(--color-sage)',
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
                  background: 'var(--color-sage-subtle)',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  color: 'var(--color-sage-dark)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
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
            <section style={{ marginBottom: 'var(--space-8)' }}>
              <SectionHeading label="Connected patients" title="Linked patient list" />
              <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', border: '1.5px solid var(--color-sage-light)', boxShadow: 'var(--shadow-sm)' }}>
                {loadingPatients
                  ? <div style={{ textAlign: 'center', padding: 'var(--space-10)' }}><div style={{ width: 40, height: 40, border: '3px solid var(--color-sage)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} /></div>
                  : patients.length > 0
                    ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                      {patients.map(p => (
                        <div key={p.id} style={{ background: 'var(--color-cream)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--color-cream-dark)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-sage-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-white)', fontWeight: 700, fontSize: 18 }}>{p.fullName?.[0] || 'P'}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.fullName || 'Patient'}</div>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)', whiteSpace: 'nowrap' }}>📱 {p.phoneNumber || 'N/A'}</span>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, background: p.active ? 'var(--color-sage-subtle)' : 'var(--color-cream-dark)', color: p.active ? 'var(--color-sage-dark)' : 'var(--color-charcoal-mid)', padding: '4px 10px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.active ? 'Active' : 'Inactive'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    : <div style={{ padding: 'var(--space-10)', textAlign: 'center', border: '1.5px dashed var(--color-cream-dark)', borderRadius: 'var(--radius-lg)' }}>
                      <div style={{ fontSize: 44, marginBottom: 'var(--space-3)' }}>👥</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: 'var(--space-2)' }}>No patients linked yet</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-mid)' }}>Share your Caregiver ID with patients to connect.</div>
                    </div>
                }
              </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', alignItems: 'start', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
              {/* Left Column: HITL Reviews */}
              <section style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', border: '1.5px solid var(--color-sage-light)', boxShadow: 'var(--shadow-sm)', minHeight: 260 }}>
                <SectionHeading label="Requires Action" title={`${pendingQueue.length} Pending Review${pendingQueue.length !== 1 ? 's' : ''}`} />
                {pendingQueue.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {pendingQueue.map((item) => (
                      <div key={item.id} style={{ background: 'var(--color-cream)', borderLeft: '4px solid var(--color-sage-dark)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-charcoal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>👤</span> {item.userFullName}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--color-sage-dark)', fontWeight: 700, background: 'var(--color-sage-subtle)', padding: '4px 8px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase' }}>
                            Score: {Math.round(item.confidenceScore)}%
                          </span>
                        </div>
                        <p style={{ fontSize: '14px', color: 'var(--color-charcoal-mid)', margin: '4px 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                          "{item.query}"
                        </p>
                        <button 
                          onClick={() => handleResolveHitl(item.id)}
                          disabled={resolvingId === item.id}
                          style={{ background: resolvingId === item.id ? 'var(--color-sage-light)' : 'var(--color-sage-dark)', color: 'var(--color-white)', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700, cursor: resolvingId === item.id ? 'not-allowed' : 'pointer', marginTop: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'background 0.2s', fontSize: '13px' }}
                        >
                          {resolvingId === item.id ? 'Resolving...' : '✓ Resolved'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: 'var(--color-cream)', borderRadius: 'var(--radius-md)', padding: 'var(--space-6)', textAlign: 'center', border: '1px dashed var(--color-cream-dark)' }}>
                    <span style={{ fontSize: '24px' }}>✅</span>
                    <p style={{ color: 'var(--color-charcoal-mid)', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>No pending reviews</p>
                  </div>
                )}
              </section>

              {/* Right Column: Emergencies */}
              <section style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', border: activeEmergencies.length > 0 ? '1.5px solid var(--color-ember)' : '1.5px solid var(--color-sage-light)', boxShadow: 'var(--shadow-sm)', minHeight: 260 }}>
                <SectionHeading label="Urgent" title={`${activeEmergencies.length} Active Emergenc${activeEmergencies.length !== 1 ? 'ies' : 'y'}`} />
                {activeEmergencies.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {activeEmergencies.map((alert) => (
                      <div key={alert.id} style={{ background: 'var(--color-ember-subtle)', borderLeft: '4px solid var(--color-ember)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-charcoal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>🚨</span> {alert.patientName}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--color-white)', fontWeight: 700, background: 'var(--color-ember)', padding: '4px 8px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase' }}>
                            {alert.severity}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--color-charcoal-mid)', margin: '4px 0', lineHeight: 1.5 }}>
                          <p style={{ margin: '0 0 4px 0' }}><strong>Type:</strong> {alert.alertType?.replace(/_/g, ' ')}</p>
                          {alert.message && alert.message !== 'Emergency SOS triggered' && <p style={{ margin: '0 0 4px 0' }}><strong>Message:</strong> {alert.message}</p>}
                          {alert.location && alert.location !== 'Location unavailable' && (
                            <p style={{ margin: 0 }}>
                              <strong>Location:</strong>{' '}
                              <a href={alert.location} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-ember-dark)', textDecoration: 'underline' }}>View Map</a>
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => handleResolveEmergency(alert.id)}
                          disabled={resolvingEmergencyId === alert.id}
                          style={{ background: resolvingEmergencyId === alert.id ? 'var(--color-ember-light)' : 'var(--color-ember)', color: 'var(--color-white)', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontWeight: 700, cursor: resolvingEmergencyId === alert.id ? 'not-allowed' : 'pointer', marginTop: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'background 0.2s', fontSize: '13px' }}
                        >
                          {resolvingEmergencyId === alert.id ? 'Resolving...' : '✓ Resolve Emergency'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: 'var(--color-cream)', borderRadius: 'var(--radius-md)', padding: 'var(--space-6)', textAlign: 'center', border: '1px dashed var(--color-cream-dark)' }}>
                    <span style={{ fontSize: '24px' }}>🛡️</span>
                    <p style={{ color: 'var(--color-charcoal-mid)', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>No active emergencies</p>
                  </div>
                )}
              </section>
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

      <UserProfileModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSecureData={() => {
          setIsModalOpen(false);
          setIsFormModalOpen(true);
        }}
      />

      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={() => setIsFormModalOpen(false)}
        prefillData={user}
      />
    </div>
  );
}
