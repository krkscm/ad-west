import React, { useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../context/auth-context';
import { useToast } from './Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetPasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { changeOwnPassword } = useAuth();
  const { addToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    const result = await changeOwnPassword(currentPassword, newPassword);
    setIsSubmitting(false);
    if (result.success) {
      addToast('Password updated successfully.', 'success');
      handleClose();
    } else {
      setError(result.error ?? 'Failed to update password.');
    }
  };

  const eyeButton = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      tabIndex={-1}
      style={{
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--text-secondary-dark)', lineHeight: 1, padding: '2px',
      }}
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Password" maxWidth="420px">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
        <div>
          <label className="form-label">Current Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              autoComplete="current-password"
              style={{ paddingRight: '40px' }}
            />
            {eyeButton(showCurrent, () => setShowCurrent(v => !v))}
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border-dark)' }} />

        <div>
          <label className="form-label">New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              autoComplete="new-password"
              style={{ paddingRight: '40px' }}
            />
            {eyeButton(showNew, () => setShowNew(v => !v))}
          </div>
        </div>

        <div>
          <label className="form-label">Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              autoComplete="new-password"
              style={{ paddingRight: '40px' }}
            />
            {eyeButton(showConfirm, () => setShowConfirm(v => !v))}
          </div>
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#f87171',
            fontSize: '0.82rem',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
