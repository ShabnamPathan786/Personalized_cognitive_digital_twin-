import { useState, useCallback, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';

// IMPORTANT: Import this in your index.js or App.jsx
// import '@solana/wallet-adapter-react-ui/styles.css';

// Network configuration
const NETWORKS = {
  mainnet: { name: 'Mainnet', endpoint: clusterApiUrl('mainnet-beta'), cluster: 'mainnet-beta' },
  devnet: { name: 'Devnet', endpoint: clusterApiUrl('devnet'), cluster: 'devnet' },
  testnet: { name: 'Testnet', endpoint: clusterApiUrl('testnet'), cluster: 'testnet' },
  localnet: { name: 'Localnet', endpoint: 'http://127.0.0.1:8899', cluster: 'localnet' },
};

// Custom hook for clipboard
const useClipboard = () => {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  }, []);
  return { copied, copy };
};

const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Network Switcher Component
const NetworkSwitcher = ({ currentNetwork, onNetworkChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', background: 'var(--color-cream-dark)',
          border: '1px solid var(--color-sage)', borderRadius: 'var(--radius-full)',
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600,
          color: 'var(--color-charcoal)', cursor: 'pointer', transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => { e.target.style.background = 'var(--color-sage)'; e.target.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.target.style.background = 'var(--color-cream-dark)'; e.target.style.color = 'var(--color-charcoal)'; }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentNetwork === 'mainnet' ? '#22c55e' : '#f59e0b', display: 'inline-block' }} />
        {NETWORKS[currentNetwork]?.name}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'rgba(240,231,214,0.98)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-cream-dark)', borderRadius: 'var(--radius-lg)',
          padding: '8px', minWidth: '140px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', zIndex: 100,
          animation: 'dropdownSlide 0.2s ease',
        }}>
          <style>{`@keyframes dropdownSlide { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          {Object.entries(NETWORKS).map(([key, network]) => (
            <button
              key={key}
              onClick={() => { onNetworkChange(key); setIsOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                padding: '8px 12px', background: currentNetwork === key ? 'var(--color-sage)' : 'transparent',
                color: currentNetwork === key ? '#fff' : 'var(--color-charcoal)', border: 'none',
                borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (currentNetwork !== key) e.target.style.background = 'var(--color-cream-dark)'; }}
              onMouseLeave={(e) => { if (currentNetwork !== key) e.target.style.background = 'transparent'; }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: key === 'mainnet' ? '#22c55e' : '#f59e0b' }} />
              {network.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Custom Connect Wallet Button (REPLACES WalletMultiButton)
const ConnectWalletButton = () => {
    const { wallet, connect, connected, connecting, select, wallets } = useWallet();
    const [showWalletList, setShowWalletList] = useState(false);
    const dropdownRef = useRef(null);
  
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setShowWalletList(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
  
    const handleClick = useCallback(async () => {
      if (connected) return;
      if (wallet) {
        try {
          await connect();
        } catch (err) {
          setShowWalletList(true);
        }
      } else {
        setShowWalletList(true);
      }
    }, [connected, wallet, connect]);
  
    const handleSelectWallet = useCallback(async (walletName) => {
      select(walletName);
      setShowWalletList(false);
      // Small delay to let wallet be selected before connecting
      setTimeout(async () => {
        try {
          await connect();
        } catch (err) {
          console.error('Connection failed:', err);
        }
      }, 100);
    }, [select, connect]);
  
    return (
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={handleClick}
          disabled={connecting}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 20px', background: 'var(--color-ember)',
            color: '#fff', border: 'none', borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 700,
            cursor: connecting ? 'wait' : 'pointer', transition: 'all 0.2s ease',
            opacity: connecting ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!connecting) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,38,38,0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {connecting ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ animation: 'spin 1s linear infinite' }}>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
              Connect Wallet
            </>
          )}
        </button>
  
        {/* Custom wallet picker dropdown */}
        {showWalletList && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: 'rgba(240,231,214,0.98)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--color-cream-dark)', borderRadius: 'var(--radius-lg)',
            padding: '8px', minWidth: '200px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 100,
            animation: 'dropdownSlide 0.2s ease',
          }}>
            <style>{`@keyframes dropdownSlide { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>
            <p style={{ padding: '8px 12px 4px', fontSize: 'var(--text-xs)', fontWeight: 700,
              color: 'var(--color-charcoal-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Select Wallet
            </p>
            {wallets.length === 0 && (
              <p style={{ padding: '8px 12px', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-mid)' }}>
                No wallets found. Install Phantom.
              </p>
            )}
            {wallets.map((w) => (
              <button
                key={w.adapter.name}
                onClick={() => handleSelectWallet(w.adapter.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 12px', background: 'transparent', border: 'none',
                  borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-charcoal)',
                  cursor: 'pointer', transition: 'background 0.15s ease', textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-cream-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {w.adapter.icon && (
                  <img src={w.adapter.icon} alt={w.adapter.name} style={{ width: 20, height: 20, borderRadius: 4 }} />
                )}
                {w.adapter.name}
                <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)',
                  color: w.readyState === 'Installed' ? '#22c55e' : 'var(--color-charcoal-muted)' }}>
                  {w.readyState === 'Installed' ? 'Installed' : 'Not installed'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
// Wallet Info Component (Connected State)
const WalletInfo = ({ publicKey, disconnect }) => {
  const { copied, copy } = useClipboard();
  const [showDisconnect, setShowDisconnect] = useState(false);
  const address = publicKey?.toBase58();

  return (
    <div style={{ position: 'relative' }} onMouseEnter={() => setShowDisconnect(true)} onMouseLeave={() => setShowDisconnect(false)}>
      <button
        onClick={() => copy(address)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
          background: 'var(--color-sage)', border: 'none', borderRadius: 'var(--radius-full)',
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600,
          color: '#fff', cursor: 'pointer', transition: 'all 0.2s ease',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copied ? 'Copied!' : truncateAddress(address)}
      </button>

      {showDisconnect && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'rgba(220,38,38,0.95)',
          backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-md)', padding: '8px 16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: 100, animation: 'fadeIn 0.2s ease',
        }}>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <button
            onClick={disconnect}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

// Main Navbar Component
const Navbar = ({ firstName, handleLogout, loading }) => {
  const { publicKey, connected, disconnect } = useWallet();
  const [currentNetwork, setCurrentNetwork] = useState('devnet');

  const handleNetworkChange = useCallback((networkKey) => {
    setCurrentNetwork(networkKey);
    console.log(`Switched to ${NETWORKS[networkKey].name}`);
  }, []);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50, background: 'rgba(240,231,214,0.92)',
      backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-cream-dark)', padding: '0 5vw',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', height: 'var(--nav-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-charcoal)' }}>
          Digital<span style={{ color: 'var(--color-ember)' }}>Twin</span>
        </div>

        {/* Right Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <NetworkSwitcher currentNetwork={currentNetwork} onNetworkChange={handleNetworkChange} />
          
          {/* Wallet Button - Shows Connect or Address */}
          {connected && publicKey ? (
            <WalletInfo publicKey={publicKey} disconnect={disconnect} />
          ) : (
            <ConnectWalletButton />
          )}

          {/* User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', paddingLeft: 'var(--space-3)', borderLeft: '1px solid var(--color-cream-dark)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)' }}>
              {firstName?.[0]?.toUpperCase() || '?'}
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-charcoal)' }}>{firstName}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout} disabled={loading}
            style={{
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)', background: 'var(--color-ember)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '8px 20px',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
            onMouseEnter={(e) => { if (!loading) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 4px 12px rgba(220,38,38,0.3)'; }}}
            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}
          >
            {loading ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>Signing out...</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>Sign out</>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;