import { useWallet } from "@solana/wallet-adapter-react"
import { getUserData } from "../api/getCurrentUser"


const UserProfileModal = ({ isOpen, onClose, onSecureData }) => {
  const { publicKey } = useWallet()
  const { data: profile, isLoading, isError } = getUserData()

  if (!isOpen) return null

  // Initials for avatar
  const initials = profile?.name
    ? profile.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "??"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(44, 44, 42, 0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md overflow-hidden"
        style={{
          background: "var(--color-cream)",
          borderRadius: "var(--radius-2xl)",
          border: "1.5px solid rgba(157, 189, 184, 0.3)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="relative px-7 py-6"
          style={{ background: "var(--color-sage)" }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="flex items-center justify-center flex-shrink-0 text-xl font-bold"
              style={{
                width: 56, height: 56,
                borderRadius: "var(--radius-full)",
                background: "var(--color-cream)",
                color: "var(--color-sage-dark)",
                fontFamily: "var(--font-display)",
              }}
            >
              {initials}
            </div>

            <div>
              <p style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                color: "var(--color-white)",
                margin: 0,
              }}>
                {isLoading ? "Loading..." : profile?.name ?? "Unknown"}
              </p>
              <span className="label-tag" style={{
                background: "rgba(250,250,248,0.2)",
                color: "var(--color-white)",
                marginTop: 4,
              }}>
                ✦ Verified on-chain
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(250,250,248,0.15)",
              border: "none",
              borderRadius: "var(--radius-full)",
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              color: "var(--color-white)",
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-7 py-6">

          {isLoading && (
            <p style={{ color: "var(--color-charcoal-muted)", textAlign: "center", padding: "2rem 0" }}>
              Fetching from blockchain...
            </p>
          )}

          {isError && (
            <p style={{ color: "var(--color-ember)", textAlign: "center", padding: "2rem 0" }}>
              Failed to load profile.
            </p>
          )}

          {!isLoading && !isError && profile && (
            <>
              <p className="section-label" style={{ color: "var(--color-charcoal-muted)" }}>
                Profile details
              </p>

              {/* Fields */}
              {[
                { icon: "👤", label: "Name",           value: profile.name },
                { icon: "✉️",  label: "Email",          value: profile.email },
                { icon: "📞", label: "Your phone",     value: profile.yourphone },
                { icon: "🤝", label: "Caregiver phone",value: profile.caregiverphone },
              ].map((field, i, arr) => (
                <div
                  key={field.label}
                  className="flex items-center gap-3"
                  style={{
                    padding: "12px 16px",
                    background: "var(--color-white)",
                    border: "1.5px solid rgba(157, 189, 184, 0.2)",
                    borderTop: i === 0 ? undefined : "none",
                    borderRadius: i === 0
                      ? "var(--radius-md) var(--radius-md) 4px 4px"
                      : i === arr.length - 1
                      ? "4px 4px var(--radius-md) var(--radius-md)"
                      : "4px",
                  }}
                >
                  <div style={{
                    width: 34, height: 34,
                    borderRadius: "var(--radius-full)",
                    background: i === 3
                      ? "var(--color-ember-subtle)"
                      : "var(--color-sage-light)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {field.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--color-charcoal-muted)", margin: "0 0 1px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                      {field.label}
                    </p>
                    <p style={{ fontSize: "var(--text-base)", color: "var(--color-charcoal)", margin: 0, fontWeight: 500 }}>
                      {field.value || "—"}
                    </p>
                  </div>
                </div>
              ))}

              {/* Wallet address */}
              <div style={{
                marginTop: 16, padding: "10px 14px",
                background: "var(--color-sage-subtle)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(157,189,184,0.3)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 13, color: "var(--color-sage-dark)" }}>◎</span>
                <p style={{ fontSize: 11, color: "var(--color-charcoal-mid)", margin: 0, fontFamily: "monospace", wordBreak: "break-all" }}>
                  {publicKey
                    ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)} · devnet`
                    : "Not connected"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                  Edit profile
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          )}

          {!isLoading && (!profile || isError) && (
            <div className="text-center py-6">
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-charcoal)', marginBottom: 8 }}>Data Not Secured</h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-charcoal-mid)', marginBottom: 24, lineHeight: 1.5 }}>
                Your identity and emergency contacts are not yet stored on the blockchain. Secure them now for permanent, immutable access.
              </p>
              <div className="flex gap-3">
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={onSecureData}
                >
                  Secure Data on Chain
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfileModal