import React, { useEffect, useState } from 'react'
import { backendApi, EventFormFieldApi, SpecialEventApi } from '../../utils/backendApi'
import { DateField } from '../../components/common/DateFields'
import { PublicPageShell } from './PublicPageShell'
import { SwitchToggle } from '../../components/common/SwitchToggle'
import { PublicFormSection } from '../../components/common/PublicFormSection'
import { InlineAlert } from '../../components/common/InlineAlert'

const fieldLabelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--public-text-secondary)',
  marginBottom: '4px',
} as const

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
    <label style={fieldLabelStyle}>
      {field.label} {field.isRequired && <span style={{ color: 'var(--error)' }}>*</span>}
    </label>
  )

  if (field.fieldType === 'checkbox') {
    return (
      <div>
        <SwitchToggle
          checked={!!value}
          onChange={onChange}
          label={field.label}
          labelOn="Yes"
          labelOff="No"
        />
        {field.isRequired && <span style={{ display: 'block', marginTop: '4px', fontSize: '0.75rem', color: 'var(--error)' }}>Required</span>}
      </div>
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
    <PublicPageShell subtitle="Event Registration">
      <div style={{ width: '100%', maxWidth: '560px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--public-text-muted)', padding: '60px' }}>Loading…</div>
        )}

        {!loading && error && (
          <div className="public-page-card animate-slide-up" style={{ padding: '36px' }}>
            <InlineAlert variant="error">{error}</InlineAlert>
          </div>
        )}

        {!loading && !error && event && (
          <div className="public-page-card animate-slide-up" style={{ padding: '36px' }}>
              {submitted ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                  <h2 style={{ margin: '0 0 8px', color: 'var(--public-text-primary)' }}>Registered!</h2>
                  <p style={{ margin: '0 0 20px', color: 'var(--public-text-secondary)' }}>
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
                  <h2 style={{ margin: '0 0 4px', color: 'var(--public-text-primary)', fontSize: '1.3rem' }}>{event.title}</h2>
                  <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--public-text-secondary)' }}>
                    {formatDateTime(event.dateTime)}{event.endDateTime ? ` – ${formatDateTime(event.endDateTime)}` : ''}
                  </p>
                  {event.venue && (
                    <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--public-text-secondary)' }}>📍 {event.venue}</p>
                  )}
                  {event.description && (
                    <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--public-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{event.description}</p>
                  )}

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 237, 213, 0.14)', margin: '0 0 20px' }} />

                  {submitError && (
                    <InlineAlert variant="error">{submitError}</InlineAlert>
                  )}

                  {event.formFields.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <p style={{ color: 'var(--public-text-secondary)', marginBottom: '16px' }}>Click below to confirm your registration.</p>
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
                    <form onSubmit={handleSubmit}>
                      <PublicFormSection
                        title="Registration Details"
                        description="Please complete all required fields to register for this event."
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        </div>
                      </PublicFormSection>
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
    </PublicPageShell>
  )
}
