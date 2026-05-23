import React from 'react';

interface LandingPageProps {
  onNavigate: (page: 'admin' | 'member') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div 
      className="flex-center" 
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(circle at 10% 20%, rgb(4, 8, 20) 0%, rgb(18, 14, 38) 90.2%)',
        color: '#f8fafc',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px'
      }}
    >
      {/* Decorative Blur Blobs */}
      <div 
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          top: '-10%',
          left: '10%',
          zIndex: 1
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
          bottom: '-10%',
          right: '5%',
          zIndex: 1
        }}
      />

      <div 
        className="animate-slide-up"
        style={{
          maxWidth: '1020px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Logo and Header */}
        <div style={{ marginBottom: '48px' }}>
          <div 
            className="flex-center"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #06b6d4 100%)',
              margin: '0 auto 20px',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
              fontSize: '1.8rem',
              fontWeight: 800
            }}
          >
            AD
          </div>
          <h1 
            style={{ 
              fontSize: '3.2rem', 
              fontWeight: 800, 
              letterSpacing: '-0.03em',
              background: 'linear-gradient(to right, #ffffff, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '12px'
            }}
          >
            Zone Community Management Platform
          </h1>
          <p 
            style={{ 
              fontSize: '1.15rem', 
              color: '#94a3b8', 
              maxWidth: '600px', 
              margin: '0 auto',
              lineHeight: 1.6,
              fontWeight: 400
            }}
          >
            A unified administrative and member directory governance system built to consolidate and verify community contact networks.
          </p>
        </div>

        {/* Portal Entry Selection Grid */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '32px',
            marginTop: '32px'
          }}
        >
          {/* Admin Portal Card */}
          <div 
            className="glass-panel" 
            style={{ 
              padding: '40px', 
              textAlign: 'left',
              transition: 'var(--transition-all)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={() => onNavigate('admin')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.boxShadow = 'var(--shadow-glass)';
            }}
          >
            <div 
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                marginBottom: '24px',
                color: 'var(--primary)'
              }}
            >
              🛡️
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '10px', fontWeight: 700 }}>Admin Portal</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '28px' }}>
              Access administrative dashboards, manage user permission scopes, review profile approvals, and inspect system audit trails. Securely verified by TOTP MFA.
            </p>
            <span 
              style={{ 
                color: 'var(--primary)', 
                fontWeight: 600, 
                fontSize: '0.925rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Access Admin Workspace <span>→</span>
            </span>
          </div>

          {/* Member Portal Card */}
          <div 
            className="glass-panel" 
            style={{ 
              padding: '40px', 
              textAlign: 'left',
              transition: 'var(--transition-all)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={() => onNavigate('member')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(6, 182, 212, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.boxShadow = 'var(--shadow-glass)';
            }}
          >
            <div 
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                marginBottom: '24px',
                color: '#06b6d4'
              }}
            >
              👤
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '10px', fontWeight: 700 }}>Member Self-Service</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '28px' }}>
              Log in with your email or phone to view your contact profile, request record corrections, check your program attendance, and manage helpdesk tickets.
            </p>
            <span 
              style={{ 
                color: '#06b6d4', 
                fontWeight: 600, 
                fontSize: '0.925rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Access Member Portal <span>→</span>
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: '72px', fontSize: '0.75rem', color: '#64748b' }}>
          AD West Zone Directory Services &bull; Built with React &bull; Secure Architecture Base
        </div>
      </div>
    </div>
  );
};
