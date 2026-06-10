import { useCallback, useEffect, useState } from 'react'
import { backendApi, ApplicationStatus, JobApplicationApi, JobApplicationActivityApi } from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'
import { useEnumOptions } from '../../hooks/useEnumOptions'

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  new: 'badge-info',
  under_review: 'badge-warning',
  shortlisted: 'badge-info',
  rejected: 'badge-error',
  accepted: 'badge-success',
}

function describeActivity(
  activity: JobApplicationActivityApi,
  statusLabel: (value: string) => string,
  activityLabel: (value: string) => string,
): string {
  if (activity.action === 'submitted') {
    return `Application received${activity.toStatus ? ` (${statusLabel(activity.toStatus)})` : ''}`
  }
  if (activity.action === 'status_changed') {
    const from = activity.fromStatus ? statusLabel(activity.fromStatus) : '—'
    const to = activity.toStatus ? statusLabel(activity.toStatus) : '—'
    return `${from} → ${to}`
  }
  if (activity.action === 'note_updated') {
    return activity.comment ? activityLabel(activity.action) : 'Notes cleared'
  }
  return activity.comment ?? activityLabel(activity.action)
}

export function JobApplicationsPage() {
  const { addToast } = useToast()
  const { options: statusOptions, labelByValue: statusLabel } = useEnumOptions('job_application_status')
  const { labelByValue: activityLabel } = useEnumOptions('job_application_activity')
  const [applications, setApplications] = useState<JobApplicationApi[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<JobApplicationApi | null>(null)
  const [activities, setActivities] = useState<JobApplicationActivityApi[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [editStatus, setEditStatus] = useState<ApplicationStatus>('new')
  const [editNotes, setEditNotes] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
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

  const loadActivities = useCallback(async (applicationId: string) => {
    setActivitiesLoading(true)
    try {
      const res = await backendApi.listJobApplicationActivities(applicationId)
      setActivities(res.items)
    } catch {
      setActivities([])
    } finally {
      setActivitiesLoading(false)
    }
  }, [])

  useEffect(() => { void loadApplications() }, [loadApplications])

  useEffect(() => {
    if (selected) {
      void loadActivities(selected.id)
    } else {
      setActivities([])
    }
  }, [selected, loadActivities])

  const filtered = filterStatus ? applications.filter((a) => a.status === filterStatus) : applications

  const openApplication = (app: JobApplicationApi) => {
    setSelected(app)
    setEditStatus(app.status)
    setEditNotes(app.notes ?? '')
    setFollowUpNote('')
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await backendApi.updateJobApplication(selected.id, {
        status: editStatus,
        notes: editNotes,
        followUpNote: followUpNote.trim() || undefined,
      })
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setSelected(updated)
      setFollowUpNote('')
      await loadActivities(updated.id)
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
      <PageHeader
        icon="📄"
        title="Job Applications"
        subtitle="Review applications and track each candidate's progress through the hiring pipeline."
        stats={[
          { label: 'Total', value: applications.length, variant: 'info' },
          { label: 'New', value: newCount, variant: 'info' },
          { label: 'Under Review', value: underReviewCount, variant: 'warning' },
        ]}
        actions={
          <button className="btn btn-secondary" onClick={() => void loadApplications()} disabled={loading}>Refresh</button>
        }
      />

      <div className="glass-panel list-toolbar" style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)' }}>Status</label>
        <div style={{ width: '240px', maxWidth: '100%' }}>
          <select
            className="form-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0,1fr) 420px' : '1fr', gap: '16px', alignItems: 'start' }}>
        <div>
          {loading && <div className="loading-state">Loading applications…</div>}
          {!loading && filtered.length === 0 && (
            <EmptyState title="No applications found" />
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
                          <span className={`badge ${STATUS_BADGE[app.status]}`}>
                            {statusLabel(app.status)}
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
          <div className="glass-panel" style={{ padding: '20px', position: 'sticky', top: '16px', borderLeft: '3px solid var(--primary)', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
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
                  ['Current status', statusLabel(selected.status)],
                  ...(selected.reviewedAt ? [['Last reviewed', new Date(selected.reviewedAt).toLocaleString()]] : []),
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--border-dark)' }}>
                    <td style={{ padding: '6px 0', color: 'var(--text-secondary-dark)', width: '110px', fontWeight: 600 }}>{k}</td>
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
                {selected.resumeMimeType && selected.resumeSizeBytes !== undefined && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
                    {selected.resumeMimeType} · {Math.max(1, Math.round(selected.resumeSizeBytes / 1024))} KB
                  </div>
                )}
              </div>
            )}

            {selected.coverLetter && (
              <div style={{ background: 'var(--panel-soft-bg)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.84rem', color: 'var(--text-primary-dark)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
                <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-secondary-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cover Letter</p>
                {selected.coverLetter}
              </div>
            )}

            {/* Activity timeline */}
            <div style={{ marginBottom: '18px' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-secondary-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Application Timeline
              </p>
              {activitiesLoading ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>Loading timeline…</div>
              ) : activities.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', padding: '12px', background: 'var(--panel-soft-bg)', borderRadius: '8px' }}>
                  No activity recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative', paddingLeft: '14px', borderLeft: '2px solid var(--border-dark)' }}>
                  {activities.map((activity, idx) => (
                    <div key={activity.id} style={{ position: 'relative', paddingBottom: idx < activities.length - 1 ? '14px' : 0 }}>
                      <div style={{
                        position: 'absolute', left: '-21px', top: '4px', width: '10px', height: '10px',
                        borderRadius: '50%', background: activity.action === 'status_changed' ? 'var(--primary)' : 'var(--border-dark)',
                        border: '2px solid var(--glass-bg)',
                      }} />
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary-dark)' }}>
                        {activityLabel(activity.action)}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary-dark)', marginTop: '2px' }}>
                        {describeActivity(activity, statusLabel, activityLabel)}
                      </div>
                      {activity.comment && activity.action !== 'note_updated' && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                          {activity.comment}
                        </div>
                      )}
                      {activity.comment && activity.action === 'note_updated' && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)', marginTop: '4px', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                          &ldquo;{activity.comment.length > 120 ? `${activity.comment.slice(0, 120)}…` : activity.comment}&rdquo;
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary-dark)', marginTop: '4px' }}>
                        {new Date(activity.createdAt).toLocaleString()}
                        {activity.actorLabel ? ` · ${activity.actorLabel}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-dark)', paddingTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Update Status</label>
                <select className="form-input" value={editStatus} onChange={(e) => setEditStatus(e.target.value as ApplicationStatus)}>
                  {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Internal Notes</label>
                <textarea
                  className="form-input"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Summary notes for the team…"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Add Follow-up to Timeline</label>
                <textarea
                  className="form-input"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Called candidate, scheduled interview for next week…"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Updating…' : 'Update'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
