import React, { useState } from 'react'
import { backendApi } from '../utils/backendApi'
import { AuthPageLayout } from '../components/common/AuthPageLayout'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      await backendApi.forgotPassword(email.trim())
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthPageLayout title="Forgot Password" backgroundImage="/login-bg.webp">
      <div className="login-card login-card--compact animate-slide-up">
        <div className="login-card-title-wrap">
          <h1 className="login-card-title">Forgot Password</h1>
          <p className="login-card-copy">
            Enter your admin email address and we'll send you a password reset link.
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📧</div>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 20px' }}>
              If <strong>{email}</strong> is registered, a password reset link has been sent. Check your inbox and spam folder.
            </p>
            <a href="/login" style={{ color: '#a5b4fc', fontSize: '0.88rem', textDecoration: 'none', fontWeight: 600 }}>
              ← Back to Sign In
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Admin Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {error && (
              <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: '0 0 12px' }}>{error}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px', minHeight: '50px' }}
              disabled={isLoading}
            >
              {isLoading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <a href="/login" style={{ color: '#a5b4fc', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
                ← Back to Sign In
              </a>
            </div>
          </form>
        )}
      </div>
    </AuthPageLayout>
  )
}
