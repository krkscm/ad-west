import React, { useState } from 'react'
import { backendApi, TicketCategory } from '../../utils/backendApi'

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'financial', label: 'Financial / Membership Fees' },
  { value: 'membership', label: 'Membership Request' },
  { value: 'other', label: 'Other' },
]

export function PublicHelpdeskPage() {
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
    <div style={{ minHeight: '100vh', background: 'var(--landing-bg)', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="public-page-header" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-dark)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/favicon.png" alt="IFCA Abu Dhabi" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary-dark)' }}>IFCA Abu Dhabi</h1>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>Helpdesk Support</p>
        </div>
      </header>

      {/* Body */}
      <main className="public-page-main" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '48px 16px' }}>
        <div style={{ width: '100%', maxWidth: '560px' }}>
          {submitted ? (
            <div className="public-page-card" style={{ background: 'var(--surface-dark)', border: '1px solid var(--border-dark)', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
              <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary-dark)' }}>Request Submitted</h2>
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary-dark)' }}>
                Your helpdesk ticket has been received. Our team will be in touch shortly.
              </p>
              <p style={{ margin: '0 0 24px', fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
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
            <div className="public-page-card" style={{ background: 'var(--surface-dark)', border: '1px solid var(--border-dark)', borderRadius: '16px', padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
              <h2 style={{ margin: '0 0 6px', color: 'var(--text-primary-dark)', fontSize: '1.4rem' }}>Contact Helpdesk</h2>
              <p style={{ margin: '0 0 28px', color: 'var(--text-secondary-dark)', fontSize: '0.9rem' }}>
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
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
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
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
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
      </main>

      <footer style={{ textAlign: 'center', padding: '20px', fontSize: '0.78rem', color: 'var(--text-secondary-dark)', borderTop: '1px solid var(--border-dark)' }}>
        © {new Date().getFullYear()} IFCA Abu Dhabi. All rights reserved.
      </footer>
    </div>
  )
}
