import React, { useState } from 'react'
import { backendApi } from '../utils/backendApi'
import { AuthPageLayout } from '../components/common/AuthPageLayout'

export const ResetPasswordPage: React.FC = () => {
  const token = new URLSearchParams(window.location.search).get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!token) {
      setError('Invalid reset link. Please request a new one.')
      return
    }

    setIsLoading(true)
    try {
      await backendApi.resetPassword(token, newPassword)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This reset link is invalid or has expired.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthPageLayout backgroundImage="/login-bg.webp" title="Reset Password">
        <div className="login-card login-card--compact animate-slide-up" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
          <p style={{ color: 'var(--error)', marginBottom: '20px' }}>Invalid or missing reset token.</p>
          <a href="/forgot-password" style={{ color: '#a5b4fc', fontSize: '0.88rem', fontWeight: 600 }}>
            Request a new reset link
          </a>
        </div>
      </AuthPageLayout>
    )
  }

  return (
    <AuthPageLayout backgroundImage="/login-bg.webp" title="Set New Password">
      <div className="login-card login-card--compact animate-slide-up">
        <div className="login-card-title-wrap">
          <h1 className="login-card-title">Set New Password</h1>
          <p className="login-card-copy">
            Choose a strong password for your admin account. Minimum 8 characters.
          </p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Your password has been updated successfully.
            </p>
            <a
              href="/login"
              className="btn btn-primary"
              style={{ display: 'inline-block', padding: '12px 28px', textDecoration: 'none' }}
            >
              Sign In
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)' }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
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
              {isLoading ? 'Saving…' : 'Set New Password'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <a href="/forgot-password" style={{ color: '#a5b4fc', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
                Request a new link
              </a>
            </div>
          </form>
        )}
      </div>
    </AuthPageLayout>
  )
}
