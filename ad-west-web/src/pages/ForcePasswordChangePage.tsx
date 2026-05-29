import React, { useState } from 'react'
import { useAuth } from '../context/auth-context'
import { useToast } from '../components/common/Toast'

export const ForcePasswordChangePage: React.FC = () => {
  const { changeOwnPassword, logout, adminUser } = useAuth()
  const { addToast } = useToast()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      addToast('Password must be at least 8 characters.', 'warning')
      return
    }
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match.', 'warning')
      return
    }
    setIsSaving(true)
    const result = await changeOwnPassword('', newPassword)
    setIsSaving(false)
    if (result.success) {
      addToast('Password updated. Welcome!', 'success')
    } else {
      addToast(result.error ?? 'Failed to update password.', 'error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-main)', padding: '24px',
    }}>
      <div className="glass-panel animate-slide-up" style={{
        width: '100%', maxWidth: '440px', padding: '40px',
        borderTop: '4px solid var(--primary)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔐</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px' }}>Set Your Password</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', margin: 0 }}>
            Hello <strong>{adminUser?.name ?? 'there'}</strong>. Your account requires a new password before you can continue.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">New Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                minLength={8}
                required
                autoFocus
                style={{ paddingRight: '48px' }}
              />
              <button type="button" onClick={() => setShowNew(p => !p)} style={eyeBtn} aria-label="Toggle">
                {showNew ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label className="form-label">Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                style={{ paddingRight: '48px' }}
              />
              <button type="button" onClick={() => setShowConfirm(p => !p)} style={eyeBtn} aria-label="Toggle">
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSaving}
            style={{ width: '100%', height: '48px', fontSize: '1rem' }}>
            {isSaving ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button type="button" onClick={logout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
  color: 'var(--text-secondary-dark)', fontSize: '1rem', lineHeight: 1,
}
