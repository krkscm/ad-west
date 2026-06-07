import React, { useEffect } from 'react'

interface AuthPageLayoutProps {
  children: React.ReactNode
  title?: string
  backgroundImage?: string
}

export const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({ children, title, backgroundImage = '/Indian-culture.jpg' }) => {
  useEffect(() => {
    if (title) document.title = `AD West - IFCA — ${title}`
  }, [title])

  return (
    <div
      className="public-theme"
      style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      {/* Background image */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          transform: 'scale(1.03)', transformOrigin: 'center',
        }}
      />
      {/* Overlay */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'var(--public-shell-overlay)' }} />

      {/* Absolute Glowing Background Orbs */}
      <div className="wow-bg-container" style={{ zIndex: 1 }}>
        <div className="wow-orb wow-orb-primary" style={{ top: '10%', left: '-5%' }} />
        <div className="wow-orb wow-orb-accent" style={{ bottom: '10%', right: '-5%' }} />
        <div className="wow-orb wow-orb-gold" style={{ top: '50%', left: '35%' }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {/* Header */}
        <header style={{
          background: 'var(--public-header-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--public-header-border)',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <a href="/portal" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/favicon.png" alt="AD West - IFCA" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--public-text-primary)', lineHeight: 1.2 }}>
                AD West - IFCA
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--public-text-secondary)' }}>
                Admin Portal
              </p>
            </div>
          </a>
          <a
            href="/portal"
            style={{
              fontSize: '0.82rem', padding: '7px 18px', borderRadius: '8px',
              border: '1px solid rgba(255,248,235,0.18)',
              background: 'var(--public-button-secondary-bg)',
              color: 'var(--public-text-primary)',
              fontWeight: 600, textDecoration: 'none',
              backdropFilter: 'blur(8px)',
            }}
          >
            ← Public Portal
          </a>
        </header>

        {/* Main */}
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid var(--public-header-border)',
          background: 'var(--public-header-bg)',
          padding: '14px 24px',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--public-text-muted)',
        }}>
          © {new Date().getFullYear()} AD West - IFCA · Powered by VGK Technologies
        </footer>

      </div>
    </div>
  )
}
