import { useRef, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../contexts/AuthContext';

/* ── Scroll-triggered fade-in ── */
const useIntersection = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

const FadeIn = ({ children, delay = 0, direction = 'up' }) => {
  const [ref, visible] = useIntersection();
  const transforms = {
    up: 'translateY(32px)',
    down: 'translateY(-32px)',
    left: 'translateX(-32px)',
    right: 'translateX(32px)',
  };
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translate(0)' : transforms[direction],
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
    }}>
      {children}
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, accentColor, delay }) => (
  <FadeIn delay={delay} direction="up">
    <div
      className="card card-hover"
      style={{ height: '100%', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 20px 40px ${accentColor}20`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        width: 56, height: 56,
        borderRadius: 'var(--radius-md)',
        background: `${accentColor}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 'var(--space-5)', fontSize: 26,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontSize: 20,
        fontWeight: 600, color: 'var(--color-charcoal)',
        marginBottom: 'var(--space-3)',
      }}>
        {title}
      </h3>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
        color: 'var(--color-charcoal-mid)', lineHeight: 1.65, margin: 0,
      }}>
        {desc}
      </p>
    </div>
  </FadeIn>
);

const StatBadge = ({ number, label, delay }) => (
  <FadeIn delay={delay}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)',
        fontWeight: 700, color: 'var(--color-ember)', lineHeight: 1,
      }}>
        {number}
      </div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
        color: 'var(--color-charcoal-mid)', marginTop: 'var(--space-2)',
      }}>
        {label}
      </div>
    </div>
  </FadeIn>
);

const TestimonialCard = ({ quote, name, role, delay }) => (
  <FadeIn delay={delay}>
    <div style={{
      background: 'var(--color-white)',
      borderRadius: 'var(--radius-xl)',
      padding: '2rem',
      border: '1.5px solid var(--color-sage-light)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 48,
        color: 'var(--color-sage)', lineHeight: 0.5, marginBottom: 'var(--space-4)',
      }}>
        "
      </div>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 16,
        color: 'var(--color-charcoal)', lineHeight: 1.7,
        marginBottom: 'var(--space-6)', fontStyle: 'italic',
      }}>
        {quote}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--color-sage)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-white)',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16,
        }}>
          {name[0]}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--color-charcoal)', fontSize: 'var(--text-base)' }}>{name}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-mid)' }}>{role}</div>
        </div>
      </div>
    </div>
  </FadeIn>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const {user} = useAuth()
  const handleNavigate = () => {
    if (!user) {
      navigate('/register', { replace: true });
    } else {
      navigate('/home', { replace: true });
    }
  };
  
  const features = [
    { icon: '💊', title: 'Medication Reminders', desc: "Automated alerts remind patients when it's time to take their medicine. Caregivers are notified immediately if a dose is missed.", accentColor: '#EA2E00', delay: 0 },
    { icon: '🚨', title: 'Emergency SOS', desc: "One tap sends an emergency alert to all linked caregivers with the patient's real-time location.", accentColor: '#C22500', delay: 0.1 },
    { icon: '🎤', title: 'Voice Assistant', desc: 'A gentle AI voice companion answers questions in simple, calming language designed for dementia patients.', accentColor: '#9DBDB8', delay: 0.2 },
    { icon: '📄', title: 'Document Simplifier', desc: 'Upload medical reports or documents and receive a plain-language summary that anyone can understand.', accentColor: '#6A9E98', delay: 0.3 },
    { icon: '📝', title: 'Memory Notes', desc: 'Patients can write or speak daily notes to help preserve and recall personal memories and important events.', accentColor: '#EA2E00', delay: 0.4 },
    { icon: '👥', title: 'Caregiver Dashboard', desc: 'Caregivers get a real-time view of patient activity, alerts, and can review AI responses before they reach the patient.', accentColor: '#6A9E98', delay: 0.5 },
  ];

  const steps = [
    { n: '01', title: 'Create an account', desc: 'Register as a patient or caregiver. Set up your profile with medical details, emergency contacts, and preferences.' },
    { n: '02', title: 'Add medications', desc: 'Enter medications with scheduled times. The system automatically reminds the patient and alerts caregivers if a dose is missed.' },
    { n: '03', title: 'Connect caregivers', desc: 'Link caregivers to the patient account. They receive instant alerts and can monitor activity from their own dashboard.' },
    { n: '04', title: 'Stay supported', desc: 'The voice assistant, document summarizer, and emergency SOS are always available — day and night.' },
  ];

  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 5vw 80px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}>
        {/* Background image layer - separate for hover scale effect */}
        <div
          className="hero-bg"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/assets/bg-image.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: 'scale(1)',
            transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform',
          }}
        />

        {/* Lighter overlay - reduced for clarity */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(240, 231, 214, 0.35)',
          zIndex: 0,
          transition: 'background 0.5s ease',
        }} />

        {/* Subtle vignette - darkens edges so center image pops */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(240,231,214,0.4) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        {/* Content — centered */}
        <div style={{
          position: 'relative', zIndex: 2,
          textAlign: 'center',
          maxWidth: 760,
          margin: '0 auto',
          width: '100%',
        }}>

          <div className="label-tag" style={{ marginBottom: 'var(--space-6)', display: 'inline-flex' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-sage)', display: 'inline-block' }} />
            Dementia Care Platform
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(44px, 5.5vw, 72px)',
            fontWeight: 700,
            lineHeight: 1.08,
            color: 'var(--color-charcoal)',
            marginBottom: 'var(--space-6)',
            letterSpacing: '-0.02em',
          }}>
            Care that remembers,<br />
            <span style={{ color: 'var(--color-ember)' }}>when it's hard to.</span>
          </h1>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-lg)',
            color: 'var(--color-charcoal-mid)',
            lineHeight: 1.75,
            maxWidth: 560,
            margin: '0 auto',
            marginBottom: 'var(--space-10)',
          }}>
            A personalized digital companion for dementia patients and their caregivers — with medication reminders, emergency alerts, voice assistance, and real-time monitoring.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-16)' }}>
            <button className="btn-primary" onClick={handleNavigate}>Start for free</button>
            <button className="btn-secondary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>See how it works</button>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: 0,
            justifyContent: 'center',
            background: 'rgba(250, 250, 248, 0.7)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid rgba(157, 189, 184, 0.3)',
            overflow: 'hidden',
            maxWidth: 560,
            margin: '0 auto',
          }}>
            {[['10K+', 'Patients helped'], ['98%', 'Alert accuracy'], ['24/7', 'Monitoring']].map(([n, l], i) => (
              <div key={l} style={{
                flex: 1,
                padding: 'var(--space-5) var(--space-4)',
                textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(157, 189, 184, 0.25)' : 'none',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-ember)' }}>{n}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-charcoal-mid)', marginTop: 'var(--space-1)', letterSpacing: '0.02em' }}>{l}</div>
              </div>
            ))}
          </div>

        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 36, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8, zIndex: 3,
          cursor: 'pointer',
          opacity: 0.6,
          transition: 'opacity var(--transition-base)',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-charcoal)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>scroll</span>
          <div style={{ width: 1, height: 44, background: 'var(--color-charcoal)', animation: 'scrollLine 1.8s ease-in-out infinite' }} />
        </div>

       
  </section>
      <section style={{ background: 'var(--color-sage)', padding: '5rem 5vw' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
          <StatBadge number="55M+" label="People with dementia worldwide" delay={0} />
          <StatBadge number="70%" label="Medication doses missed without support" delay={0.1} />
          <StatBadge number="3x" label="Faster caregiver response with alerts" delay={0.2} />
          <StatBadge number="24/7" label="Continuous patient monitoring" delay={0.3} />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: 'var(--color-cream)', padding: '8rem 5vw' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <div className="section-label" style={{ color: 'var(--color-ember)' }}>Everything they need</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: 'var(--space-4)' }}>
                Built around the patient
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)', color: 'var(--color-charcoal-mid)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
                Every feature is designed with dementia patients in mind — clear, simple, and reliable.
              </p>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {features.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ background: 'var(--color-charcoal)', padding: '8rem 5vw' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <div className="section-label" style={{ color: 'var(--color-sage)' }}>Simple to start</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: 'var(--color-white)' }}>
                Up and running in minutes
              </h2>
            </div>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {steps.map(({ n, title, desc }, i) => (
              <FadeIn key={n} delay={i * 0.1} direction="left">
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                  <div className="step-number">{n}</div>
                  <div style={{ paddingTop: 8 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--color-white)', marginBottom: 'var(--space-3)' }}>{title}</h3>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--color-charcoal-muted)', lineHeight: 1.7 }}>{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ background: 'var(--color-cream-dark)', padding: '8rem 5vw' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <div className="section-label" style={{ color: 'var(--color-ember)' }}>Real stories</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: 'var(--color-charcoal)' }}>
                Families trust Digital Twin
              </h2>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <TestimonialCard quote="My mother used to miss her medications every other day. Since we started using Digital Twin, I get an alert the moment something is wrong. It's completely changed how I care for her." name="Priya Sharma" role="Caregiver, Pune" delay={0} />
            <TestimonialCard quote="The voice assistant speaks to my father in such a calm, simple way. He actually enjoys using it. The AI doesn't confuse him — it answers exactly what he needs to know." name="Arjun Mehta" role="Son and caregiver, Mumbai" delay={0.1} />
            <TestimonialCard quote="The SOS button gave our whole family peace of mind. My wife pressed it once when she got confused at the park, and we were notified instantly with her location." name="Dr. Radhika Nair" role="Caregiver and physician, Bangalore" delay={0.2} />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'var(--color-ember)', padding: '7rem 5vw', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <FadeIn>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, color: 'var(--color-white)', marginBottom: 'var(--space-5)' }}>
              Start supporting your loved one today
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', color: 'rgba(255,255,255,0.8)', maxWidth: 520, margin: '0 auto', marginBottom: 'var(--space-10)', lineHeight: 1.7 }}>
              Free to get started. No credit card required. Built with compassion for families navigating dementia.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, background: 'var(--color-white)', color: 'var(--color-ember)', border: 'none', borderRadius: 'var(--radius-full)', padding: '16px 40px', cursor: 'pointer', transition: 'transform var(--transition-base)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                onClick={() => navigate('/register')}
              >
                Create free account
              </button>
              <button
                style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, background: 'transparent', color: 'var(--color-white)', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 'var(--radius-full)', padding: '16px 40px', cursor: 'pointer', transition: 'all var(--transition-base)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'white'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--color-charcoal)', padding: '3rem 5vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-white)' }}>
          Digital<span style={{ color: 'var(--color-ember)' }}>Twin</span>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)' }}>
          © 2026 DigitalTwin. Built with compassion for dementia care.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <span key={l}
              style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-muted)', cursor: 'pointer', transition: 'color var(--transition-base)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-white)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-charcoal-muted)'}
            >
              {l}
            </span>
          ))}
        </div>
      </footer>
    </>
  );
}