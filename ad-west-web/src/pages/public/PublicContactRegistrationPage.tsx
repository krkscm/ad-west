import React, { useEffect, useState } from 'react'
import { backendApi, CaptchaChallengeResponse, PublicSreniOptionApi } from '../../utils/backendApi'
import { PublicFormSection } from '../../components/common/PublicFormSection'
import { PublicPageShell } from './PublicPageShell'

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PERMISSIVE_REGEX = /^\+?[\d\s()\-]{7,20}$/

const UAE_CITIES = [
  'Abu Dhabi', 'Al Ain', 'Dubai', 'Sharjah', 'Ajman',
  'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain',
]

const ABU_DHABI_DISTRICTS = [
  'Abu Dhabi City', 'Al Ain', 'Al Dhafra',
  'Khalifa City A', 'Khalifa City B', 'Mohammed Bin Zayed City',
  'Al Shamkha', 'Baniyas', 'Al Wathba', 'Al Falah', 'Al Rahba',
  'Shakhbout City', 'Zayed City', 'Al Reem Island', 'Saadiyat Island',
  'Yas Island', 'Al Mushrif', 'Al Karamah', 'Al Nahyan', 'Al Muroor',
  'Al Mussafah', 'Mussafah Industrial', 'Al Mafraq', 'Al Bahia',
  'Al Samha', 'Al Shuwaib', 'Ruwais', 'Madinat Zayed', 'Al Mirfa',
  'Ghayathi', 'Liwa',
]

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
          <div className="public-page-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
              <h2 style={{ margin: '0 0 8px', color: 'var(--public-text-primary)' }}>Registration Received</h2>
              <p style={{ margin: '0 0 20px', color: 'var(--public-text-secondary)' }}>
                Thank you. Your details were shared with our team. We will contact you soon.
              </p>
              <p style={{ margin: '0 0 24px', fontSize: '0.8rem', color: 'var(--public-text-secondary)' }}>
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
          <div className="public-page-card" style={{ padding: '36px' }}>
              <h2 style={{ margin: '0 0 6px', color: 'var(--public-text-primary)', fontSize: '1.4rem' }}>Register Your Interest</h2>
              <p style={{ margin: '0 0 28px', color: 'var(--public-text-secondary)', fontSize: '0.9rem' }}>
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

                <PublicFormSection
                  title="Membership Details"
                  description="Start with the Sreni you want to join and the identity fields we need to reach you."
                >
                  <div className="form-group">
                    <label className="form-label">
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
                    <div className="form-group">
                      <label className="form-label">
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
                    <div className="form-group">
                      <label className="form-label">
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
                </PublicFormSection>

                <PublicFormSection
                  title="Contact Details"
                  description="This helps us follow up and understand where you are based."
                >
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com (optional)"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      {form.country === 'UAE' ? (
                        <select
                          className="form-input"
                          value={form.city}
                          onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                        >
                          <option value="">— Select —</option>
                          {UAE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input
                          className="form-input"
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                          placeholder="City"
                        />
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Country</label>
                      <select
                        className="form-input"
                        value={form.country}
                        onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value, city: '' }))}
                      >
                        <option value="">— Select —</option>
                        <option value="UAE">UAE</option>
                        <option value="India">India</option>
                      </select>
                    </div>
                  </div>
                </PublicFormSection>

                <PublicFormSection
                  title="Profile Details"
                  description="Optional family and work details help us match your record accurately."
                >
                  <div className="form-group">
                    <label className="form-label">Personal Number</label>
                    <input
                      className="form-input"
                      type="text"
                      value={form.personalNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, personalNumber: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Family / Bachelor</label>
                      <select
                        className="form-input"
                        value={form.familyOrBachelor}
                        onChange={(e) => setForm((prev) => ({ ...prev, familyOrBachelor: e.target.value }))}
                      >
                        <option value="">— Select —</option>
                        <option value="Family">Family</option>
                        <option value="Bachelor">Bachelor</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Family</label>
                      <input className="form-input" type="text" value={form.family} onChange={(e) => setForm((prev) => ({ ...prev, family: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Bachelor</label>
                      <input className="form-input" type="text" value={form.bachelor} onChange={(e) => setForm((prev) => ({ ...prev, bachelor: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Wife Name</label>
                      <input className="form-input" type="text" value={form.wifeName} onChange={(e) => setForm((prev) => ({ ...prev, wifeName: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Company</label>
                      <input className="form-input" type="text" value={form.company} onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Profession</label>
                      <input className="form-input" type="text" value={form.profession} onChange={(e) => setForm((prev) => ({ ...prev, profession: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Land Line</label>
                    <input className="form-input" type="text" value={form.landLine} onChange={(e) => setForm((prev) => ({ ...prev, landLine: e.target.value }))} />
                  </div>
                </PublicFormSection>

                <PublicFormSection
                  title="Residence Details"
                  description="Add address context so the team can identify the right household or area."
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Address in UAE</label>
                      <input className="form-input" type="text" value={form.addressInUae} onChange={(e) => setForm((prev) => ({ ...prev, addressInUae: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">District / Area</label>
                      <select
                        className="form-input"
                        value={form.district}
                        onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))}
                      >
                        <option value="">— Select —</option>
                        {ABU_DHABI_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-input"
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any details you want to share"
                      rows={4}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </PublicFormSection>

                <PublicFormSection
                  title="Security Check"
                  description="This keeps the public form protected from automated submissions."
                >
                  <div className="form-group">
                    <label className="form-label">
                      Security Check <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      {captcha?.captchaImage ? (
                        <img src={captcha.captchaImage} alt="Captcha" style={{ borderRadius: '6px', border: '1px solid rgba(255, 237, 213, 0.4)', display: 'block' }} />
                      ) : (
                        <div style={{ width: '200px', height: '60px', background: 'rgba(255, 248, 235, 0.9)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c5a2a', fontSize: '13px' }}>Loading...</div>
                      )}
                      <button
                        type="button"
                        onClick={() => void loadCaptcha()}
                        title="Get a new captcha"
                        style={{ padding: '6px 10px', background: 'rgba(255, 248, 235, 0.08)', border: '1px solid rgba(255, 237, 213, 0.24)', borderRadius: '6px', cursor: 'pointer', color: 'var(--public-text-primary)', fontSize: '18px', lineHeight: 1 }}
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
                </PublicFormSection>

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
