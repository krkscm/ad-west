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
          background: 'linear-gradient(160deg, rgba(2,6,23,0.82) 0%, rgba(15,23,42,0.75) 50%, rgba(2,6,23,0.88) 100%)',
        }}
      />

      {/* Foreground content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header */}
        <header
          style={{
            background: 'rgba(2, 6, 23, 0.55)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
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
              <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                IFCA Abu Dhabi
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>{subtitle}</p>
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
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              fontWeight: 500,
              backdropFilter: 'blur(8px)',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          >
            ← Portal
          </button>
        </header>

        {/* Page-specific content */}
        <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '48px 16px' }}>
          {children}
        </main>

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(2, 6, 23, 0.55)',
            padding: '12px 24px',
            textAlign: 'center',
            fontSize: '0.73rem',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          © {new Date().getFullYear()} IFCA Abu Dhabi · Powered by VGK Technologies
        </footer>
      </div>
    </div>
  )
}
