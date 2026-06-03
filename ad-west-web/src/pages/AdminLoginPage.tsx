import React, { useState } from 'react'
import { useAuth } from '../context/auth-context'
import { useToast } from '../components/common/Toast'
import { AuthPageLayout } from '../components/common/AuthPageLayout'

interface AdminLoginPageProps {
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = () => {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')

  const { login, loginWithGoogle, getCaptchaChallenge } = useAuth()
  const { addToast } = useToast()

  const loadCaptcha = React.useCallback(async () => {
    const response = await getCaptchaChallenge()
    if (!response.success || !response.captchaToken || !response.captchaImage) {
      addToast(response.error || 'Unable to load captcha.', 'error')
      return
    }
    setCaptchaToken(response.captchaToken)
    setCaptchaImage(response.captchaImage)
    setCaptchaAnswer('')
  }, [getCaptchaChallenge, addToast])

  React.useEffect(() => {
    void loadCaptcha()
  }, [loadCaptcha])

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier || !password) {
      addToast('Please enter your email or user code and password.', 'warning')
      return
    }

    if (!captchaToken || !captchaAnswer.trim()) {
      addToast('Please solve the captcha challenge.', 'warning')
      return
    }

    const res = await login(identifier, password, captchaToken, captchaAnswer)
    if (!res.success) {
      addToast(res.error || 'Authentication failed.', 'error')
      void loadCaptcha()
      return
    }

    addToast('Welcome back. Logged in successfully.', 'success')
  }

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle()
    if (!result.success) {
      addToast(result.error || 'Google sign-in failed.', 'error')
      return
    }

    addToast('Signed in with Google successfully.', 'success')
  }

  return (
    <AuthPageLayout title="Sign In" backgroundImage="/login-bg.webp">
      <div className="login-card login-card--compact animate-slide-up">
        <div className="login-card-title-wrap">
          <h1 className="login-card-title">User Sign In</h1>
          <p className="login-card-copy">
            Enter your user email or code and password to continue.
          </p>
        </div>

        <form onSubmit={handleCredentialsSubmit}>
          <div className="form-group">
            <label className="form-label">Email or User Code</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. arjun.madhav@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <a href="/forgot-password" style={{ fontSize: '0.78rem', color: '#a5b4fc', textDecoration: 'none', fontWeight: 500 }}>
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Security Check</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {captchaImage ? (
                <img src={captchaImage} alt="Captcha" style={{ borderRadius: '6px', border: '1px solid #dde', display: 'block' }} />
              ) : (
                <div style={{ width: '200px', height: '60px', background: '#eef0f8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px' }}>Loading...</div>
              )}
              <button type="button" onClick={() => void loadCaptcha()} title="Get a new captcha" style={{ padding: '6px 10px', background: 'none', border: '1px solid #ccd', borderRadius: '6px', cursor: 'pointer', color: '#555', fontSize: '18px', lineHeight: 1 }}>↺</button>
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="Type the 5 characters shown above"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value.replace(/\s/g, '').toUpperCase())}
              maxLength={5}
              autoComplete="off"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', minHeight: '46px' }}>
            Continue
          </button>

          <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ height: '1px', flex: 1, background: 'rgba(148,163,184,0.35)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>OR</span>
            <div style={{ height: '1px', flex: 1, background: 'rgba(148,163,184,0.35)' }} />
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', minHeight: '42px', justifyContent: 'center', gap: '10px' }}
            onClick={() => void handleGoogleLogin()}
          >
            <span style={{ fontSize: '1rem' }}>🔐</span>
            <span>Sign in with Google</span>
          </button>
        </form>
      </div>
    </AuthPageLayout>
  )
}
