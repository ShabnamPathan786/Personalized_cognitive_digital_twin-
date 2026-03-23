import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      height: 'var(--nav-height)',
      padding: '0 5vw',
      background: scrolled ? 'rgba(240, 231, 214, 0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--color-cream-dark)' : 'none',
      transition: 'all var(--transition-slow)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--color-charcoal)',
          }}>
            Digital<span style={{ color: 'var(--color-ember)' }}>Twin</span>
          </span>
        </button>

        {/* Nav Links — only show on landing */}
        {!user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {[
              { label: 'Features', id: 'features' },
              { label: 'How it works', id: 'how-it-works' },
              { label: 'Testimonials', id: 'testimonials' },
            ].map(({ label, id }) => (
              <button key={id} className="btn-ghost" onClick={() => scrollTo(id)}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Auth Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <button
                className="btn-ghost"
                onClick={() => navigate('/dashboard')}
                style={{ fontSize: 'var(--text-sm)' }}
              >
                Dashboard
              </button>
              <button
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: 'var(--text-sm)' }}
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-secondary"
                style={{ padding: '10px 24px', fontSize: 'var(--text-sm)' }}
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>
              <button
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: 'var(--text-sm)' }}
                onClick={() => navigate('/register')}
              >
                Get started
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}