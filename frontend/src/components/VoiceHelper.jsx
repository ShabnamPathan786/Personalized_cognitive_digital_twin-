import React, { useState, useEffect, useRef } from 'react';
import { useVoiceWebSocket } from '../hooks/useVoiceWebSocket';
import { useAuth } from '../contexts/AuthContext';

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES — scoped under .va- prefix, uses your design tokens
───────────────────────────────────────────────────────────────────────────── */
const VA_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Lato:wght@300;400;500;700&display=swap');

  .va *, .va *::before, .va *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── PAGE SHELL ─────────────────────────────────────────────────────────── */
  .va {
    font-family: var(--font-body, 'Lato', system-ui, sans-serif);
    background: var(--color-white, #FAFAF8);
    color: var(--color-charcoal, #2C2C2A);
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: fixed;
    inset: 0;
  }

  /* ── TOP NAV ────────────────────────────────────────────────────────────── */
  .va-nav {
    height: 56px;
    min-height: 56px;
    background: var(--color-white, #FAFAF8);
    border-bottom: 1px solid rgba(44,44,42,0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    z-index: 10;
    flex-shrink: 0;
  }
  .va-nav-left {
    display: flex; align-items: center; gap: 10px;
  }
  .va-nav-icon {
    width: 30px; height: 30px;
    background: var(--color-charcoal, #2C2C2A);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .va-nav-title {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 17px;
    font-weight: 600;
    color: var(--color-charcoal, #2C2C2A);
    letter-spacing: -0.3px;
  }
  .va-nav-right {
    display: flex; align-items: center; gap: 8px;
  }
  .va-status-dot-wrap {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px;
    color: var(--color-charcoal-muted, #888780);
    font-weight: 500;
  }
  .va-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .va-dot.online  { background: var(--color-sage, #9DBDB8); animation: vaDotBlink 2.5s ease infinite; }
  .va-dot.offline { background: var(--color-ember, #EA2E00); }
  @keyframes vaDotBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .va-mode-toggle {
    display: flex;
    background: rgba(44,44,42,0.06);
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
  }
  .va-mode-btn {
    padding: 4px 12px;
    border-radius: 6px;
    border: none; cursor: pointer;
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.2px;
    background: transparent;
    color: var(--color-charcoal-mid, #5F5E5A);
    transition: all 0.15s ease;
  }
  .va-mode-btn.active {
    background: var(--color-charcoal, #2C2C2A);
    color: var(--color-white, #FAFAF8);
    box-shadow: 0 1px 4px rgba(44,44,42,0.2);
  }
  .va-mode-btn.active-simple {
    background: var(--color-sage-dark, #6A9E98);
    color: var(--color-white, #FAFAF8);
  }

  .va-icon-btn {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    background: transparent;
    color: var(--color-charcoal-mid, #5F5E5A);
    transition: background 0.15s ease, color 0.15s ease;
  }
  .va-icon-btn:hover { background: rgba(44,44,42,0.07); color: var(--color-charcoal, #2C2C2A); }

  /* ── MESSAGES AREA ──────────────────────────────────────────────────────── */
  .va-messages {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 24px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 0;
    scroll-behavior: smooth;
  }
  .va-messages::-webkit-scrollbar { width: 4px; }
  .va-messages::-webkit-scrollbar-track { background: transparent; }
  .va-messages::-webkit-scrollbar-thumb { background: rgba(44,44,42,0.12); border-radius: 4px; }

  .va-inner {
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  /* ── EMPTY STATE ────────────────────────────────────────────────────────── */
  .va-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 40px 0 80px;
    text-align: center;
  }
  .va-empty-icon {
    width: 56px; height: 56px;
    background: var(--color-charcoal, #2C2C2A);
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 20px rgba(44,44,42,0.15);
  }
  .va-empty-title {
    font-family: var(--font-display, 'Playfair Display', serif);
    font-size: 22px; font-weight: 600;
    color: var(--color-charcoal, #2C2C2A);
    letter-spacing: -0.3px;
  }
  .va-empty-sub {
    font-size: 14px;
    color: var(--color-charcoal-muted, #888780);
    line-height: 1.6;
    max-width: 340px;
  }
  .va-empty-hint {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px;
    background: rgba(157,189,184,0.12);
    border: 1px solid rgba(157,189,184,0.3);
    border-radius: 10px;
    font-size: 13px;
    color: var(--color-charcoal-mid, #5F5E5A);
    font-weight: 500;
  }

  /* ── MESSAGE ROWS ───────────────────────────────────────────────────────── */
  .va-row {
    display: flex;
    gap: 12px;
    padding: 12px 0;
  }
  .va-row.user { flex-direction: row-reverse; }
  .va-row.assistant { flex-direction: row; }

  .va-avatar {
    width: 32px; height: 32px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 13px; font-weight: 700;
    margin-top: 2px;
  }
  .va-avatar.user-av {
    background: var(--color-cream-dark, #DDD0BA);
    color: var(--color-charcoal, #2C2C2A);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .va-avatar.ai-av {
    background: var(--color-charcoal, #2C2C2A);
    color: var(--color-white, #FAFAF8);
    position: relative;
    overflow: hidden;
  }
  .va-avatar.ai-av::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(circle at 30% 30%, var(--color-sage, #9DBDB8), transparent 60%);
    opacity: 0.35;
  }

  .va-bubble-wrap { display: flex; flex-direction: column; gap: 4px; max-width: 75%; }
  .va-row.user .va-bubble-wrap { align-items: flex-end; }
  .va-row.assistant .va-bubble-wrap { align-items: flex-start; }

  .va-bubble {
    padding: 12px 16px;
    border-radius: 16px;
    font-size: 15px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .va-row.user .va-bubble {
    background: var(--color-charcoal, #2C2C2A);
    color: var(--color-white, #FAFAF8);
    border-bottom-right-radius: 4px;
  }
  .va-row.assistant .va-bubble {
    background: var(--color-cream, #F0E7D6);
    color: var(--color-charcoal, #2C2C2A);
    border-bottom-left-radius: 4px;
  }
  .va-bubble-meta {
    font-size: 11px;
    color: var(--color-charcoal-muted, #888780);
    padding: 0 4px;
    display: flex; align-items: center; gap: 6px;
  }
  .va-reviewed-badge {
    background: rgba(157,189,184,0.2);
    color: var(--color-sage-dark, #6A9E98);
    border: 1px solid rgba(157,189,184,0.4);
    border-radius: 20px;
    padding: 1px 7px;
    font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .va-audio {
    margin-top: 8px;
    width: 100%;
  }
  .va-audio audio { width: 100%; border-radius: 8px; height: 32px; }

  /* ── TYPING / PROCESSING INDICATOR ─────────────────────────────────────── */
  .va-thinking {
    display: flex; align-items: center; gap: 5px;
    padding: 12px 16px;
    background: var(--color-cream, #F0E7D6);
    border-radius: 16px;
    border-bottom-left-radius: 4px;
    width: fit-content;
  }
  .va-thinking-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--color-charcoal-mid, #5F5E5A);
    animation: vaThink 1.2s ease-in-out infinite;
  }
  .va-thinking-dot:nth-child(2) { animation-delay: 0.2s; }
  .va-thinking-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes vaThink {
    0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
    40%          { transform: scale(1);   opacity: 1; }
  }

  /* ── ALERT BANNER (inline, non-blocking) ───────────────────────────────── */
  .va-banner {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 13px;
    margin-bottom: 4px;
  }
  .va-banner.error   { background: rgba(234,46,0,0.07);   border: 1px solid rgba(234,46,0,0.2); }
  .va-banner.warning { background: rgba(184,134,11,0.07); border: 1px solid rgba(184,134,11,0.22); }
  .va-banner.info    { background: rgba(157,189,184,0.14); border: 1px solid rgba(157,189,184,0.35); }
  .va-banner-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
  .va-banner-content { flex: 1; }
  .va-banner-title { font-weight: 700; color: var(--color-charcoal, #2C2C2A); margin-bottom: 2px; }
  .va-banner-body  { color: var(--color-charcoal-mid, #5F5E5A); line-height: 1.5; }
  .va-banner-actions { display: flex; gap: 12px; margin-top: 8px; }
  .va-banner-btn {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    background: none; border: none; cursor: pointer; padding: 0;
    color: var(--color-charcoal, #2C2C2A); opacity: 0.6;
    text-decoration: underline; text-underline-offset: 2px;
    transition: opacity 0.15s ease;
  }
  .va-banner-btn:hover { opacity: 1; }

  /* ── BOTTOM INPUT BAR ───────────────────────────────────────────────────── */
  .va-bar {
    flex-shrink: 0;
    background: var(--color-white, #FAFAF8);
    border-top: 1px solid rgba(44,44,42,0.08);
    padding: 12px 16px 20px;
  }
  .va-bar-inner {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* review waiting row */
  .va-review-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 14px;
    background: rgba(184,134,11,0.07);
    border: 1px solid rgba(184,134,11,0.22);
    border-radius: 10px;
    font-size: 12px;
  }
  .va-review-left { display: flex; align-items: center; gap: 8px; color: var(--color-charcoal-mid, #5F5E5A); }
  .va-review-timer { font-weight: 700; color: var(--color-charcoal, #2C2C2A); font-family: monospace; }
  .va-review-cancel {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
    background: none; border: none; cursor: pointer;
    color: var(--color-charcoal-muted, #888780); opacity: 0.7;
    transition: opacity 0.15s ease;
  }
  .va-review-cancel:hover { opacity: 1; }

  /* the input tray */
  .va-tray {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--color-white, #FAFAF8);
    border: 1.5px solid rgba(44,44,42,0.14);
    border-radius: 14px;
    padding: 6px 6px 6px 16px;
    box-shadow: 0 2px 12px rgba(44,44,42,0.06);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .va-tray:focus-within {
    border-color: rgba(157,189,184,0.7);
    box-shadow: 0 0 0 3px rgba(157,189,184,0.12), 0 2px 12px rgba(44,44,42,0.06);
  }
  .va-tray.recording {
    border-color: rgba(234,46,0,0.5);
    box-shadow: 0 0 0 3px rgba(234,46,0,0.08), 0 2px 12px rgba(234,46,0,0.1);
  }

  /* waveform in tray */
  .va-tray-wave {
    flex: 1;
    display: flex; align-items: center; gap: 3px;
    height: 28px;
    padding: 0 4px;
  }
  .va-tray-bar {
    width: 3px; border-radius: 99px;
    background: var(--color-ember, #EA2E00);
    animation: vaWave 0.7s ease-in-out infinite;
  }
  .va-tray-bar:nth-child(1)  { height: 8px;  animation-delay: 0s; }
  .va-tray-bar:nth-child(2)  { height: 16px; animation-delay: 0.07s; }
  .va-tray-bar:nth-child(3)  { height: 22px; animation-delay: 0.14s; }
  .va-tray-bar:nth-child(4)  { height: 12px; animation-delay: 0.21s; }
  .va-tray-bar:nth-child(5)  { height: 20px; animation-delay: 0.1s; }
  .va-tray-bar:nth-child(6)  { height: 14px; animation-delay: 0.17s; }
  .va-tray-bar:nth-child(7)  { height: 18px; animation-delay: 0.05s; }
  .va-tray-bar:nth-child(8)  { height: 10px; animation-delay: 0.22s; }
  .va-tray-bar:nth-child(9)  { height: 24px; animation-delay: 0.12s; }
  .va-tray-bar:nth-child(10) { height: 8px;  animation-delay: 0.19s; }
  @keyframes vaWave {
    0%,100% { transform: scaleY(0.35); opacity: 0.6; }
    50%      { transform: scaleY(1);   opacity: 1; }
  }

  /* idle label in tray */
  .va-tray-label {
    flex: 1;
    font-size: 14px;
    color: var(--color-charcoal-muted, #888780);
    font-weight: 400;
    user-select: none;
    letter-spacing: 0.1px;
  }

  /* spinner in tray */
  .va-tray-spinner {
    flex: 1;
    display: flex; align-items: center; gap: 10px;
    font-size: 13px;
    color: var(--color-charcoal-muted, #888780);
  }
  .va-spin {
    width: 16px; height: 16px;
    border: 2px solid rgba(44,44,42,0.15);
    border-top-color: var(--color-sage-dark, #6A9E98);
    border-radius: 50%;
    animation: vaSpin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes vaSpin { to { transform: rotate(360deg); } }

  /* right side action buttons in tray */
  .va-tray-actions { display: flex; align-items: center; gap: 4px; }

  .va-tray-btn {
    width: 38px; height: 38px;
    border-radius: 10px;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  .va-tray-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* mic button */
  .va-mic-btn {
    background: var(--color-charcoal, #2C2C2A);
    color: var(--color-white, #FAFAF8);
    box-shadow: 0 2px 8px rgba(44,44,42,0.2);
  }
  .va-mic-btn:not(:disabled):hover {
    background: #3d3d3a;
    box-shadow: 0 4px 12px rgba(44,44,42,0.28);
    transform: scale(1.03);
  }
  .va-mic-btn.recording {
    background: var(--color-ember, #EA2E00);
    box-shadow: 0 2px 12px rgba(234,46,0,0.35);
    animation: vaMicPulse 1.5s ease-in-out infinite;
  }
  @keyframes vaMicPulse {
    0%,100% { box-shadow: 0 2px 12px rgba(234,46,0,0.35); }
    50%      { box-shadow: 0 2px 20px rgba(234,46,0,0.55); }
  }

  /* secondary icon btn in tray */
  .va-tray-icon-btn {
    background: transparent;
    color: var(--color-charcoal-muted, #888780);
  }
  .va-tray-icon-btn:hover { background: rgba(44,44,42,0.07); color: var(--color-charcoal, #2C2C2A); }

  /* ── HINT BAR under tray ────────────────────────────────────────────────── */
  .va-hint {
    text-align: center;
    font-size: 11px;
    color: var(--color-charcoal-muted, #888780);
    letter-spacing: 0.2px;
  }
  .va-hint span {
    font-family: monospace;
    background: rgba(44,44,42,0.06);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 10px;
  }
`;

/* ── SVG ICON HELPERS ─────────────────────────────────────────────────────── */
const Mic = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8"  y1="23" x2="16" y2="23"/>
    </svg>
);
const Stop = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="3"/>
    </svg>
);
const Refresh = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6"/>
        <path d="M1 20v-6h6"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
);
const DotsHoriz = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
    </svg>
);
const MicOff = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const VoiceHelper = () => {
    const { user } = useAuth();
    const {
        connected, transcription, ready, response, latestResponse,
        waitingForReview, reviewId, error, isRecording, isProcessing,
        sessionId, startRecording, stopRecording, manualReconnect,
        clearError, restartConversation, setMode, clearConversationState
    } = useVoiceWebSocket();

    const [mode, setLocalMode] = useState(
        user?.userType === 'DEMENTIA_PATIENT' ? 'dementia' : 'standard'
    );
    const [estimatedWait, setEstimatedWait]   = useState(0);
    const [messages, setMessages]             = useState([]);  // {id, role, text, audioUrl, reviewedBy}
    const messagesEndRef                      = useRef(null);
    const prevTranscription                   = useRef('');
    const prevResponse                        = useRef('');

    useEffect(() => { setMode(mode); }, [mode, setMode]);

    useEffect(() => {
        clearConversationState();
        setMessages([]);
        prevTranscription.current = '';
        prevResponse.current = '';
    }, [clearConversationState]);

    /* countdown timer for review wait */
    useEffect(() => {
        if (waitingForReview) {
            setEstimatedWait(300);
            const t = setInterval(() => setEstimatedWait(p => Math.max(0, p - 1)), 1000);
            return () => clearInterval(t);
        }
    }, [waitingForReview]);

    /* push new user transcript as a message bubble */
    useEffect(() => {
        if (transcription && transcription !== prevTranscription.current) {
            prevTranscription.current = transcription;
            setMessages(prev => [
                ...prev,
                { id: Date.now(), role: 'user', text: transcription }
            ]);
        }
    }, [transcription]);

    /* push new assistant response as a message bubble */
    const displayResponse = response || latestResponse;
    const responseText =
        displayResponse?.textResponse ||
        displayResponse?.userFriendlyError ||
        displayResponse?.errorMessage || '';

    useEffect(() => {
        if (responseText && responseText !== prevResponse.current) {
            prevResponse.current = responseText;
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    text: responseText,
                    audioUrl: displayResponse?.audioUrl,
                    reviewedBy: displayResponse?.reviewedBy,
                }
            ]);
        }
    }, [responseText]);

    /* auto-scroll to bottom */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isProcessing]);

    /* capability checks */
    useEffect(() => {
        const api = typeof window !== 'undefined' ? window.MediaRecorder : null;
        console.log('MediaRecorder supported:', !!api);
        console.log('webm opus:', api?.isTypeSupported?.('audio/webm;codecs=opus'));
        console.log('webm:', api?.isTypeSupported?.('audio/webm'));
        console.log('mp4:', api?.isTypeSupported?.('audio/mp4'));
    }, []);

    const hasMic = typeof window !== 'undefined' && !!window.MediaRecorder && !!navigator?.mediaDevices?.getUserMedia;
    const canStart = ready && !waitingForReview && !isProcessing && hasMic;
    const displaySessionId = sessionId ? sessionId.substring(0, 8) : '...';

    const formatTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const userName = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : 'ME';

    const hasContent = messages.length > 0;

    return (
        <>
            <style>{VA_STYLES}</style>
            <div className="va">

                {/* ── TOP NAV ─────────────────────────────────────────────── */}
                <nav className="va-nav">
                    <div className="va-nav-left">
                        <div className="va-nav-icon">
                            <Mic size={16} />
                        </div>
                        <span className="va-nav-title">Voice Assistant</span>
                    </div>

                    <div className="va-nav-right">
                        {/* Mode toggle — only for non-dementia users */}
                        {user?.userType !== 'DEMENTIA_PATIENT' && (
                            <div className="va-mode-toggle">
                                <button
                                    className={`va-mode-btn ${mode === 'standard' ? 'active' : ''}`}
                                    onClick={() => setLocalMode('standard')}
                                >Standard</button>
                                <button
                                    className={`va-mode-btn ${mode === 'dementia' ? 'active-simple' : ''}`}
                                    onClick={() => setLocalMode('dementia')}
                                >Simple</button>
                            </div>
                        )}

                        <div className="va-status-dot-wrap">
                            <span className={`va-dot ${connected ? 'online' : 'offline'}`} />
                            {connected ? 'Connected' : 'Offline'}
                        </div>

                        <button className="va-icon-btn" onClick={manualReconnect} title="Reconnect">
                            <Refresh size={15} />
                        </button>
                        <button className="va-icon-btn" title="More options">
                            <DotsHoriz size={15} />
                        </button>
                    </div>
                </nav>

                {/* ── MESSAGES ────────────────────────────────────────────── */}
                <div className="va-messages">
                    <div className="va-inner">

                        {/* Inline alerts */}
                        {error && (
                            <div className="va-banner error">
                                <span className="va-banner-icon">⚠️</span>
                                <div className="va-banner-content">
                                    <div className="va-banner-title">Something went wrong</div>
                                    <div className="va-banner-body">{error}</div>
                                    <div className="va-banner-actions">
                                        <button className="va-banner-btn" onClick={clearError}>Dismiss</button>
                                        <button className="va-banner-btn" onClick={manualReconnect}>Reconnect</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {!hasMic && (
                            <div className="va-banner warning">
                                <span className="va-banner-icon"><MicOff size={14} /></span>
                                <div className="va-banner-content">
                                    <div className="va-banner-body">
                                        Microphone access unavailable. Use Chrome or Edge with mic permissions enabled.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {!hasContent && (
                            <div className="va-empty">
                                <div className="va-empty-icon">
                                    <Mic size={26} />
                                </div>
                                <div className="va-empty-title">How can I help you?</div>
                                <div className="va-empty-sub">
                                    Press the mic button below and start speaking. I'll listen and respond.
                                </div>
                                {!ready && (
                                    <div className="va-empty-hint">
                                        <div className="va-spin" />
                                        Connecting to voice service…
                                    </div>
                                )}
                                {ready && hasMic && (
                                    <div className="va-empty-hint">
                                        🎙️ Tap the mic to begin
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Message bubbles */}
                        {messages.map(msg => (
                            <div key={msg.id} className={`va-row ${msg.role}`}>
                                <div className={`va-avatar ${msg.role === 'user' ? 'user-av' : 'ai-av'}`}>
                                    {msg.role === 'user'
                                        ? userName
                                        : <Mic size={14} />
                                    }
                                </div>
                                <div className="va-bubble-wrap">
                                    <div className="va-bubble">{msg.text}</div>
                                    {msg.role === 'assistant' && (
                                        <div className="va-bubble-meta">
                                            Voice Assistant
                                            {msg.reviewedBy && (
                                                <span className="va-reviewed-badge">✓ Human reviewed</span>
                                            )}
                                        </div>
                                    )}
                                    {msg.audioUrl && (
                                        <div className="va-audio">
                                            <audio controls>
                                                <source src={msg.audioUrl} type="audio/mpeg" />
                                            </audio>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Thinking indicator */}
                        {isProcessing && !waitingForReview && (
                            <div className="va-row assistant">
                                <div className="va-avatar ai-av"><Mic size={14} /></div>
                                <div className="va-bubble-wrap">
                                    <div className="va-thinking">
                                        <div className="va-thinking-dot" />
                                        <div className="va-thinking-dot" />
                                        <div className="va-thinking-dot" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* ── BOTTOM BAR ──────────────────────────────────────────── */}
                <div className="va-bar">
                    <div className="va-bar-inner">

                        {/* Review waiting row */}
                        {waitingForReview && (
                            <div className="va-review-row">
                                <div className="va-review-left">
                                    <div className="va-spin" />
                                    <span>Waiting for a human reviewer</span>
                                    <span className="va-review-timer">{formatTime(estimatedWait)}</span>
                                    <span style={{ fontSize: 11, opacity: 0.6 }}>ID: {reviewId || 'N/A'}</span>
                                </div>
                                <button className="va-review-cancel" onClick={restartConversation}>
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Input tray */}
                        <div className={`va-tray ${isRecording ? 'recording' : ''}`}>

                            {/* Left: status text or waveform */}
                            {isRecording ? (
                                <div className="va-tray-wave">
                                    {[...Array(10)].map((_, i) => (
                                        <div key={i} className="va-tray-bar" />
                                    ))}
                                </div>
                            ) : isProcessing ? (
                                <div className="va-tray-spinner">
                                    <div className="va-spin" />
                                    Processing…
                                </div>
                            ) : (
                                <span className="va-tray-label">
                                    {!hasMic
                                        ? 'Microphone unavailable'
                                        : !ready
                                            ? 'Connecting…'
                                            : waitingForReview
                                                ? 'Waiting for reviewer…'
                                                : 'Tap the mic to speak'
                                    }
                                </span>
                            )}

                            {/* Right actions */}
                            <div className="va-tray-actions">
                                {/* Mic / stop button */}
                                <button
                                    className={`va-tray-btn va-mic-btn ${isRecording ? 'recording' : ''}`}
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={!isRecording && !canStart}
                                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                                >
                                    {isRecording ? <Stop size={16} /> : <Mic size={17} />}
                                </button>
                            </div>
                        </div>

                        {/* Hint */}
                        <div className="va-hint">
                            Session <span>#{displaySessionId}</span>
                            {user?.userType === 'DEMENTIA_PATIENT' && (
                                <> · <span>Simple mode</span></>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </>
    );
};

export default VoiceHelper;
