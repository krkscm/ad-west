import { useEffect } from 'react'

interface PortalCard {
  icon: string
  title: string
  description: string
  href: string
  cta: string
  badge?: string
}

const PORTAL_CARDS: PortalCard[] = [
  {
    icon: '🛠️',
    title: 'Helpdesk',
    description: 'Need assistance? Submit a support ticket and our team will get back to you.',
    href: '/helpdesk',
    cta: 'Submit a Ticket',
  },
  {
    icon: '💼',
    title: 'Careers',
    description: "Browse open positions and apply directly. We're always looking for dedicated people.",
    href: '/jobs',
    cta: 'View Openings',
  },
  {
    icon: '🤝',
    title: 'Join Us',
    description: "Interested in becoming a member? Register your interest and we'll connect with you.",
    href: '/join-us',
    cta: 'Register Interest',
    badge: 'New Members',
  },
]

export function PublicPortalPage() {
  useEffect(() => { document.title = 'IFCA Abu Dhabi — Public Portal' }, [])

  const navigate = (href: string) => { window.location.pathname = href }

  return (
    <div
      className="public-theme"
      style={{
        minHeight: '100vh',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Background image with dark overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: 'url(/Indian-culture.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          // Subtle scale so image feels alive without layout shift
          transform: 'scale(1.03)',
          transformOrigin: 'center',
        }}
      />
      {/* Gradient overlay — darkens image enough for text legibility */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: 'var(--public-shell-overlay)',
        }}
      />

      {/* All content above the overlay */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header */}
        <header
          style={{
            background: 'var(--public-header-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--public-header-border)',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/favicon.png"
              alt="IFCA Abu Dhabi"
              style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }}
            />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--public-text-primary)', lineHeight: 1.2 }}>
                IFCA Abu Dhabi
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--public-text-secondary)' }}>
                Public Services Portal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { window.location.href = '/login' }}
            style={{
              fontSize: '0.82rem',
              padding: '7px 18px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 248, 235, 0.18)',
              background: 'var(--public-button-secondary-bg)',
              color: 'var(--public-text-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              backdropFilter: 'blur(8px)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--public-button-secondary-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--public-button-secondary-bg)' }}
          >
            🔐 Login
          </button>
        </header>

        {/* Hero */}
        <div
          style={{
            padding: 'clamp(48px, 8vh, 80px) 24px 36px',
            textAlign: 'center',
            maxWidth: '680px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              margin: '0 0 10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--public-hero-kicker)',
            }}
          >
            ✦ Welcome
          </p>
          <h2
            style={{
              fontSize: 'clamp(1.6rem, 5vw, 2.6rem)',
              fontWeight: 800,
              margin: '0 0 14px',
              color: 'var(--public-text-primary)',
              lineHeight: 1.18,
              textShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
          >
            IFCA Abu Dhabi
          </h2>
          <p
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1.05rem)',
              color: 'var(--public-text-secondary)',
              margin: 0,
              lineHeight: 1.65,
              maxWidth: '520px',
              marginInline: 'auto',
            }}
          >
            Your gateway to our services — submit support requests, explore career
            opportunities, or connect with our community.
          </p>
        </div>

        {/* Service Cards */}
        <main
          style={{
            flex: 1,
            padding: '0 24px 56px',
            maxWidth: '960px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
            }}
          >
            {PORTAL_CARDS.map((card) => (
              <button
                key={card.href}
                className="public-page-card"
                type="button"
                onClick={() => navigate(card.href)}
                style={{
                  padding: '28px 24px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '16px',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.35)'
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.52)'
                  e.currentTarget.style.background = 'var(--public-panel-bg-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = ''
                  e.currentTarget.style.borderColor = 'var(--public-panel-border)'
                  e.currentTarget.style.background = 'var(--public-panel-bg)'
                }}
              >
                {/* Icon + badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '1.8rem',
                      width: '52px',
                      height: '52px',
                      borderRadius: '12px',
                      background: 'var(--public-accent-soft)',
                      border: '1px solid rgba(251, 191, 36, 0.28)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </span>
                  {card.badge && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '999px',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#86efac',
                        background: 'var(--public-support-soft)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {card.badge}
                    </span>
                  )}
                </div>

                {/* Text */}
                <div>
                  <h3
                    style={{
                      margin: '0 0 6px',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: 'var(--public-text-primary)',
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      color: 'var(--public-text-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    {card.description}
                  </p>
                </div>

                {/* CTA row */}
                <div
                  style={{
                    marginTop: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--public-accent)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                >
                  <span>{card.cta}</span>
                  <span>→</span>
                </div>
              </button>
            ))}
          </div>

          {/* Info strip */}
          <div
            className="public-page-card"
            style={{
              marginTop: '28px',
              padding: '14px 18px',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>ℹ️</span>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--public-text-muted)', lineHeight: 1.6 }}>
              Already a member? Your membership administrator will provide login credentials for the full workspace.
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid var(--public-header-border)',
            background: 'var(--public-header-bg)',
            padding: '14px 24px',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--public-text-muted)',
          }}
        >
          © {new Date().getFullYear()} IFCA Abu Dhabi · Powered by VGK Technologies
        </footer>

      </div>
    </div>
  )
}
