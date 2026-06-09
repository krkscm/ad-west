import React, { useEffect, useState } from 'react'
import { backendApi, CaptchaChallengeResponse, PublicSreniOptionApi } from '../../utils/backendApi'
import { DateField, validateBirthDate } from '../../components/common/DateFields'
import { PublicFormSection } from '../../components/common/PublicFormSection'
import { SwitchToggle } from '../../components/common/SwitchToggle'
import { PublicPageShell } from './PublicPageShell'
import { GoogleMapLocationPicker } from '../../components/public/GoogleMapLocationPicker'

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PERMISSIVE_REGEX = /^\+?[\d\s()\-]{7,20}$/

const FALLBACK_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const FALLBACK_LIVING_TYPES = ['Family', 'Bachelor']

type JoinUsFormState = {
  name: string
  mobileNo: string
  dateOfBirth: string
  familyOrBachelor: string
  email: string
  bloodGroup: string
  altMobileNo: string
  profession: string
  company: string
  jobTitle: string
  spouseName: string
  spouseDateOfBirth: string
  spouseMobileNo: string
  spouseEmail: string
  spouseBloodGroup: string
  spouseProfession: string
  spouseCompany: string
  child1Name: string
  child1Dob: string
  child1Grade: string
  child2Name: string
  child2Dob: string
  child2Grade: string
  child3Name: string
  child3Dob: string
  child3Grade: string
  addressInUae: string
  landLineNo: string
  home: string
  addressInIndia: string
  districtIndia: string
  googleMapLink: string
  remarks: string
}

const emptyFormState = (): JoinUsFormState => ({
  name: '',
  mobileNo: '',
  dateOfBirth: '',
  familyOrBachelor: '',
  email: '',
  bloodGroup: '',
  altMobileNo: '',
  profession: '',
  company: '',
  jobTitle: '',
  spouseName: '',
  spouseDateOfBirth: '',
  spouseMobileNo: '',
  spouseEmail: '',
  spouseBloodGroup: '',
  spouseProfession: '',
  spouseCompany: '',
  child1Name: '',
  child1Dob: '',
  child1Grade: '',
  child2Name: '',
  child2Dob: '',
  child2Grade: '',
  child3Name: '',
  child3Dob: '',
  child3Grade: '',
  addressInUae: '',
  landLineNo: '',
  home: '',
  addressInIndia: '',
  districtIndia: '',
  googleMapLink: '',
  remarks: '',
})

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '0.84rem',
  fontWeight: 600,
  color: 'var(--public-text-primary)',
}

type EnumOption = { value: string; label: string }

export function PublicContactRegistrationPage() {
  const [sreniOptions, setSreniOptions] = useState<PublicSreniOptionApi[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [bloodGroups, setBloodGroups] = useState<EnumOption[]>(FALLBACK_BLOOD_GROUPS.map((v) => ({ value: v, label: v })))
  const [livingTypes, setLivingTypes] = useState<EnumOption[]>(FALLBACK_LIVING_TYPES.map((v) => ({ value: v, label: v })))
  const [childGrades, setChildGrades] = useState<EnumOption[]>([])
  const [mapsApiKey, setMapsApiKey] = useState<string | undefined>()

  const [sreniId, setSreniId] = useState('')
  const [form, setForm] = useState<JoinUsFormState>(emptyFormState)
  const [includeSpouse, setIncludeSpouse] = useState(false)
  const [includeChildren, setIncludeChildren] = useState(false)
  const [childCount, setChildCount] = useState(1)

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
    Promise.all([
      backendApi.publicListSreniContactOptions(),
      backendApi.publicJoinUsFormOptions().catch(() => null),
    ])
      .then(([sreniRes, formOpts]) => {
        setSreniOptions(sreniRes.items)
        if (sreniRes.items.length > 0) {
          setSreniId(sreniRes.items[0].id)
        }
        if (formOpts) {
          if (formOpts.bloodGroups.length) setBloodGroups(formOpts.bloodGroups)
          if (formOpts.livingTypes.length) setLivingTypes(formOpts.livingTypes)
          setChildGrades(formOpts.childGrades)
          setMapsApiKey(formOpts.mapsApiKey)
        }
      })
      .catch(() => setError('Unable to load available sreni options. Please try again shortly.'))
      .finally(() => setLoadingOptions(false))

    void loadCaptcha()
  }, [loadCaptcha])

  const resetForm = () => {
    setForm(emptyFormState())
    setIncludeSpouse(false)
    setIncludeChildren(false)
    setChildCount(1)
    setCaptchaAnswer('')
  }

  const setField = <K extends keyof JoinUsFormState>(key: K, value: JoinUsFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const clearChildSlot = (slot: 1 | 2 | 3) => {
    if (slot === 1) {
      setField('child1Name', '')
      setField('child1Dob', '')
      setField('child1Grade', '')
    } else if (slot === 2) {
      setField('child2Name', '')
      setField('child2Dob', '')
      setField('child2Grade', '')
    } else {
      setField('child3Name', '')
      setField('child3Dob', '')
      setField('child3Grade', '')
    }
  }

  const handleToggleChildren = (checked: boolean) => {
    setIncludeChildren(checked)
    if (!checked) {
      setChildCount(1)
      clearChildSlot(1)
      clearChildSlot(2)
      clearChildSlot(3)
    }
  }

  const handleToggleSpouse = (checked: boolean) => {
    setIncludeSpouse(checked)
    if (!checked) {
      setField('spouseName', '')
      setField('spouseDateOfBirth', '')
      setField('spouseMobileNo', '')
      setField('spouseEmail', '')
      setField('spouseBloodGroup', '')
      setField('spouseProfession', '')
      setField('spouseCompany', '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!sreniId.trim() || !form.name.trim() || !form.mobileNo.trim() || !form.dateOfBirth.trim() || !form.familyOrBachelor.trim()) {
      setError('Please fill all required fields.')
      return
    }

    const primaryDobError = validateBirthDate(form.dateOfBirth, 'Date of birth')
    if (primaryDobError) {
      setError(primaryDobError)
      return
    }

    if (includeSpouse && form.spouseDateOfBirth.trim()) {
      const spouseDobError = validateBirthDate(form.spouseDateOfBirth, 'Spouse date of birth')
      if (spouseDobError) {
        setError(spouseDobError)
        return
      }
    }

    if (includeChildren) {
      const childDobChecks: Array<[string, string]> = [
        [form.child1Dob, 'Child 1 date of birth'],
        ...(childCount >= 2 ? [[form.child2Dob, 'Child 2 date of birth'] as [string, string]] : []),
        ...(childCount >= 3 ? [[form.child3Dob, 'Child 3 date of birth'] as [string, string]] : []),
      ]
      for (const [value, label] of childDobChecks) {
        if (!value.trim()) continue
        const childDobError = validateBirthDate(value, label)
        if (childDobError) {
          setError(childDobError)
          return
        }
      }
    }

    const trimmedMobile = form.mobileNo.trim()
    const normalizedPhone = trimmedMobile.replace(/\D/g, '')
    if (!PHONE_PERMISSIVE_REGEX.test(trimmedMobile) || normalizedPhone.length < 7 || normalizedPhone.length > 15) {
      setError('Please enter a valid mobile number (with country code if available).')
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
        name: form.name.trim(),
        mobileNo: trimmedMobile,
        dateOfBirth: form.dateOfBirth.trim(),
        familyOrBachelor: form.familyOrBachelor.trim(),
        email: trimmedEmail || undefined,
        bloodGroup: form.bloodGroup.trim() || undefined,
        altMobileNo: form.altMobileNo.trim() || undefined,
        profession: form.profession.trim() || undefined,
        company: form.company.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        spouseName: includeSpouse ? form.spouseName.trim() || undefined : undefined,
        spouseDateOfBirth: includeSpouse ? form.spouseDateOfBirth.trim() || undefined : undefined,
        spouseMobileNo: includeSpouse ? form.spouseMobileNo.trim() || undefined : undefined,
        spouseEmail: includeSpouse ? form.spouseEmail.trim() || undefined : undefined,
        spouseBloodGroup: includeSpouse ? form.spouseBloodGroup.trim() || undefined : undefined,
        spouseProfession: includeSpouse ? form.spouseProfession.trim() || undefined : undefined,
        spouseCompany: includeSpouse ? form.spouseCompany.trim() || undefined : undefined,
        child1Name: includeChildren ? form.child1Name.trim() || undefined : undefined,
        child1Dob: includeChildren ? form.child1Dob.trim() || undefined : undefined,
        child1Grade: includeChildren ? form.child1Grade.trim() || undefined : undefined,
        child2Name: includeChildren && childCount >= 2 ? form.child2Name.trim() || undefined : undefined,
        child2Dob: includeChildren && childCount >= 2 ? form.child2Dob.trim() || undefined : undefined,
        child2Grade: includeChildren && childCount >= 2 ? form.child2Grade.trim() || undefined : undefined,
        child3Name: includeChildren && childCount >= 3 ? form.child3Name.trim() || undefined : undefined,
        child3Dob: includeChildren && childCount >= 3 ? form.child3Dob.trim() || undefined : undefined,
        child3Grade: includeChildren && childCount >= 3 ? form.child3Grade.trim() || undefined : undefined,
        addressInUae: form.addressInUae.trim() || undefined,
        landLineNo: form.landLineNo.trim() || undefined,
        home: form.home.trim() || undefined,
        addressInIndia: form.addressInIndia.trim() || undefined,
        districtIndia: form.districtIndia.trim() || undefined,
        googleMapLink: form.googleMapLink.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
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

  const renderChildFields = (slot: 1 | 2 | 3) => {
    const prefix = `child${slot}` as const
    const nameKey = `${prefix}Name` as keyof JoinUsFormState
    const dobKey = `${prefix}Dob` as keyof JoinUsFormState
    const gradeKey = `${prefix}Grade` as keyof JoinUsFormState
    return (
      <div key={slot} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: slot < childCount ? '12px' : 0 }}>
        <div className="form-group">
          <label style={fieldLabelStyle}>Child {slot} — Name</label>
          <input className="form-input" value={String(form[nameKey])} onChange={(e) => setField(nameKey, e.target.value)} />
        </div>
        <div className="form-group">
          <label style={fieldLabelStyle}>Child {slot} — DOB</label>
          <DateField
            value={String(form[dobKey])}
            birthDate
            onChange={(e) => setField(dobKey, e.target.value)}
          />
        </div>
        <div className="form-group">
          <label style={fieldLabelStyle}>Child {slot} — Grade</label>
          {childGrades.length > 0 ? (
            <select className="form-input" value={String(form[gradeKey])} onChange={(e) => setField(gradeKey, e.target.value)}>
              <option value="">— Select —</option>
              {childGrades.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          ) : (
            <input className="form-input" value={String(form[gradeKey])} onChange={(e) => setField(gradeKey, e.target.value)} />
          )}
        </div>
      </div>
    )
  }

  return (
    <PublicPageShell subtitle="Join Us">
      <div style={{ width: '100%', maxWidth: '680px' }}>
        {submitted ? (
          <div className="public-page-card" style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
            <h2 style={{ margin: '0 0 8px', color: 'var(--public-text-primary)' }}>Thank You</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--public-text-secondary)' }}>
              We are honoured that you wish to join us. Someone from our team will connect with you shortly.
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
            <h2 style={{ margin: '0 0 6px', color: 'var(--public-text-primary)', fontSize: '1.4rem' }}>We'd Love to Welcome You</h2>
            <p style={{ margin: '0 0 28px', color: 'var(--public-text-secondary)', fontSize: '0.9rem' }}>
              We are honoured that you wish to be part of our family. Please share a few details about yourself so we can welcome you. Required fields are marked with an asterisk.
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

              <PublicFormSection title="Your Sreni" description="Let us know which group you would like to be part of.">
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
                    {sreniOptions.length === 0 && <option value="">Registration is temporarily unavailable</option>}
                    {sreniOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}{option.code ? ` (${option.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </PublicFormSection>

              <PublicFormSection title="About You" description="A few details to help us know you better.">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>Name (Primary Member) <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input className="form-input" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>Mobile No <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input className="form-input" type="tel" value={form.mobileNo} onChange={(e) => setField('mobileNo', e.target.value)} placeholder="+971 50 000 0000" required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>Alt Mobile No</label>
                    <input className="form-input" type="tel" value={form.altMobileNo} onChange={(e) => setField('altMobileNo', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>Date of Birth <span style={{ color: 'var(--error)' }}>*</span></label>
                    <DateField
                      value={form.dateOfBirth}
                      birthDate
                      onChange={(e) => setField('dateOfBirth', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label style={fieldLabelStyle}>Family / Bachelor <span style={{ color: 'var(--error)' }}>*</span></label>
                  <select className="form-input" value={form.familyOrBachelor} onChange={(e) => setField('familyOrBachelor', e.target.value)} required>
                    <option value="">— Select —</option>
                    {livingTypes.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>E-mail</label>
                    <input className="form-input" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>Blood Group</label>
                    <select className="form-input" value={form.bloodGroup} onChange={(e) => setField('bloodGroup', e.target.value)}>
                      <option value="">— Select —</option>
                      {bloodGroups.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>Profession</label>
                    <input className="form-input" value={form.profession} onChange={(e) => setField('profession', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>Company</label>
                    <input className="form-input" value={form.company} onChange={(e) => setField('company', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>Job Title</label>
                    <input className="form-input" value={form.jobTitle} onChange={(e) => setField('jobTitle', e.target.value)} />
                  </div>
                </div>
              </PublicFormSection>

              <PublicFormSection title="Spouse / Partner" description="Optional — for single members you can skip this section.">
                <div style={{ marginBottom: includeSpouse ? '14px' : 0 }}>
                  <SwitchToggle
                    checked={includeSpouse}
                    onChange={handleToggleSpouse}
                    label="Add spouse / partner details"
                    labelOn="Yes"
                    labelOff="No"
                  />
                </div>
                {includeSpouse && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label style={fieldLabelStyle}>Wife / Spouse Name</label>
                        <input className="form-input" value={form.spouseName} onChange={(e) => setField('spouseName', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label style={fieldLabelStyle}>Spouse Date of Birth</label>
                        <DateField
                          value={form.spouseDateOfBirth}
                          birthDate
                          onChange={(e) => setField('spouseDateOfBirth', e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label style={fieldLabelStyle}>Spouse Mobile No</label>
                        <input className="form-input" type="tel" value={form.spouseMobileNo} onChange={(e) => setField('spouseMobileNo', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label style={fieldLabelStyle}>Spouse E-mail</label>
                        <input className="form-input" type="email" value={form.spouseEmail} onChange={(e) => setField('spouseEmail', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label style={fieldLabelStyle}>Spouse Blood Group</label>
                        <select className="form-input" value={form.spouseBloodGroup} onChange={(e) => setField('spouseBloodGroup', e.target.value)}>
                          <option value="">— Select —</option>
                          {bloodGroups.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label style={fieldLabelStyle}>Spouse Profession</label>
                        <input className="form-input" value={form.spouseProfession} onChange={(e) => setField('spouseProfession', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label style={fieldLabelStyle}>Spouse Company</label>
                        <input className="form-input" value={form.spouseCompany} onChange={(e) => setField('spouseCompany', e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </PublicFormSection>

              <PublicFormSection title="Children" description="Optional — only if you want to register children (e.g. Bala Bharathi).">
                <div style={{ marginBottom: includeChildren ? '14px' : 0 }}>
                  <SwitchToggle
                    checked={includeChildren}
                    onChange={handleToggleChildren}
                    label="Add child details"
                    labelOn="Yes"
                    labelOff="No"
                  />
                </div>
                {includeChildren && (
                  <>
                    {Array.from({ length: childCount }, (_, i) => renderChildFields((i + 1) as 1 | 2 | 3))}
                    {childCount < 3 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '4px' }}
                        onClick={() => setChildCount((c) => Math.min(3, c + 1) as 1 | 2 | 3)}
                      >
                        Add another child
                      </button>
                    )}
                  </>
                )}
              </PublicFormSection>

              <PublicFormSection title="Address" description="UAE and India address details.">
                <div className="form-group">
                  <label style={fieldLabelStyle}>Address in UAE</label>
                  <input className="form-input" value={form.addressInUae} onChange={(e) => setField('addressInUae', e.target.value)} />
                </div>
                <GoogleMapLocationPicker
                  apiKey={mapsApiKey}
                  value={form.googleMapLink}
                  onChange={(link) => setField('googleMapLink', link)}
                  labelStyle={fieldLabelStyle}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>Land Line No</label>
                    <input className="form-input" value={form.landLineNo} onChange={(e) => setField('landLineNo', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label style={fieldLabelStyle}>Home</label>
                    <input className="form-input" value={form.home} onChange={(e) => setField('home', e.target.value)} placeholder="Building / villa name" />
                  </div>
                </div>
                <div className="form-group">
                  <label style={fieldLabelStyle}>Address in India</label>
                  <input className="form-input" value={form.addressInIndia} onChange={(e) => setField('addressInIndia', e.target.value)} />
                </div>
                <div className="form-group">
                  <label style={fieldLabelStyle}>District (India)</label>
                  <input className="form-input" value={form.districtIndia} onChange={(e) => setField('districtIndia', e.target.value)} />
                </div>
                <div className="form-group">
                  <label style={fieldLabelStyle}>Remarks</label>
                  <textarea className="form-input" rows={3} value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} style={{ resize: 'vertical' }} />
                </div>
              </PublicFormSection>

              <PublicFormSection title="Security Check" description="Keeps the public form protected from automated submissions.">
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
                {submitting ? 'Submitting…' : 'Join Us'}
              </button>
            </form>
          </div>
        )}
      </div>
    </PublicPageShell>
  )
}
