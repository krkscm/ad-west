import { ReactNode } from 'react'

interface Props {
  subtitle: string
  children: ReactNode
}

/**
 * Shared shell for all public pages.
 * Provides the Indian-culture.jpg background + frosted-glass header consistent with the portal page.
 */
export function PublicPageShell({ subtitle, children }: Props) {
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
      {/* Background image */}
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
          transform: 'scale(1.03)',
          transformOrigin: 'center',
        }}
      />
      {/* Dark overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: 'var(--public-shell-overlay)',
        }}
      />

      {/* Ambient orbs — match portal landing */}
      <div className="wow-bg-container" style={{ zIndex: 1 }}>
        <div className="wow-orb wow-orb-primary" style={{ top: '10%', left: '-5%' }} />
        <div className="wow-orb wow-orb-accent" style={{ bottom: '10%', right: '-5%' }} />
        <div className="wow-orb wow-orb-gold" style={{ top: '50%', left: '35%' }} />
      </div>

      {/* Foreground content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header */}
        <header
          className="public-page-header"
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
              alt="AD West - IFCA"
              style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }}
            />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--public-text-primary)', lineHeight: 1.2 }}>
                AD West - IFCA
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--public-text-secondary)' }}>{subtitle}</p>
            </div>
          </div>

          {/* Back to portal */}
          <button
            type="button"
            onClick={() => { window.location.pathname = '/' }}
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 248, 235, 0.18)',
              background: 'var(--public-button-secondary-bg)',
              color: 'var(--public-text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
              backdropFilter: 'blur(8px)',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--public-button-secondary-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--public-button-secondary-bg)' }}
          >
            ← Portal
          </button>
        </header>

        {/* Page-specific content */}
        <main className="public-page-main" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '48px 16px' }}>
          {children}
        </main>

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid var(--public-header-border)',
            background: 'var(--public-header-bg)',
            padding: '12px 24px',
            textAlign: 'center',
            fontSize: '0.73rem',
            color: 'var(--public-text-muted)',
          }}
        >
          © {new Date().getFullYear()} AD West - IFCA · Powered by VGK Technologies
        </footer>
      </div>
    </div>
  )
}
