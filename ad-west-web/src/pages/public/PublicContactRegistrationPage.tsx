import React, { useEffect, useState } from 'react'
import { backendApi, CaptchaChallengeResponse, PublicSreniOptionApi } from '../../utils/backendApi'
import { PublicPageShell } from './PublicPageShell'

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PERMISSIVE_REGEX = /^\+?[\d\s()\-]{7,20}$/

const formSectionStyle = {
  padding: '18px 18px 16px',
  borderRadius: '14px',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  background: 'rgba(15, 23, 42, 0.28)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '14px',
}

const formSectionTitleStyle = {
  margin: 0,
  fontSize: '0.88rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'rgba(226, 232, 240, 0.88)',
}

const formSectionTextStyle = {
  margin: '-4px 0 0',
  fontSize: '0.8rem',
  lineHeight: 1.55,
  color: 'rgba(148, 163, 184, 0.92)',
}

type JoinUsFormState = {
  fullName: string
  phone: string
  email: string
  city: string
  country: string
  notes: string
  personalNumber: string
  familyOrBachelor: string
  family: string
  bachelor: string
  addressInUae: string
  company: string
  profession: string
  wifeName: string
  landLine: string
  zoneOrLandMark: string
  district: string
}

const emptyFormState = (): JoinUsFormState => ({
  fullName: '',
  phone: '',
  email: '',
  city: '',
  country: '',
  notes: '',
  personalNumber: '',
  familyOrBachelor: '',
  family: '',
  bachelor: '',
  addressInUae: '',
  company: '',
  profession: '',
  wifeName: '',
  landLine: '',
  zoneOrLandMark: '',
  district: '',
})

export function PublicContactRegistrationPage() {
  const [sreniOptions, setSreniOptions] = useState<PublicSreniOptionApi[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const [sreniId, setSreniId] = useState('')
  const [form, setForm] = useState<JoinUsFormState>(emptyFormState)

  const [captcha, setCaptcha] = useState<CaptchaChallengeResponse | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')

  const loadCaptcha = React.useCallback(async () => {
    const challenge = await backendApi.captchaChallenge()
    setCaptcha(challenge)
    setCaptchaAnswer('')
  }, [])

  useEffect(() => {
    backendApi.publicListSreniContactOptions()
      .then((response) => {
        setSreniOptions(response.items)
        if (response.items.length > 0) {
          setSreniId(response.items[0].id)
        }
      })
      .catch(() => setError('Unable to load available sreni options. Please try again shortly.'))
      .finally(() => setLoadingOptions(false))

    void loadCaptcha()
  }, [loadCaptcha])

  const resetForm = () => {
    setForm(emptyFormState())
    setCaptchaAnswer('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!sreniId.trim() || !form.fullName.trim() || !form.phone.trim()) {
      setError('Please fill all required fields.')
      return
    }

    const trimmedPhone = form.phone.trim()
    const normalizedPhone = trimmedPhone.replace(/\D/g, '')
    if (!PHONE_PERMISSIVE_REGEX.test(trimmedPhone) || normalizedPhone.length < 7 || normalizedPhone.length > 15) {
      setError('Please enter a valid phone number (with country code if available).')
      return
    }

    const trimmedEmail = form.email.trim()
    if (trimmedEmail && !EMAIL_FORMAT_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address, or leave it blank.')
      return
    }

    if (!captcha?.captchaToken || !captchaAnswer.trim()) {
      setError('Please complete the security check before submitting.')
      return
    }

    setSubmitting(true)
    try {
      const result = await backendApi.publicRegisterSreniContact({
        sreniId: sreniId.trim(),
        fullName: form.fullName.trim(),
        phone: trimmedPhone,
        email: trimmedEmail || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        notes: form.notes.trim() || undefined,
        personalNumber: form.personalNumber.trim() || undefined,
        familyOrBachelor: form.familyOrBachelor.trim() || undefined,
        family: form.family.trim() || undefined,
        bachelor: form.bachelor.trim() || undefined,
        addressInUae: form.addressInUae.trim() || undefined,
        company: form.company.trim() || undefined,
        profession: form.profession.trim() || undefined,
        wifeName: form.wifeName.trim() || undefined,
        landLine: form.landLine.trim() || undefined,
        zoneOrLandMark: form.zoneOrLandMark.trim() || undefined,
        district: form.district.trim() || undefined,
        captchaToken: captcha.captchaToken,
        captchaAnswer: captchaAnswer.trim().toUpperCase(),
        website: '',
      })

      setReference(result.id.slice(0, 12).toUpperCase())
      setSubmitted(true)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
      void loadCaptcha()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PublicPageShell subtitle="Join Us — Contact Registration">
      <div style={{ width: '100%', maxWidth: '620px' }}>
        {submitted ? (
          <div style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
              <h2 style={{ margin: '0 0 8px', color: '#fff' }}>Registration Received</h2>
              <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.72)' }}>
                Thank you. Your details were shared with our team. We will contact you soon.
              </p>
              <p style={{ margin: '0 0 24px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)' }}>
                Reference ID: <code style={{ fontWeight: 700 }}>{reference}</code>
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSubmitted(false)
                  setReference('')
                  void loadCaptcha()
                }}
              >
                Submit Another Response
              </button>
            </div>
        ) : (
          <div style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '36px' }}>
              <h2 style={{ margin: '0 0 6px', color: '#fff', fontSize: '1.4rem' }}>Register Your Interest</h2>
              <p style={{ margin: '0 0 28px', color: 'rgba(255,255,255,0.72)', fontSize: '0.9rem' }}>
                Fill this form to connect with a sreni team. Required fields are marked with an asterisk.
              </p>

              {error && (
                <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: 'var(--error)', fontSize: '0.88rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'none' }} aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" type="text" autoComplete="off" tabIndex={-1} />
                </div>

                <section style={formSectionStyle}>
                  <div>
                    <h3 style={formSectionTitleStyle}>Membership Details</h3>
                    <p style={formSectionTextStyle}>Start with the Sreni you want to join and the identity fields we need to reach you.</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                      Interested Sreni <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={sreniId}
                      onChange={(e) => setSreniId(e.target.value)}
                      disabled={loadingOptions || sreniOptions.length === 0}
                      required
                    >
                      {sreniOptions.length === 0 && <option value="">No Sreni is currently open for Join Us</option>}
                      {sreniOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}{option.code ? ` (${option.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        Full Name <span style={{ color: 'var(--error)' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        type="text"
                        value={form.fullName}
                        onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        Phone <span style={{ color: 'var(--error)' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="+971 50 000 0000"
                        required
                      />
                    </div>
                  </div>
                </section>

                <section style={formSectionStyle}>
                  <div>
                    <h3 style={formSectionTitleStyle}>Contact Details</h3>
                    <p style={formSectionTextStyle}>This helps us follow up and understand where you are based.</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                      Email Address
                    </label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com (optional)"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        City
                      </label>
                      <input
                        className="form-input"
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="Abu Dhabi"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        Country
                      </label>
                      <input
                        className="form-input"
                        type="text"
                        value={form.country}
                        onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                        placeholder="UAE"
                      />
                    </div>
                  </div>
                </section>

                <section style={formSectionStyle}>
                  <div>
                    <h3 style={formSectionTitleStyle}>Profile Details</h3>
                    <p style={formSectionTextStyle}>Optional family and work details help us match your record accurately.</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                      Personal Number
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      value={form.personalNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, personalNumber: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        Family / Bachelor
                      </label>
                      <input className="form-input" type="text" value={form.familyOrBachelor} onChange={(e) => setForm((prev) => ({ ...prev, familyOrBachelor: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        Family
                      </label>
                      <input className="form-input" type="text" value={form.family} onChange={(e) => setForm((prev) => ({ ...prev, family: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        Bachelor
                      </label>
                      <input className="form-input" type="text" value={form.bachelor} onChange={(e) => setForm((prev) => ({ ...prev, bachelor: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        Wife Name
                      </label>
                      <input className="form-input" type="text" value={form.wifeName} onChange={(e) => setForm((prev) => ({ ...prev, wifeName: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        Company
                      </label>
                      <input className="form-input" type="text" value={form.company} onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        Profession
                      </label>
                      <input className="form-input" type="text" value={form.profession} onChange={(e) => setForm((prev) => ({ ...prev, profession: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                      Land Line
                    </label>
                    <input className="form-input" type="text" value={form.landLine} onChange={(e) => setForm((prev) => ({ ...prev, landLine: e.target.value }))} />
                  </div>
                </section>

                <section style={formSectionStyle}>
                  <div>
                    <h3 style={formSectionTitleStyle}>Residence Details</h3>
                    <p style={formSectionTextStyle}>Add address context so the team can identify the right household or area.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        Address in UAE
                      </label>
                      <input className="form-input" type="text" value={form.addressInUae} onChange={(e) => setForm((prev) => ({ ...prev, addressInUae: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                        District
                      </label>
                      <input className="form-input" type="text" value={form.district} onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                      Notes
                    </label>
                    <textarea
                      className="form-input"
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any details you want to share"
                      rows={4}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </section>

                <section style={formSectionStyle}>
                  <div>
                    <h3 style={formSectionTitleStyle}>Security Check</h3>
                    <p style={formSectionTextStyle}>This keeps the public form protected from automated submissions.</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.72)', marginBottom: '6px' }}>
                      Security Check <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      {captcha?.captchaImage ? (
                        <img src={captcha.captchaImage} alt="Captcha" style={{ borderRadius: '6px', border: '1px solid #dde', display: 'block' }} />
                      ) : (
                        <div style={{ width: '200px', height: '60px', background: '#eef0f8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px' }}>Loading...</div>
                      )}
                      <button
                        type="button"
                        onClick={() => void loadCaptcha()}
                        title="Get a new captcha"
                        style={{ padding: '6px 10px', background: 'none', border: '1px solid #ccd', borderRadius: '6px', cursor: 'pointer', color: '#555', fontSize: '18px', lineHeight: 1 }}
                      >
                        ↺
                      </button>
                    </div>
                    <input
                      className="form-input"
                      type="text"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value.replace(/\s/g, '').toUpperCase())}
                      placeholder="Type the 5 characters shown above"
                      maxLength={5}
                      autoComplete="off"
                      required
                    />
                  </div>
                </section>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || loadingOptions || sreniOptions.length === 0}
                  style={{ marginTop: '4px' }}
                >
                  {submitting ? 'Submitting…' : 'Register'}
                </button>
              </form>
            </div>
        )}
      </div>
    </PublicPageShell>
  )
}
