import { useCallback, useEffect, useState } from 'react'
import { backendApi, ApplicationStatus, JobApplicationApi } from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
  accepted: 'Accepted',
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: 'var(--info)',
  under_review: 'var(--warning)',
  shortlisted: 'var(--primary)',
  rejected: 'var(--error)',
  accepted: 'var(--success)',
}

export function JobApplicationsPage() {
  const { addToast } = useToast()
  const [applications, setApplications] = useState<JobApplicationApi[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<JobApplicationApi | null>(null)
  const [editStatus, setEditStatus] = useState<ApplicationStatus>('new')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')

  const loadApplications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await backendApi.listAllJobApplications()
      setApplications(res.items)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load applications', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { loadApplications() }, [loadApplications])

  const filtered = filterStatus ? applications.filter((a) => a.status === filterStatus) : applications

  const openApplication = (app: JobApplicationApi) => {
    setSelected(app)
    setEditStatus(app.status)
    setEditNotes(app.notes ?? '')
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await backendApi.updateJobApplication(selected.id, { status: editStatus, notes: editNotes })
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setSelected(updated)
      addToast('Application updated', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenResume = async (application: JobApplicationApi) => {
    try {
      const blob = await backendApi.downloadJobApplicationResume(application.id)
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to open resume', 'error')
    }
  }

  const newCount = applications.filter((app) => app.status === 'new').length
  const underReviewCount = applications.filter((app) => app.status === 'under_review').length

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Job Applications</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>
            Review and manage applications submitted via the public jobs page.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{applications.length}</span>Total
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(14,165,233,0.1)', color: 'var(--info)', border: '1px solid rgba(14,165,233,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{newCount}</span>New
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.28)' }}>
              <span style={{ fontWeight: 800 }}>{underReviewCount}</span>Under Review
            </span>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={loadApplications} disabled={loading}>Refresh</button>
      </div>

      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)' }}>Status</label>
        <div style={{ width: '240px', maxWidth: '100%' }}>
          <select
            className="form-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0,1fr) 380px' : '1fr', gap: '16px', alignItems: 'start' }}>
        <div>
          {loading && <div style={{ color: 'var(--text-secondary-dark)', padding: '20px' }}>Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>
              No applications found.
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Resume</th>
                    <th>Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => {
                    const isActive = selected?.id === app.id
                    return (
                      <tr
                        key={app.id}
                        onClick={() => openApplication(app)}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--primary-light)' : 'transparent' }}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>{app.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
                            {app.phone}{app.email ? ` · ${app.email}` : ''}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{app.jobTitle}</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: STATUS_COLORS[app.status], background: `${STATUS_COLORS[app.status]}18`, borderRadius: '20px', padding: '2px 8px' }}>
                            {STATUS_LABELS[app.status]}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                          {app.resumeUrl ? (app.resumeFileName ?? 'Attached') : 'No file'}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                          {new Date(app.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="glass-panel" style={{ padding: '20px', position: 'sticky', top: '16px', borderLeft: '3px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 2px', fontSize: '1rem', color: 'var(--text-primary-dark)', fontWeight: 700 }}>{selected.name}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>Applied for: {selected.jobTitle}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary-dark)' }}>✕</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '0.82rem' }}>
              <tbody>
                {[
                  ['Phone', selected.phone],
                  ['Email', selected.email ?? '—'],
                  ['Applied', new Date(selected.createdAt).toLocaleString()],
                  ...(selected.reviewedAt ? [['Reviewed', new Date(selected.reviewedAt).toLocaleString()]] : []),
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--border-dark)' }}>
                    <td style={{ padding: '6px 0', color: 'var(--text-secondary-dark)', width: '90px', fontWeight: 600 }}>{k}</td>
                    <td style={{ padding: '6px 0', color: 'var(--text-primary-dark)' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selected.resumeUrl && (
              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => void handleOpenResume(selected)}>
                  Open Resume{selected.resumeFileName ? `: ${selected.resumeFileName}` : ''}
                </button>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
                  Stored URL: {selected.resumeUrl}
                </div>
                {selected.resumeMimeType && selected.resumeSizeBytes !== undefined && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
                    {selected.resumeMimeType} · {Math.max(1, Math.round(selected.resumeSizeBytes / 1024))} KB
                  </div>
                )}
              </div>
            )}

            {selected.coverLetter && (
              <div style={{ background: 'var(--panel-soft-bg)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.84rem', color: 'var(--text-primary-dark)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-secondary-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cover Letter</p>
                {selected.coverLetter}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Decision</label>
                <select className="form-input" value={editStatus} onChange={(e) => setEditStatus(e.target.value as ApplicationStatus)}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Internal Notes</label>
                <textarea
                  className="form-input"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes for internal review…"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Decision'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
