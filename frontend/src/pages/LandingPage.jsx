import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  sage: '#9DBDB8',
  sageDark: '#6A9E98',
  sageLight: '#C8DEDD',
  cream: '#F0E7D6',
  creamDark: '#DDD0BA',
  ember: '#EA2E00',
  emberDark: '#C22500',
  emberLight: '#FF6B3D',
  charcoal: '#2C2C2A',
  charcoalMid: '#5F5E5A',
  white: '#FAFAF8',
};

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
  const transforms = { up: 'translateY(32px)', down: 'translateY(-32px)', left: 'translateX(-32px)', right: 'translateX(32px)' };
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

const FeatureCard = ({ icon, title, desc, color, delay }) => (
  <FadeIn delay={delay} direction="up">
    <div style={{
      background: COLORS.white,
      border: `1.5px solid ${color}30`,
      borderRadius: 20,
      padding: '2rem',
      height: '100%',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = `0 20px 40px ${color}20`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.25rem', fontSize: 26,
      }}>{icon}</div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: COLORS.charcoal, marginBottom: 10 }}>{title}</h3>
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 15, color: COLORS.charcoalMid, lineHeight: 1.65, margin: 0 }}>{desc}</p>
    </div>
  </FadeIn>
);

const StatBadge = ({ number, label, delay }) => (
  <FadeIn delay={delay}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 700, color: COLORS.ember, lineHeight: 1 }}>{number}</div>
      <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 15, color: COLORS.charcoalMid, marginTop: 6 }}>{label}</div>
    </div>
  </FadeIn>
);

const TestimonialCard = ({ quote, name, role, delay }) => (
  <FadeIn delay={delay}>
    <div style={{
      background: COLORS.white,
      borderRadius: 20,
      padding: '2rem',
      border: `1.5px solid ${COLORS.sageLight}`,
      position: 'relative',
    }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, color: COLORS.sage, lineHeight: 0.5, marginBottom: 16 }}>"</div>
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 16, color: COLORS.charcoal, lineHeight: 1.7, marginBottom: '1.5rem', fontStyle: 'italic' }}>{quote}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: COLORS.sage, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: COLORS.white,
          fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: 16,
        }}>{name[0]}</div>
        <div>
          <div style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, color: COLORS.charcoal, fontSize: 15 }}>{name}</div>
          <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, color: COLORS.charcoalMid }}>{role}</div>
        </div>
      </div>
    </div>
  </FadeIn>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const features = [
    { icon: '💊', title: 'Medication Reminders', desc: 'Automated alerts remind patients when it\'s time to take their medicine. Caregivers are notified immediately if a dose is missed.', color: COLORS.ember, delay: 0 },
    { icon: '🚨', title: 'Emergency SOS', desc: 'One tap sends an emergency alert to all linked caregivers with the patient\'s real-time location.', color: COLORS.emberDark, delay: 0.1 },
    { icon: '🎤', title: 'Voice Assistant', desc: 'A gentle AI voice companion answers questions in simple, calming language designed for dementia patients.', color: COLORS.sage, delay: 0.2 },
    { icon: '📄', title: 'Document Simplifier', desc: 'Upload medical reports or documents and receive a plain-language summary that anyone can understand.', color: COLORS.sageDark, delay: 0.3 },
    { icon: '📝', title: 'Memory Notes', desc: 'Patients can write or speak daily notes to help preserve and recall personal memories and important events.', color: COLORS.ember, delay: 0.4 },
    { icon: '👥', title: 'Caregiver Dashboard', desc: 'Caregivers get a real-time view of patient activity, alerts, and can review AI responses before they reach the patient.', color: COLORS.sageDark, delay: 0.5 },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${COLORS.cream}; }
        ::selection { background: ${COLORS.sage}40; }
        .nav-link { font-family: 'Lato', sans-serif; font-size: 15px; color: ${COLORS.charcoal}; background: none; border: none; cursor: pointer; padding: 6px 0; transition: color 0.2s; text-decoration: none; }
        .nav-link:hover { color: ${COLORS.ember}; }
        .btn-primary { font-family: 'Lato', sans-serif; font-weight: 700; font-size: 16px; background: ${COLORS.ember}; color: ${COLORS.white}; border: none; border-radius: 50px; padding: 14px 32px; cursor: pointer; transition: background 0.2s, transform 0.2s; letter-spacing: 0.02em; }
        .btn-primary:hover { background: ${COLORS.emberDark}; transform: translateY(-2px); }
        .btn-secondary { font-family: 'Lato', sans-serif; font-weight: 700; font-size: 16px; background: transparent; color: ${COLORS.charcoal}; border: 2px solid ${COLORS.charcoal}30; border-radius: 50px; padding: 14px 32px; cursor: pointer; transition: all 0.2s; }
        .btn-secondary:hover { border-color: ${COLORS.charcoal}; transform: translateY(-2px); }
        .step-number { width: 48px; height: 48px; border-radius: 50%; background: ${COLORS.ember}; color: white; font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? `${COLORS.cream}F0` : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? `1px solid ${COLORS.creamDark}` : 'none',
        transition: 'all 0.3s ease',
        padding: '0 5vw',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: COLORS.charcoal }}>
            Digital<span style={{ color: COLORS.ember }}>Twin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="desktop-nav">
            {['features', 'how-it-works', 'testimonials'].map(id => (
              <button key={id} className="nav-link" onClick={() => scrollTo(id)}>
                {id.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-secondary" style={{ padding: '10px 24px', fontSize: 14 }} onClick={() => navigate('/login')}>Sign in</button>
            <button className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }} onClick={() => navigate('/register')}>Get started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: '100vh', background: COLORS.cream, display: 'flex', alignItems: 'center', padding: '120px 5vw 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: `${COLORS.sage}20`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: '30%', width: 300, height: 300, borderRadius: '50%', background: `${COLORS.ember}10`, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: `${COLORS.sage}25`, borderRadius: 50, padding: '6px 16px',
              marginBottom: 24, fontFamily: "'Lato', sans-serif", fontSize: 13,
              color: COLORS.sageDark, fontWeight: 700, letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.sage, display: 'inline-block' }} />
              Dementia Care Platform
            </div>

            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(42px, 5vw, 68px)',
              fontWeight: 700, lineHeight: 1.1,
              color: COLORS.charcoal, marginBottom: 24,
            }}>
              Care that remembers,<br />
              <span style={{ color: COLORS.ember }}>when it's hard to.</span>
            </h1>

            <p style={{
              fontFamily: "'Lato', sans-serif", fontSize: 18,
              color: COLORS.charcoalMid, lineHeight: 1.7,
              maxWidth: 480, marginBottom: 40,
            }}>
              A personalized digital companion for dementia patients and their caregivers — with medication reminders, emergency alerts, voice assistance, and real-time monitoring.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => navigate('/register')}>Start for free</button>
              <button className="btn-secondary" onClick={() => scrollTo('features')}>See how it works</button>
            </div>

            <div style={{ marginTop: 48, display: 'flex', gap: 32 }}>
              {[['10K+', 'Patients helped'], ['98%', 'Alert accuracy'], ['24/7', 'Monitoring']].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: COLORS.ember }}>{n}</div>
                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, color: COLORS.charcoalMid, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div style={{ position: 'relative' }}>
            <div style={{
              background: COLORS.white, borderRadius: 28,
              padding: '2rem', boxShadow: `0 40px 80px ${COLORS.charcoal}15`,
              position: 'relative', zIndex: 2,
            }}>
              {/* Mock app UI */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: COLORS.charcoal }}>Good morning, Margaret</div>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: COLORS.sage, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.white, fontWeight: 700 }}>M</div>
              </div>

              <div style={{ background: `${COLORS.sage}15`, borderRadius: 16, padding: '1rem 1.25rem', marginBottom: 12 }}>
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 12, color: COLORS.sageDark, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Next medication</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 16, fontWeight: 700, color: COLORS.charcoal }}>Aricept 10mg</div>
                    <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, color: COLORS.charcoalMid }}>in 15 minutes — 8:00 AM</div>
                  </div>
                  <div style={{ background: COLORS.sage, borderRadius: 50, padding: '6px 16px', fontFamily: "'Lato', sans-serif", fontSize: 13, color: COLORS.white, fontWeight: 700 }}>Remind</div>
                </div>
              </div>

              <div style={{ background: `${COLORS.ember}10`, borderRadius: 16, padding: '1rem 1.25rem', marginBottom: 12 }}>
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 12, color: COLORS.ember, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Emergency contacts</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Sarah (daughter)', 'Dr. Patel', 'Home care'].map(c => (
                    <div key={c} style={{ background: COLORS.white, borderRadius: 50, padding: '4px 12px', fontFamily: "'Lato', sans-serif", fontSize: 12, color: COLORS.charcoalMid, border: `1px solid ${COLORS.creamDark}` }}>{c}</div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['🎤', 'Voice Assistant', COLORS.sage], ['📝', 'Today\'s Notes', COLORS.cream], ['📄', 'My Documents', COLORS.cream], ['🚨', 'SOS Alert', COLORS.ember + '15']].map(([icon, label, bg]) => (
                  <div key={label} style={{ background: bg, borderRadius: 14, padding: '0.875rem', fontFamily: "'Lato', sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.charcoal, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>{label}
                  </div>
                ))}
              </div>
            </div>

            {/* Floating notification */}
            <div style={{
              position: 'absolute', top: -20, right: -20, zIndex: 3,
              background: COLORS.white, borderRadius: 16, padding: '12px 16px',
              boxShadow: `0 8px 24px ${COLORS.charcoal}15`,
              display: 'flex', alignItems: 'center', gap: 10,
              animation: 'float 3s ease-in-out infinite',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${COLORS.ember}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💊</div>
              <div>
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.charcoal }}>Medication reminder</div>
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 12, color: COLORS.charcoalMid }}>sent to caregiver</div>
              </div>
            </div>
          </div>
        </div>

        <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
      </section>

      {/* Stats */}
      <section style={{ background: COLORS.sage, padding: '5rem 5vw' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
          <StatBadge number="55M+" label="People with dementia worldwide" delay={0} />
          <StatBadge number="70%" label="Medication doses missed without support" delay={0.1} />
          <StatBadge number="3x" label="Faster caregiver response with alerts" delay={0.2} />
          <StatBadge number="24/7" label="Continuous patient monitoring" delay={0.3} />
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ background: COLORS.cream, padding: '8rem 5vw' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.ember, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Everything they need</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: COLORS.charcoal, marginBottom: 16 }}>Built around the patient</h2>
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 17, color: COLORS.charcoalMid, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
                Every feature is designed with dementia patients in mind — clear, simple, and reliable.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {features.map((f, i) => <FeatureCard key={f.title} {...f} delay={i * 0.08} />)}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ background: COLORS.charcoal, padding: '8rem 5vw' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.sage, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Simple to start</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: COLORS.white }}>Up and running in minutes</h2>
            </div>
          </FadeIn>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {[
              { n: '01', title: 'Create an account', desc: 'Register as a patient or caregiver. Set up your profile with medical details, emergency contacts, and preferences.' },
              { n: '02', title: 'Add medications', desc: 'Enter medications with scheduled times. The system automatically reminds the patient and alerts caregivers if a dose is missed.' },
              { n: '03', title: 'Connect caregivers', desc: 'Link caregivers to the patient account. They receive instant alerts and can monitor activity from their own dashboard.' },
              { n: '04', title: 'Stay supported', desc: 'The voice assistant, document summarizer, and emergency SOS are always available — day and night.' },
            ].map(({ n, title, desc }, i) => (
              <FadeIn key={n} delay={i * 0.1} direction="left">
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                  <div className="step-number">{n}</div>
                  <div style={{ paddingTop: 8 }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: COLORS.white, marginBottom: 10 }}>{title}</h3>
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 16, color: '#B4B2A9', lineHeight: 1.7 }}>{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ background: COLORS.creamDark, padding: '8rem 5vw' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 13, fontWeight: 700, color: COLORS.ember, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Real stories</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: COLORS.charcoal }}>Families trust Digital Twin</h2>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <TestimonialCard
              quote="My mother used to miss her medications every other day. Since we started using Digital Twin, I get an alert the moment something is wrong. It's completely changed how I care for her."
              name="Priya Sharma" role="Caregiver, Pune" delay={0} />
            <TestimonialCard
              quote="The voice assistant speaks to my father in such a calm, simple way. He actually enjoys using it. The AI doesn't confuse him — it answers exactly what he needs to know."
              name="Arjun Mehta" role="Son and caregiver, Mumbai" delay={0.1} />
            <TestimonialCard
              quote="The SOS button gave our whole family peace of mind. My wife pressed it once when she got confused at the park, and we were notified instantly with her location."
              name="Dr. Radhika Nair" role="Caregiver and physician, Bangalore" delay={0.2} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: COLORS.ember, padding: '7rem 5vw', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <FadeIn>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, color: COLORS.white, marginBottom: 20 }}>
              Start supporting your loved one today
            </h2>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 18, color: 'rgba(255,255,255,0.8)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
              Free to get started. No credit card required. Built with compassion for families navigating dementia.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: 16, background: COLORS.white, color: COLORS.ember, border: 'none', borderRadius: 50, padding: '16px 40px', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                onClick={() => navigate('/register')}>
                Create free account
              </button>
              <button style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: 16, background: 'transparent', color: COLORS.white, border: '2px solid rgba(255,255,255,0.5)', borderRadius: 50, padding: '16px 40px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.white; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                onClick={() => navigate('/login')}>
                Sign in
              </button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer style={{ background: COLORS.charcoal, padding: '3rem 5vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: COLORS.white }}>
          Digital<span style={{ color: COLORS.ember }}>Twin</span>
        </div>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#888780' }}>
          © 2026 DigitalTwin. Built with compassion for dementia care.
        </p>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <span key={l} style={{ fontFamily: "'Lato', sans-serif", fontSize: 14, color: '#888780', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = COLORS.white}
              onMouseLeave={e => e.currentTarget.style.color = '#888780'}>{l}</span>
          ))}
        </div>
      </footer>
    </>
  );
}