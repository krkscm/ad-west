import React, { useState } from 'react'
import { backendApi, TicketCategory } from '../../utils/backendApi'
import { PublicPageShell } from './PublicPageShell'
import { useEnumOptions } from '../../hooks/useEnumOptions'

const fieldLabelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--public-text-secondary)',
  marginBottom: '4px',
} as const

export function PublicHelpdeskPage() {
  const { options: categoryOptions } = useEnumOptions('helpdesk_ticket_category')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState<TicketCategory>('general')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [ticketId, setTicketId] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !phone.trim() || !subject.trim() || !description.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    try {
      const result = await backendApi.publicSubmitHelpdeskTicket({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        category,
        subject: subject.trim(),
        description: description.trim(),
      })
      setTicketId(result.id)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PublicPageShell subtitle="Helpdesk Support">
      <div style={{ width: '100%', maxWidth: '560px' }}>
        {submitted ? (
          <div className="public-page-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
              <h2 style={{ margin: '0 0 8px', color: 'var(--public-text-primary)' }}>Request Submitted</h2>
              <p style={{ margin: '0 0 20px', color: 'var(--public-text-secondary)' }}>
                Your helpdesk ticket has been received. Our team will be in touch shortly.
              </p>
              <p style={{ margin: '0 0 24px', fontSize: '0.8rem', color: 'var(--public-text-secondary)' }}>
                Reference ID: <code style={{ fontWeight: 700 }}>{ticketId.slice(0, 12).toUpperCase()}</code>
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => { setSubmitted(false); setName(''); setPhone(''); setEmail(''); setSubject(''); setDescription(''); setTicketId('') }}
              >
                Submit Another Request
              </button>
            </div>
        ) : (
          <div className="public-page-card" style={{ padding: '36px' }}>
              <h2 style={{ margin: '0 0 6px', color: 'var(--public-text-primary)', fontSize: '1.4rem' }}>Contact Helpdesk</h2>
              <p style={{ margin: '0 0 28px', color: 'var(--public-text-secondary)', fontSize: '0.9rem' }}>
                Submit a support request and our team will respond as soon as possible.
              </p>

              {error && (
                <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: 'var(--error)', fontSize: '0.88rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={fieldLabelStyle}>
                      Full Name <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>
                      Phone <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      className="form-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+971 50 000 0000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={fieldLabelStyle}>
                    Email Address
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com (optional)"
                  />
                </div>

                <div>
                  <label style={fieldLabelStyle}>
                    Category
                  </label>
                  <select
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={fieldLabelStyle}>
                    Subject <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your issue"
                    required
                  />
                </div>

                <div>
                  <label style={fieldLabelStyle}>
                    Description <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <textarea
                    className="form-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe your request in detail..."
                    rows={5}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ marginTop: '4px' }}
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </div>
        )}
      </div>
    </PublicPageShell>
  )
}
