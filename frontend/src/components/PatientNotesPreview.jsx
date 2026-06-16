// components/PatientNotesPreview.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { noteApi } from '../api/noteApi';

// Elegant Note Card Component
const NoteCard = ({ note, index, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const formattedDate = useMemo(() => {
    const date = new Date(note.updatedAt || note.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }, [note.updatedAt, note.createdAt]);

    const getNoteStyles = () => {
        const baseStyles = {
            PERSONAL: {
                gradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: '#93C5FD',
                icon: '📝',
                iconBg: '#DBEAFE',
                label: 'Personal',
            },
            DOCUMENT: {
                gradient: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
                border: '#D1D5DB',
                icon: '📄',
                iconBg: '#E5E7EB',
                label: 'Document',
            },
            SUMMARY: {
                gradient: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
                border: '#D8B4FE',
                icon: '🤖',
                iconBg: '#F3E8FF',
                label: 'AI Summary',
            },
            OTHER: {
                gradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                border: '#FDBA74',
                icon: '📌',
                iconBg: '#FFEDD5',
                label: 'Other',
            },
            GENERAL: {
                gradient: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
                border: '#CBD5E1',
                icon: '📝',
                iconBg: '#F1F5F9',
                label: 'Note',
            },
        };
        return baseStyles[note.type] || baseStyles.GENERAL;
    };

  const styles = getNoteStyles();
  const isLongContent = note.content?.length > 100;

  return (
    <div
      onClick={() => onNavigate('/notes')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: styles.gradient,
        borderRadius: 20,
        padding: '20px',
        cursor: 'pointer',
        border: `2px solid ${isHovered ? styles.border : 'transparent'}`,
        boxShadow: isHovered 
          ? `0 20px 40px -12px ${styles.border}40, 0 8px 16px -8px rgba(0,0,0,0.1)` 
          : '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
        transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: `fadeSlideUp 0.5s ease forwards ${index * 0.1}s`,
        opacity: 0,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 140,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Decorative corner accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 60,
        height: 60,
        background: `linear-gradient(135deg, transparent 50%, ${styles.border}20 50%)`,
        borderRadius: '0 0 0 20px',
      }} />

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12, 
        marginBottom: 12,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: styles.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}>
          {styles.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 700,
            color: styles.border,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            {styles.label}
          </span>
          <h4 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--color-charcoal)',
            margin: '2px 0 0 0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {note.title || 'Untitled'}
          </h4>
        </div>
        {note.pinned && (
          <span style={{
            fontSize: 18,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            animation: 'pinWiggle 2s ease-in-out infinite',
          }}>
            📌
          </span>
        )}
      </div>

      {/* Content */}
      <p style={{
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        color: 'var(--color-charcoal-mid)',
        lineHeight: 1.6,
        margin: 0,
        flex: 1,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {note.content || 'No content'}
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 12,
        borderTop: `1px solid ${styles.border}30`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'var(--color-charcoal-muted)',
          fontWeight: 500,
        }}>
          <span>🕐</span>
          {formattedDate}
        </div>
        
        {isLongContent && (
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            color: styles.border,
            background: `${styles.border}15`,
            padding: '4px 10px',
            borderRadius: 20,
          }}>
            Read more →
          </span>
        )}
      </div>
    </div>
  );
};

// Quick Action Button
const QuickAction = ({ icon, label, onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 20px',
      background: '#fff',
      border: `2px solid ${color}30`,
      borderRadius: 16,
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--color-charcoal)',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = color;
      e.currentTarget.style.color = '#fff';
      e.currentTarget.style.borderColor = color;
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 8px 20px ${color}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = '#fff';
      e.currentTarget.style.color = 'var(--color-charcoal)';
      e.currentTarget.style.borderColor = `${color}30`;
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
    }}
  >
    <span style={{ fontSize: 18 }}>{icon}</span>
    {label}
  </button>
);

// Main Component
export default function PatientNotesPreview() {
  console.log("🚀 COMPONENT RENDER START");
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await noteApi.getAllNotes();
      console.log("response:",response)
      if (response.success) {
        const sortedNotes = (response.data || [])
          .filter(n => n.showOnDashboard)
          .sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
          });
        setNotes(sortedNotes);
      }
    } catch (err) {
      setError('Unable to load your notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const filteredNotes = notes;

  if (loading) {
    return (
      <div style={{ marginTop: 'var(--space-8)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: 180,
              background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              backgroundSize: '200% 100%',
              borderRadius: 20,
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 'var(--space-10)', marginBottom: 'var(--space-10)' }}>
      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
        borderRadius: 24,
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-6)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-charcoal)',
              margin: '0 0 4px 0',
            }}>
              📝 Your Notes & Reminders
            </h3>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--color-charcoal-mid)',
              margin: 0,
            }}>
              {notes.length > 0 
                ? `Showing ${notes.length} pinned note${notes.length !== 1 ? 's' : ''}`
                : 'Keep track of important things'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <QuickAction 
              icon="➕" 
              label="New Note" 
              onClick={() => navigate('/notes')}
              color="#9DBDB8"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 16,
          padding: 'var(--space-4)',
          textAlign: 'center',
          marginBottom: 'var(--space-4)',
        }}>
          <p style={{ color: '#DC2626', margin: 0, fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
          borderRadius: 24,
          padding: 'var(--space-12)',
          textAlign: 'center',
          border: '2px dashed #CBD5E1',
        }}>
          <div style={{ fontSize: 64, marginBottom: 'var(--space-4)', opacity: 0.8 }}>
            📝
          </div>
          <h4 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--color-charcoal)',
            marginBottom: 'var(--space-2)',
          }}>
            No notes yet
          </h4>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--color-charcoal-mid)',
            marginBottom: 'var(--space-5)',
          }}>
            Create your first note to remember important things
          </p>
          <button
            onClick={() => navigate('/notes')}
            style={{
              padding: '14px 28px',
              background: '#9DBDB8',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px #9DBDB840',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px #9DBDB860';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px #9DBDB840';
            }}
          >
            Create Note ✨
          </button>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-4)',
          }}>
            {filteredNotes.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                index={index}
                onNavigate={navigate}
              />
            ))}
          </div>

          {/* View All Link */}
          <div style={{
            textAlign: 'center',
            marginTop: 'var(--space-6)',
          }}>
            <button
              onClick={() => navigate('/notes')}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '2px solid var(--color-sage)',
                borderRadius: 20,
                color: 'var(--color-sage-dark)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-sage)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-sage-dark)';
              }}
            >
              View all notes →
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pinWiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
}