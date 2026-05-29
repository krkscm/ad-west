import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/auth-context'
import { backendApi, GmailInboxEmailApi } from '../../utils/backendApi'
import { useToast } from '../common/Toast'
import { HtmlEditor } from '../common/HtmlEditor'

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: 'var(--text-secondary-dark)', marginBottom: '4px',
}

export const GmailWorkspacePanel: React.FC = () => {
  const { adminUser, loginWithGoogle } = useAuth()
  const { addToast } = useToast()

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('<p></p>')
  const [sending, setSending] = useState(false)
  const [loadingInbox, setLoadingInbox] = useState(false)
  const [inboxError, setInboxError] = useState<string | null>(null)
  const [emails, setEmails] = useState<GmailInboxEmailApi[]>([])
  const [selectedEmail, setSelectedEmail] = useState<GmailInboxEmailApi | null>(null)

  const isGoogleSession = adminUser?.authProvider === 'google'

  const loadInbox = useCallback(async () => {
    if (!isGoogleSession) { setEmails([]); setInboxError(null); return }
    setLoadingInbox(true)
    setInboxError(null)
    try {
      const response = await backendApi.gmailInbox(10)
      setEmails(response.emails)
    } catch (error) {
      setInboxError(error instanceof Error ? error.message : 'Failed to load inbox.')
    } finally {
      setLoadingInbox(false)
    }
  }, [isGoogleSession])

  useEffect(() => { void loadInbox() }, [loadInbox])

  const handleGoogleConnect = async () => {
    const result = await loginWithGoogle()
    if (!result.success) { addToast(result.error || 'Google sign-in failed.', 'error'); return }
    addToast('Google account connected.', 'success')
  }

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!to.trim() || !subject.trim() || !body.trim()) {
      addToast('To, subject, and body are required.', 'warning')
      return
    }
    setSending(true)
    try {
      const response = await backendApi.gmailSend({ to: to.trim(), subject: subject.trim(), body })
      if (response.success) {
        addToast('Email sent successfully.', 'success')
        setSubject('')
        setBody('')
        await loadInbox()
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to send email.', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Gmail Workspace</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>
            Compose and send Gmail messages from the current admin session.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px',
              borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
              background: isGoogleSession ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
              color: isGoogleSession ? '#10b981' : 'var(--text-secondary-dark)',
              border: `1px solid ${isGoogleSession ? 'rgba(16,185,129,0.25)' : 'var(--border-dark)'}`,
            }}>
              {isGoogleSession ? '● Connected' : '○ Not connected'}
            </span>
            {isGoogleSession && emails.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                <span style={{ fontWeight: 800 }}>{emails.length}</span>Inbox
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isGoogleSession && (
            <button className="btn btn-secondary" onClick={() => void loadInbox()} disabled={loadingInbox}>
              {loadingInbox ? 'Refreshing…' : 'Refresh Inbox'}
            </button>
          )}
          {!isGoogleSession && (
            <button className="btn btn-primary" onClick={() => void handleGoogleConnect()}>
              Connect Google Account
            </button>
          )}
        </div>
      </div>

      {/* Connected account banner */}
      {isGoogleSession && adminUser && (
        <div className="glass-panel" style={{ padding: '12px 18px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          {adminUser.picture ? (
            <img src={adminUser.picture} alt={adminUser.name} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--border-dark)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>👤</div>
          )}
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{adminUser.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>{adminUser.email}</div>
          </div>
          <span className="badge badge-success" style={{ marginLeft: 'auto' }}>Google Connected</span>
        </div>
      )}

      {/* Main layout: compose + inbox */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* Compose panel */}
        <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--primary)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700 }}>Compose</h3>
          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>To <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                disabled={!isGoogleSession || sending}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Subject <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                disabled={!isGoogleSession || sending}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Body <span style={{ color: 'var(--error)' }}>*</span></label>
              <HtmlEditor
                value={body}
                onChange={setBody}
                disabled={!isGoogleSession || sending}
                minHeight={220}
              />
            </div>
            {!isGoogleSession && (
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                Connect your Google account to send emails.
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={!isGoogleSession || sending} style={{ marginTop: '4px' }}>
              {sending ? 'Sending…' : 'Send Email'}
            </button>
          </form>
        </div>

        {/* Inbox panel */}
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>Inbox <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-secondary-dark)' }}>(latest 10)</span></h3>

          {!isGoogleSession && (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>
              Connect Google to read inbox messages.
            </div>
          )}

          {isGoogleSession && loadingInbox && (
            <div style={{ color: 'var(--text-secondary-dark)', padding: '20px' }}>Loading inbox…</div>
          )}

          {isGoogleSession && inboxError && (
            <div className="glass-panel" style={{ padding: '16px', borderLeft: '3px solid var(--error)', color: 'var(--error)', fontSize: '0.85rem' }}>
              {inboxError}
            </div>
          )}

          {isGoogleSession && !inboxError && !loadingInbox && emails.length === 0 && (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>
              No inbox messages found.
            </div>
          )}

          {isGoogleSession && emails.length > 0 && (
            <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: selectedEmail ? '1fr' : '1fr' }}>
              {selectedEmail ? (
                <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{selectedEmail.subject || '(No subject)'}</h4>
                    <button onClick={() => setSelectedEmail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary-dark)' }}>✕</button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '0.8rem' }}>
                    <tbody>
                      {[['From', selectedEmail.from], ['Date', selectedEmail.date]].map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: '1px solid var(--border-dark)' }}>
                          <td style={{ padding: '5px 0', color: 'var(--text-secondary-dark)', width: '50px', fontWeight: 600 }}>{k}</td>
                          <td style={{ padding: '5px 0' }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary-dark)', lineHeight: 1.6 }}>{selectedEmail.snippet}</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>From</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emails.map((mail) => (
                        <tr key={mail.id} onClick={() => setSelectedEmail(mail)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mail.subject || '(No subject)'}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mail.from}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>
                            {mail.date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
