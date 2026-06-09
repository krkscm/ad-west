import React, { useEffect, useState } from 'react'
import { backendApi, JobPostingApi } from '../../utils/backendApi'
import { FileUploadZone } from '../../components/common/FileUploadZone'
import { PublicPageShell } from './PublicPageShell'
import { useEnumOptions } from '../../hooks/useEnumOptions'
import { useAppLocation, useNavigate } from '../../hooks/usePathname'

type View = 'listings' | 'apply' | 'post'

const MAX_RESUME_SIZE_BYTES = 1024 * 1024

function stripContactBlock(description: string): string {
  return description.replace(/^\[Submitted by:[^\]]*\]\n\n?/, '')
}
const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx']
const ALLOWED_RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const fieldLabelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--public-text-secondary)',
  marginBottom: '4px',
} as const

const sectionEyebrowStyle = {
  margin: '0 0 4px',
  fontWeight: 700,
  fontSize: '0.82rem',
  color: 'var(--public-hero-kicker)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
}

function JobCard({ job, onApply, jobTypeLabel }: { job: JobPostingApi; onApply: (job: JobPostingApi) => void; jobTypeLabel: (value: string) => string }) {
  const [expanded, setExpanded] = useState(false)
  const description = stripContactBlock(job.description)
  return (
    <div className="public-page-card" style={{ borderRadius: '12px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', color: 'var(--public-text-primary)', fontSize: '1.05rem', fontWeight: 700 }}>{job.title}</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ background: 'var(--public-accent-soft)', color: 'var(--public-accent)', borderRadius: '20px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
              {jobTypeLabel(job.type)}
            </span>
            {job.location && (
              <span style={{ color: 'var(--public-text-secondary)', fontSize: '0.82rem' }}>📍 {job.location}</span>
            )}
          </div>
        </div>
        <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={() => onApply(job)}>
          Apply Now
        </button>
      </div>

      <div style={{ marginTop: '12px', color: 'var(--public-text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
        {expanded ? (
          <>
            <p style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{description}</p>
            {job.requirements && (
              <>
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--public-text-primary)', fontSize: '0.85rem' }}>Requirements:</p>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{job.requirements}</p>
              </>
            )}
          </>
        ) : (
          <p style={{ margin: 0 }}>{description.slice(0, 200)}{description.length > 200 ? '…' : ''}</p>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', color: 'var(--public-accent)', cursor: 'pointer', padding: '4px 0', marginTop: '4px', fontSize: '0.82rem', fontWeight: 600 }}
        >
          {expanded ? 'Show less ▲' : 'Read more ▼'}
        </button>
      </div>
    </div>
  )
}

export function PublicJobsPage() {
  const { pathname, search } = useAppLocation()
  const navigate = useNavigate()
  const { options: jobTypeOptions, labelByValue: jobTypeLabel } = useEnumOptions('job_posting_type')
  const [view, setView] = useState<View>('listings')
  const [selectedJob, setSelectedJob] = useState<JobPostingApi | null>(null)

  const [jobs, setJobs] = useState<JobPostingApi[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Post a Job form state
  const [postContactName, setPostContactName] = useState('')
  const [postContactPhone, setPostContactPhone] = useState('')
  const [postContactEmail, setPostContactEmail] = useState('')
  const [postTitle, setPostTitle] = useState('')
  const [postJobType, setPostJobType] = useState('')
  const [postLocation, setPostLocation] = useState('')
  const [postDescription, setPostDescription] = useState('')
  const [postRequirements, setPostRequirements] = useState('')
  const [postSubmitting, setPostSubmitting] = useState(false)
  const [postSubmitted, setPostSubmitted] = useState(false)
  const [postError, setPostError] = useState('')

  const resetPostForm = () => {
    setPostContactName('')
    setPostContactPhone('')
    setPostContactEmail('')
    setPostTitle('')
    setPostJobType('')
    setPostLocation('')
    setPostDescription('')
    setPostRequirements('')
  }

  // Apply form state
  const [appName, setAppName] = useState('')
  const [appPhone, setAppPhone] = useState('')
  const [appEmail, setAppEmail] = useState('')
  const [appResumeFile, setAppResumeFile] = useState<File | null>(null)
  const [appCoverLetter, setAppCoverLetter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const resetApplicationForm = () => {
    setAppName('')
    setAppPhone('')
    setAppEmail('')
    setAppResumeFile(null)
    setAppCoverLetter('')
  }

  const validateResumeFile = (file: File): string | null => {
    const normalizedName = file.name.toLowerCase()
    const matchedExtension = ALLOWED_RESUME_EXTENSIONS.find((extension) => normalizedName.endsWith(extension))

    if (!matchedExtension) {
      return 'Resume must be a PDF, DOC, or DOCX file.'
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      return 'Resume file must not exceed 1 MB.'
    }

    if (file.type && !ALLOWED_RESUME_MIME_TYPES.has(file.type)) {
      return 'Selected file does not look like a supported document. Please choose a PDF, DOC, or DOCX file.'
    }

    return null
  }

  useEffect(() => {
    backendApi.publicListActiveJobs()
      .then((res) => setJobs(res.items))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load jobs'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (pathname === '/jobs/post') {
      setView('post')
      return
    }

    const jobId = new URLSearchParams(search).get('job')

    if (pathname !== '/jobs/apply' || !jobId || jobs.length === 0) {
      if (pathname === '/jobs') {
        setView('listings')
      }
      return
    }

    const matchedJob = jobs.find((job) => job.id === jobId)
    if (matchedJob) {
      setSelectedJob(matchedJob)
      setView('apply')
      return
    }

    setView('listings')
    setSelectedJob(null)
    setSubmitError('The selected job could not be found or is no longer active.')
    navigate('/jobs', { replace: true })
  }, [jobs, pathname, search, navigate])

  const handlePostJob = () => {
    navigate('/jobs/post')
    setView('post')
    setPostSubmitted(false)
    setPostError('')
    resetPostForm()
  }

  const handleSubmitJobPosting = async (e: React.FormEvent) => {
    e.preventDefault()
    setPostError('')
    if (!postContactName.trim() || !postContactPhone.trim()) {
      setPostError('Your name and phone number are required.')
      return
    }
    if (!postTitle.trim() || !postDescription.trim()) {
      setPostError('Job title and description are required.')
      return
    }
    setPostSubmitting(true)
    try {
      await backendApi.publicSubmitJobPosting({
        contactName: postContactName.trim(),
        contactPhone: postContactPhone.trim(),
        contactEmail: postContactEmail.trim() || undefined,
        title: postTitle.trim(),
        description: postDescription.trim(),
        requirements: postRequirements.trim() || undefined,
        location: postLocation.trim() || undefined,
        type: (postJobType || undefined) as any,
      })
      setPostSubmitted(true)
      resetPostForm()
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setPostSubmitting(false)
    }
  }

  const handleApply = (job: JobPostingApi) => {
    navigate(`/jobs/apply?job=${encodeURIComponent(job.id)}`)
    setSelectedJob(job)
    setView('apply')
    setSubmitted(false)
    setSubmitError('')
    resetApplicationForm()
  }

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    if (!appName.trim() || !appPhone.trim()) {
      setSubmitError('Name and phone number are required.')
      return
    }
    if (appResumeFile) {
      const validationError = validateResumeFile(appResumeFile)
      if (validationError) {
        setSubmitError(validationError)
        return
      }
    }
    if (!selectedJob) return
    setSubmitting(true)
    try {
      await backendApi.publicApplyForJob(selectedJob.id, {
        name: appName.trim(),
        phone: appPhone.trim(),
        email: appEmail.trim() || undefined,
        coverLetter: appCoverLetter.trim() || undefined,
        resumeFile: appResumeFile ?? undefined,
      })
      setSubmitted(true)
      resetApplicationForm()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <PublicPageShell subtitle="Careers &amp; Opportunities">
      <style>{`
        .public-jobs-header {
          flex-wrap: wrap;
        }

        .public-jobs-main {
          padding: 40px 16px;
        }

        .public-jobs-panel {
          padding: 36px;
        }

        .public-jobs-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .public-jobs-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .public-jobs-actions .btn {
          flex: 1 1 180px;
        }

        @media (max-width: 768px) {
          .public-jobs-main {
            padding: 24px 12px;
          }

          .public-jobs-panel {
            padding: 22px;
            border-radius: 14px;
          }

          .public-jobs-grid-2 {
            grid-template-columns: 1fr;
          }

          .public-jobs-back-btn {
            width: 100%;
          }

          .public-jobs-top-action {
            width: 100%;
            max-width: 280px;
          }

          .public-jobs-form .form-input {
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .public-jobs-panel {
            padding: 18px;
          }
        }
      `}</style>

      {(view === 'apply' || view === 'post') && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
          <button
            className="btn btn-secondary public-jobs-back-btn"
            style={{ fontSize: '0.84rem' }}
            onClick={() => {
              navigate('/jobs')
              setView('listings')
              setSelectedJob(null)
              setSubmitError('')
            }}
          >
            ← Back to Listings
          </button>
        </div>
      )}

      <div className="public-jobs-main" style={{ flex: 1 }}>
        {view === 'listings' && (
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.8rem', fontWeight: 800, color: 'var(--public-text-primary)' }}>Open Positions</h2>
              <p style={{ margin: '0 0 16px', color: 'var(--public-text-secondary)' }}>Join AD West - IFCA — serving our community with purpose.</p>
              <button
                onClick={handlePostJob}
                style={{
                  fontSize: '0.88rem', padding: '8px 22px', borderRadius: '8px', cursor: 'pointer',
                  border: '1px solid rgba(255, 248, 235, 0.22)', background: 'var(--public-button-secondary-bg)',
                  color: 'var(--public-text-primary)', fontWeight: 600, backdropFilter: 'blur(8px)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--public-button-secondary-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--public-button-secondary-bg)' }}
              >
                + Post a Job
              </button>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', color: 'var(--public-text-secondary)', padding: '40px' }}>Loading opportunities…</div>
            )}
            {loadError && (
              <div style={{ textAlign: 'center', color: 'var(--error)', padding: '40px' }}>{loadError}</div>
            )}
            {!loading && !loadError && jobs.length === 0 && (
              <div className="public-page-card" style={{ textAlign: 'center', color: 'var(--public-text-secondary)', padding: '60px', borderRadius: '12px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
                <p style={{ margin: 0, fontWeight: 600 }}>No open positions at this time.</p>
                <p style={{ margin: '6px 0 0', fontSize: '0.88rem' }}>Please check back later for new opportunities.</p>
              </div>
            )}
            {!loading && !loadError && jobs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} onApply={handleApply} jobTypeLabel={jobTypeLabel} />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'apply' && selectedJob && (
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div className="public-jobs-panel public-page-card" style={{ borderRadius: '16px' }}>
              {submitted ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                  <h2 style={{ margin: '0 0 8px', color: 'var(--public-text-primary)' }}>Application Submitted</h2>
                  <p style={{ margin: '0 0 20px', color: 'var(--public-text-secondary)' }}>
                    Thank you for applying for <strong>{selectedJob.title}</strong>. We will review your application and reach out if there is a match.
                  </p>
                  <div className="public-jobs-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        navigate('/jobs')
                        setView('listings')
                        setSelectedJob(null)
                        setSubmitError('')
                      }}
                    >
                      View More Positions
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleApply(selectedJob)}>Apply Again</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ margin: '0 0 4px', color: 'var(--public-text-primary)', fontSize: '1.3rem' }}>Apply — {selectedJob.title}</h2>
                  <p style={{ margin: '0 0 24px', color: 'var(--public-text-secondary)', fontSize: '0.88rem' }}>
                    {jobTypeLabel(selectedJob.type)}
                    {selectedJob.location && ` · ${selectedJob.location}`}
                  </p>

                  {submitError && (
                    <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: 'var(--error)', fontSize: '0.88rem' }}>
                      {submitError}
                    </div>
                  )}

                  <form className="public-jobs-form" onSubmit={handleSubmitApplication} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="public-jobs-grid-2">
                      <div>
                        <label style={fieldLabelStyle}>
                          Full Name <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <input className="form-input" type="text" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Your full name" required />
                      </div>
                      <div>
                        <label style={fieldLabelStyle}>
                          Phone <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <input className="form-input" type="tel" value={appPhone} onChange={(e) => setAppPhone(e.target.value)} placeholder="+971 50 000 0000" required />
                      </div>
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>Email Address</label>
                      <input className="form-input" type="email" value={appEmail} onChange={(e) => setAppEmail(e.target.value)} placeholder="your@email.com (optional)" />
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>Resume Upload</label>
                      <FileUploadZone
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        maxBytes={MAX_RESUME_SIZE_BYTES}
                        allowedExtensions={ALLOWED_RESUME_EXTENSIONS}
                        hint="PDF, DOC or DOCX · Max 1 MB · Optional"
                        file={appResumeFile}
                        onChange={(f, err) => {
                          setAppResumeFile(f)
                          setSubmitError(err ?? '')
                        }}
                      />
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>Cover Letter / Message</label>
                      <textarea
                        className="form-input"
                        value={appCoverLetter}
                        onChange={(e) => setAppCoverLetter(e.target.value)}
                        placeholder="Tell us about yourself and why you're interested in this role…"
                        rows={5}
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '4px' }}>
                      {submitting ? 'Submitting…' : 'Submit Application'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
        {view === 'post' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="public-jobs-panel public-page-card" style={{ borderRadius: '16px' }}>
              {postSubmitted ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                  <h2 style={{ margin: '0 0 8px', color: 'var(--public-text-primary)' }}>Job Submitted for Review</h2>
                  <p style={{ margin: '0 0 20px', color: 'var(--public-text-secondary)' }}>
                    Thank you! Your job posting has been received and is pending admin review. We will publish it once approved.
                  </p>
                  <div className="public-jobs-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        navigate('/jobs')
                        setView('listings')
                      }}
                    >
                      View Open Positions
                    </button>
                    <button className="btn btn-secondary" onClick={() => { setPostSubmitted(false); setPostError('') }}>Post Another Job</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ margin: '0 0 4px', color: 'var(--public-text-primary)', fontSize: '1.3rem' }}>Post a Job</h2>
                  <p style={{ margin: '0 0 24px', color: 'var(--public-text-secondary)', fontSize: '0.88rem' }}>
                    Submit a job opening — our team will review and publish it shortly.
                  </p>

                  {postError && (
                    <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: 'var(--error)', fontSize: '0.88rem' }}>
                      {postError}
                    </div>
                  )}

                  <form className="public-jobs-form" onSubmit={handleSubmitJobPosting} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={sectionEyebrowStyle}>Your Contact Details</p>

                    <div className="public-jobs-grid-2">
                      <div>
                        <label style={fieldLabelStyle}>
                          Your Name <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <input className="form-input" type="text" value={postContactName} onChange={(e) => setPostContactName(e.target.value)} placeholder="Full name" required />
                      </div>
                      <div>
                        <label style={fieldLabelStyle}>
                          Phone <span style={{ color: 'var(--error)' }}>*</span>
                        </label>
                        <input className="form-input" type="tel" value={postContactPhone} onChange={(e) => setPostContactPhone(e.target.value)} placeholder="+971 50 000 0000" required />
                      </div>
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>Contact Email</label>
                      <input className="form-input" type="email" value={postContactEmail} onChange={(e) => setPostContactEmail(e.target.value)} placeholder="your@email.com (optional)" />
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 237, 213, 0.14)', margin: '4px 0' }} />
                    <p style={sectionEyebrowStyle}>Job Details</p>

                    <div>
                      <label style={fieldLabelStyle}>
                        Job Title <span style={{ color: 'var(--error)' }}>*</span>
                      </label>
                      <input className="form-input" type="text" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="e.g. Community Outreach Coordinator" required />
                    </div>

                    <div className="public-jobs-grid-2">
                      <div>
                        <label style={fieldLabelStyle}>Job Type</label>
                        <select className="form-input" value={postJobType} onChange={(e) => setPostJobType(e.target.value)}>
                          <option value="">Select type</option>
                          {jobTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={fieldLabelStyle}>Location</label>
                        <input className="form-input" type="text" value={postLocation} onChange={(e) => setPostLocation(e.target.value)} placeholder="e.g. Abu Dhabi (optional)" />
                      </div>
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>
                        Description <span style={{ color: 'var(--error)' }}>*</span>
                      </label>
                      <textarea
                        className="form-input"
                        value={postDescription}
                        onChange={(e) => setPostDescription(e.target.value)}
                        placeholder="Describe the role, responsibilities, and what you're looking for…"
                        rows={5}
                        style={{ resize: 'vertical' }}
                        required
                      />
                    </div>

                    <div>
                      <label style={fieldLabelStyle}>Requirements</label>
                      <textarea
                        className="form-input"
                        value={postRequirements}
                        onChange={(e) => setPostRequirements(e.target.value)}
                        placeholder="List any qualifications, experience, or skills required (optional)…"
                        rows={3}
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={postSubmitting} style={{ marginTop: '4px' }}>
                      {postSubmitting ? 'Submitting…' : 'Submit Job Posting'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicPageShell>
  )
}
