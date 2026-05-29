import React, { useEffect, useState } from 'react'
import { backendApi, EventFormFieldApi, SpecialEventApi } from '../../utils/backendApi'
import { DateField } from '../../components/common/DateFields'

function getEventId(): string {
  const parts = window.location.pathname.split('/')
  const idx = parts.indexOf('events')
  return idx >= 0 ? parts[idx + 1] ?? '' : ''
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-AE', { dateStyle: 'long', timeStyle: 'short' })
}

function FormField({ field, value, onChange }: {
  field: EventFormFieldApi
  value: unknown
  onChange: (v: unknown) => void
}) {
  const base = 'form-input'
  const label = (
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
      {field.label} {field.isRequired && <span style={{ color: 'var(--error)' }}>*</span>}
    </label>
  )

  if (field.fieldType === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label} {field.isRequired && <span style={{ color: 'var(--error)' }}>*</span>}
      </label>
    )
  }

  if (field.fieldType === 'select') {
    return (
      <div>
        {label}
        <select className={base} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} required={field.isRequired}>
          <option value="">Select…</option>
          {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }

  if (field.fieldType === 'textarea') {
    return (
      <div>
        {label}
        <textarea className={base} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? ''} rows={4} required={field.isRequired} style={{ resize: 'vertical' }} />
      </div>
    )
  }

  if (field.fieldType === 'date') {
    return (
      <div>
        {label}
        <DateField
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholderText={field.placeholder?.trim() || 'DD-MM-YYYY'}
          required={field.isRequired}
        />
      </div>
    )
  }

  const inputType: Record<string, string> = { text: 'text', number: 'number', email: 'email', phone: 'tel' }
  return (
    <div>
      {label}
      <input
        className={base}
        type={inputType[field.fieldType] ?? 'text'}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? ''}
        required={field.isRequired}
      />
    </div>
  )
}

export function PublicEventRegistrationPage() {
  const eventId = getEventId()
  const [event, setEvent] = useState<SpecialEventApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!eventId) { setError('Invalid event link.'); setLoading(false); return }
    backendApi.publicGetEventRegistrationInfo(eventId)
      .then((ev) => {
        setEvent(ev)
        const defaults: Record<string, unknown> = {}
        ev.formFields.forEach((f) => { defaults[f.label] = f.fieldType === 'checkbox' ? false : '' })
        setFormValues(defaults)
      })
      .catch(() => setError('This event is not available or registration is closed.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    setSubmitError('')

    // Validate required fields
    for (const f of event.formFields) {
      if (f.isRequired) {
        const val = formValues[f.label]
        if (val === '' || val === undefined || val === null || val === false) {
          setSubmitError(`"${f.label}" is required.`)
          return
        }
      }
    }

    setSubmitting(true)
    try {
      await backendApi.publicRegisterForEvent(eventId, { formData: formValues })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
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
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>Event Registration</p>
        </div>
      </header>

      <main className="public-page-main" style={{ flex: 1, padding: '40px 16px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', padding: '60px' }}>Loading…</div>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', color: 'var(--error)', padding: '60px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚠️</div>
              <p style={{ fontWeight: 600 }}>{error}</p>
            </div>
          )}

          {!loading && !error && event && (
            <div className="public-page-card" style={{ background: 'var(--surface-dark)', border: '1px solid var(--border-dark)', borderRadius: '16px', padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
              {submitted ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                  <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary-dark)' }}>Registered!</h2>
                  <p style={{ margin: '0 0 20px', color: 'var(--text-secondary-dark)' }}>
                    You have successfully registered for <strong>{event.title}</strong>. We look forward to seeing you!
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setSubmitted(false); setFormValues(Object.fromEntries(event.formFields.map((f) => [f.label, f.fieldType === 'checkbox' ? false : '']))) }}
                  >
                    Register Another Person
                  </button>
                </div>
              ) : (
                <>
                  <h2 style={{ margin: '0 0 4px', color: 'var(--text-primary-dark)', fontSize: '1.3rem' }}>{event.title}</h2>
                  <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>
                    {formatDateTime(event.dateTime)}{event.endDateTime ? ` – ${formatDateTime(event.endDateTime)}` : ''}
                  </p>
                  {event.venue && (
                    <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>📍 {event.venue}</p>
                  )}
                  {event.description && (
                    <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--text-secondary-dark)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{event.description}</p>
                  )}

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-dark)', margin: '0 0 20px' }} />

                  {submitError && (
                    <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: 'var(--error)', fontSize: '0.88rem' }}>
                      {submitError}
                    </div>
                  )}

                  {event.formFields.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <p style={{ color: 'var(--text-secondary-dark)', marginBottom: '16px' }}>Click below to confirm your registration.</p>
                      <button className="btn btn-primary" disabled={submitting} onClick={async () => {
                        setSubmitting(true)
                        try {
                          await backendApi.publicRegisterForEvent(eventId, { formData: {} })
                          setSubmitted(true)
                        } catch (err) {
                          setSubmitError(err instanceof Error ? err.message : 'Registration failed.')
                        } finally {
                          setSubmitting(false)
                        }
                      }}>
                        {submitting ? 'Registering…' : 'Confirm Registration'}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {event.formFields
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((f) => (
                          <FormField
                            key={f.id}
                            field={f}
                            value={formValues[f.label]}
                            onChange={(v) => setFormValues((prev) => ({ ...prev, [f.label]: v }))}
                          />
                        ))}
                      <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '4px' }}>
                        {submitting ? 'Submitting…' : 'Register'}
                      </button>
                    </form>
                  )}
                </>
              )}
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
