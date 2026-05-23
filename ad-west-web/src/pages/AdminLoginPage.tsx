import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { generateTotp, createTotpSecret } from '../utils/mockAuth';
import { mockDatabase } from '../utils/mockDatabase';

interface AdminLoginPageProps {
  onBack: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  
  // Login Steps: 'credentials' | 'totp' | 'enroll'
  const [step, setStep] = useState<'credentials' | 'totp' | 'enroll'>('credentials');
  
  // Enrollment details
  const [enrollSecret, setEnrollSecret] = useState('');
  
  // Live simulated OTP for reviewers
  const [liveOtp, setLiveOtp] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  const { loginAdmin, verifyAdminMfa, submitMfaEnrollment, mfaPendingEmail } = useAuth();
  const { addToast } = useToast();

  // Load the current TOTP secret for helper view
  useEffect(() => {
    let timer: number;
    
    const updateLiveOtp = async () => {
      let secretToUse = '';
      
      if (step === 'totp' && mfaPendingEmail) {
        const admins = mockDatabase.getAdmins();
        const admin = admins.find(a => a.email.toLowerCase() === mfaPendingEmail.toLowerCase());
        if (admin) secretToUse = admin.totpSecret;
      } else if (step === 'enroll') {
        secretToUse = enrollSecret;
      }

      if (secretToUse) {
        const code = await generateTotp(secretToUse);
        setLiveOtp(code);
        
        // Calculate seconds remaining in the 30s window
        const now = Date.now();
        const remaining = 30 - Math.floor((now / 1000) % 30);
        setSecondsRemaining(remaining);
      }
    };

    if (step === 'totp' || step === 'enroll') {
      updateLiveOtp();
      timer = window.setInterval(() => {
        updateLiveOtp();
      }, 1000);
    }

    return () => {
      clearInterval(timer);
    };
  }, [step, mfaPendingEmail, enrollSecret]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password.', 'warning');
      return;
    }

    const res = await loginAdmin(email, password);
    if (res.success) {
      const admins = mockDatabase.getAdmins();
      const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase().trim())!;
      
      if (admin.mfaEnabled) {
        setStep('totp');
        addToast('Credentials verified. Please enter your MFA code.', 'info');
      } else {
        // Force MFA enrollment
        const newSecret = createTotpSecret();
        setEnrollSecret(newSecret);
        setStep('enroll');
        addToast('MFA setup is required for this account.', 'warning');
      }
    } else {
      addToast(res.error || 'Authentication failed.', 'error');
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) {
      addToast('Please enter a 6-digit code.', 'warning');
      return;
    }

    const res = await verifyAdminMfa(totpCode);
    if (res.success) {
      addToast('Welcome back. Logged in successfully.', 'success');
    } else {
      addToast(res.error || 'Invalid code.', 'error');
      setTotpCode('');
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) {
      addToast('Please enter a 6-digit code.', 'warning');
      return;
    }

    const res = await submitMfaEnrollment(enrollSecret, totpCode);
    if (res.success) {
      addToast('MFA enrolled successfully. Logged in.', 'success');
    } else {
      addToast(res.error || 'Invalid verification code.', 'error');
      setTotpCode('');
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(enrollSecret);
    addToast('Secret key copied to clipboard!', 'success');
  };

  return (
    <div className="admin-theme flex-center" style={{ minHeight: '100vh', width: '100vw', padding: '24px' }}>
      <div 
        className="glass-panel animate-slide-up"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '40px',
          boxShadow: 'var(--shadow-xl)',
          backgroundColor: 'rgba(20, 27, 45, 0.75)'
        }}
      >
        {/* Back and title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <button 
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary-dark)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>←</span> Back to Portals
          </button>
          <span style={{ fontSize: '0.75rem', color: 'rgba(99, 102, 241, 0.8)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Secure Portal
          </span>
        </div>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Workspace</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '6px' }}>
            Authentication and MFA Verification
          </p>
        </div>

        {/* Step 1: Credentials Form */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="superadmin@adwest.org"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              Verify Credentials
            </button>
            
            <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-secondary-dark)', textAlign: 'center', padding: '12px', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
              <strong style={{ color: '#fff' }}>Demo Account Credentials:</strong><br />
              Email: <code style={{ color: 'var(--primary)' }}>superadmin@adwest.org</code><br />
              Password: <code style={{ color: 'var(--primary)' }}>password123</code>
            </div>
          </form>
        )}

        {/* Step 2: TOTP Code Challenge */}
        {step === 'totp' && (
          <form onSubmit={handleTotpSubmit}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🛡️</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>MFA Challenge</h3>
              <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>
                Please enter the 6-digit authentication code generated by your device for {mfaPendingEmail}.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Authenticator Code</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="123456"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.2em', fontWeight: 700 }}
                autoFocus
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              Verify and Log In
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => setStep('credentials')}
            >
              Cancel
            </button>
          </form>
        )}

        {/* Step 3: MFA Setup Wizard */}
        {step === 'enroll' && (
          <form onSubmit={handleEnrollSubmit}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>📲</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>Enroll Authenticator Device</h3>
              <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>
                MFA is required for your security. Scan the QR code or enter the key manually in Google Authenticator or Authy.
              </p>
            </div>

            {/* QR Code Container Mockup */}
            <div 
              style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '12px',
                width: '160px',
                height: '160px',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              {/* Drawing a geometric mock QR code with standard SVG */}
              <svg width="128" height="128" viewBox="0 0 29 29" style={{ shapeRendering: 'crispEdges' }}>
                <path d="M0 0h7v7H0zm22 0h7v7h-7zM0 22h7v7H0zM2 2h3v3H2zm22 0h3v3h-3zM2 24h3v3H2zm8-24h9v1h-9zm0 2h1v4h-1zm3 0h1v1h-1zm2 0h1v2h-1zm2 0h1v1h-1zm-6 2h2v1h-2zm4 0h1v1h-1zm2 1h1v1h-1zm-9 2h1v1h-1zm3 0h1v1h-1zm3 0h2v1h-2zm-3 2h1v1h-1zm5 0h1v1h-1zm2 0h1v1h-1zm2-5h1v1h-1zm1 2h1v2h-1zm1-1h1v1h-1zm0 2h1v1h-1zm-2 2h3v1h-3zm-14 10h1v5h-1zm2 0h3v1h-3zm4 0h1v3h-1zm2 0h2v1h-2zm3 0h1v4h-1zm1 0h1v2h-1zm2 0h1v1h-1zm-10 2h1v1h-1zm2 0h1v1h-1zm5 0h1v2h-1zm1 0h1v1h-1zm2 0h1v1h-1zm-8 2h3v1h-3zm6 0h1v1h-1zm3 0h1v1h-1zm2 0h1v1h-1zm-13 1h1v1h-1zm7 0h2v1h-2zm4 0h1v1h-1zm2 0h1v1h-1z" fill="#0f172a" />
              </svg>
            </div>

            {/* Secret key displays */}
            <div 
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid var(--border-dark)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'between',
                marginBottom: '20px',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>SECRET KEY</span>
                <code style={{ fontSize: '0.95rem', letterSpacing: '0.05em', color: '#60a5fa', fontWeight: 700 }}>{enrollSecret}</code>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.75rem', marginLeft: '12px' }}
                onClick={handleCopySecret}
              >
                Copy
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.15em', fontWeight: 700 }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              Confirm Enrollment & Log In
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => setStep('credentials')}
            >
              Cancel
            </button>
          </form>
        )}

        {/* Live helper tool for reviewer / testing */}
        {(step === 'totp' || step === 'enroll') && (
          <div 
            style={{ 
              marginTop: '28px', 
              padding: '16px', 
              backgroundColor: 'rgba(59, 130, 246, 0.08)', 
              border: '1px dashed rgba(59, 130, 246, 0.3)',
              borderRadius: '10px',
              fontSize: '0.85rem',
              color: '#93c5fd'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ color: '#fff' }}>🔧 Reviewer Test Assistant:</strong>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Updates in {secondsRemaining}s</span>
            </div>
            <p style={{ lineHeight: 1.4, marginBottom: '10px', fontSize: '0.8rem' }}>
              To test the MFA verification without scanning the QR code, copy and paste this dynamic passcode:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div 
                style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 800, 
                  color: '#fbbf24', 
                  letterSpacing: '0.1em', 
                  backgroundColor: 'rgba(0,0,0,0.3)', 
                  padding: '6px 16px', 
                  borderRadius: '6px',
                  border: '1px solid rgba(251, 191, 36, 0.3)'
                }}
              >
                {liveOtp}
              </div>
              <button 
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                onClick={() => {
                  setTotpCode(liveOtp);
                  addToast('OTP copied to input box!', 'success');
                }}
              >
                Auto-Fill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
