import React, { useCallback, useEffect, useState } from 'react'
import { backendApi, JobPostingApi, JobType } from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'contract', label: 'Contract' },
]

const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  volunteer: 'Volunteer',
  contract: 'Contract',
}

type FormMode = 'list' | 'create' | 'edit'

const BLANK_FORM = { title: '', description: '', requirements: '', location: '', type: 'full_time' as JobType, expiresAt: '' }

export function JobPostingsPage() {
  const { addToast } = useToast()
  const [jobs, setJobs] = useState<JobPostingApi[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<FormMode>('list')
  const [form, setForm] = useState(BLANK_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await backendApi.listJobPostings()
      setJobs(res.items)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load job postings', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { loadJobs() }, [loadJobs])

  const openCreate = () => {
    setForm(BLANK_FORM)
    setEditId(null)
    setMode('create')
  }

  const openEdit = (job: JobPostingApi) => {
    setForm({
      title: job.title,
      description: job.description,
      requirements: job.requirements ?? '',
      location: job.location ?? '',
      type: job.type,
      expiresAt: job.expiresAt ? job.expiresAt.slice(0, 10) : '',
    })
    setEditId(job.id)
    setMode('edit')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) {
      addToast('Title and description are required', 'warning')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        requirements: form.requirements.trim() || undefined,
        location: form.location.trim() || undefined,
        type: form.type,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      }
      if (mode === 'create') {
        const created = await backendApi.createJobPosting(payload)
        setJobs((prev) => [created, ...prev])
        addToast('Job posting created', 'success')
      } else if (editId) {
        const updated = await backendApi.updateJobPosting(editId, payload)
        setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
        addToast('Job posting updated', 'success')
      }
      setMode('list')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (job: JobPostingApi) => {
    try {
      const updated = await backendApi.updateJobPosting(job.id, { isActive: !job.isActive })
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
      addToast(`Posting ${updated.isActive ? 'activated' : 'deactivated'}`, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Update failed', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this job posting? All associated applications will also be removed.')) return
    setDeleting(id)
    try {
      await backendApi.deleteJobPosting(id)
      setJobs((prev) => prev.filter((j) => j.id !== id))
      addToast('Posting deleted', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Delete failed', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const activeCount = jobs.filter((job) => job.isActive).length
  const inactiveCount = jobs.length - activeCount

  if (mode !== 'list') {
    return (
      <div className="animate-slide-up" style={{ maxWidth: '920px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setMode('list')}>← Back</button>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>
            {mode === 'create' ? 'New Job Posting' : 'Edit Job Posting'}
          </h2>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--primary)' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
                Title <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input className="form-input" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Community Outreach Coordinator" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Employment Type</label>
                <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as JobType })}>
                  {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Location</label>
                <input className="form-input" type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Abu Dhabi / Remote" />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
                Description <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Role overview, responsibilities…" required style={{ resize: 'vertical' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Requirements</label>
              <textarea className="form-input" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={3} placeholder="Qualifications, skills needed…" style={{ resize: 'vertical' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Closing Date (optional)</label>
              <input className="form-input" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : mode === 'create' ? 'Create Posting' : 'Save Changes'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setMode('list')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Job Postings</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>Manage positions listed on the public jobs page.</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{jobs.length}</span>Total
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{activeCount}</span>Active
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{inactiveCount}</span>Inactive
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={loadJobs} disabled={loading}>Refresh</button>
          <button className="btn btn-primary" onClick={openCreate}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Posting</button>
        </div>
      </div>

      {loading && <div style={{ color: 'var(--text-secondary-dark)', padding: '20px' }}>Loading…</div>}
      {!loading && jobs.length === 0 && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>
          No job postings yet. Create the first one!
        </div>
      )}
      {!loading && jobs.length > 0 && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th>Dates</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td style={{ fontWeight: 600 }}>{job.title}</td>
                  <td>{JOB_TYPE_LABELS[job.type]}</td>
                  <td>{job.location || '—'}</td>
                  <td>
                    <span className={`badge ${job.isActive ? 'badge-success' : 'badge-error'}`}>
                      {job.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                    Created {new Date(job.createdAt).toLocaleDateString()}
                    {job.expiresAt && <div>Closes {new Date(job.expiresAt).toLocaleDateString()}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 12px' }} onClick={() => handleToggleActive(job)}>
                        {job.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 12px' }} onClick={() => openEdit(job)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '5px 12px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                        onClick={() => handleDelete(job.id)}
                        disabled={deleting === job.id}
                      >
                        {deleting === job.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
