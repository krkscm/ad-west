import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { backendApi, JobPostingApi, JobType } from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { DateField } from '../../components/common/DateFields'
import { PageHeader } from '../../components/common/PageHeader'
import { FormSection } from '../../components/common/FormSection'
import { FormActions } from '../../components/common/FormActions'
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu'
import { EmptyState } from '../../components/common/EmptyState'
import { useEnumOptions } from '../../hooks/useEnumOptions'
import { TableColumnFilterRow, type TableColumnFilterDef } from '../../components/common/TableColumnFilterRow'
import { TableColumnHeaderRow } from '../../components/common/TableColumnHeaderRow'
import { TableNoResultsRow } from '../../components/common/TableNoResultsRow'
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters'
import { useTableSort } from '../../hooks/useTableSort'
import { applyClientColumnFilters, type ClientFilterAccessor } from '../../utils/clientTableFilter'
import { applyClientColumnSort } from '../../utils/clientTableSort'
import { isListFilterActive } from '../../utils/tableListUtils'

type FormMode = 'list' | 'create' | 'edit'

const BLANK_FORM = { title: '', description: '', requirements: '', location: '', type: 'full_time' as JobType, expiresAt: '' }

export function JobPostingsPage() {
  const { addToast } = useToast()
  const confirm = useConfirm()
  const { options: jobTypeOptions, labelByValue: jobTypeLabel } = useEnumOptions('job_posting_type')
  const [jobs, setJobs] = useState<JobPostingApi[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<FormMode>('list')
  const [form, setForm] = useState(BLANK_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { filters, debouncedFilters, setFilter, clearFilters } = useTableColumnFilters()
  const { sortBy, sortDir, toggleSort, clearSort } = useTableSort()

  const filterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'title', label: 'Title', filterable: true, placeholder: 'Title…' },
    {
      key: 'type',
      label: 'Type',
      filterable: true,
      filterType: 'select',
      placeholder: 'All types',
      options: jobTypeOptions.map((o) => ({ value: o.value, label: o.label })),
    },
    { key: 'location', label: 'Location', filterable: true, placeholder: 'Location…' },
    {
      key: 'status',
      label: 'Status',
      filterable: true,
      filterType: 'select',
      placeholder: 'All',
      options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }],
    },
    { key: 'dates', label: 'Dates', filterable: true, placeholder: 'Dates…' },
    { key: '__actions__', label: 'Actions', filterable: false, sortable: false, align: 'right' },
  ], [jobTypeOptions])

  const accessors = useMemo<Record<string, ClientFilterAccessor<JobPostingApi>>>(() => ({
    title: { getValue: (j) => j.title },
    type: { getValue: (j) => j.type, match: 'exact' },
    location: { getValue: (j) => j.location ?? '' },
    status: { getValue: (j) => (j.isActive ? 'active' : 'inactive'), match: 'exact' },
    dates: {
      getValue: (j) => {
        const parts = [`Created ${new Date(j.createdAt).toLocaleDateString()}`]
        if (j.expiresAt) parts.push(`Closes ${new Date(j.expiresAt).toLocaleDateString()}`)
        return parts.join(' ')
      },
    },
  }), [])

  const displayedRows = useMemo(
    () => applyClientColumnSort(
      applyClientColumnFilters(jobs, debouncedFilters, accessors),
      sortBy,
      sortDir,
      accessors,
    ),
    [jobs, debouncedFilters, accessors, sortBy, sortDir],
  )
  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim())
  const hasFiltersActive = isListFilterActive(hasColumnFilters)
  const clearAllFilters = () => {
    clearFilters()
    clearSort()
  }

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
    const ok = await confirm({ title: 'Delete Job Posting', message: 'Delete this job posting? All associated applications will also be removed.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
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
        <PageHeader
          icon="💼"
          title={mode === 'create' ? 'New Job Posting' : 'Edit Job Posting'}
          actions={<button type="button" className="btn btn-secondary" onClick={() => setMode('list')}>← Back</button>}
        />

        <form onSubmit={handleSave}>
          <FormSection title="Posting Details" accent="primary">
            <div className="form-group">
              <label className="form-label">Title <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="form-input" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Community Outreach Coordinator" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Employment Type</label>
                <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as JobType })}>
                  {jobTypeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Abu Dhabi / Remote" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description <span style={{ color: 'var(--error)' }}>*</span></label>
              <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Role overview, responsibilities…" required style={{ resize: 'vertical' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Requirements</label>
              <textarea className="form-input" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={3} placeholder="Qualifications, skills needed…" style={{ resize: 'vertical' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Closing Date <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
              <DateField value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>

            <FormActions>
              <button type="button" className="btn btn-secondary" onClick={() => setMode('list')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? (mode === 'create' ? 'Creating…' : 'Updating…') : mode === 'create' ? 'Create' : 'Update'}</button>
            </FormActions>
          </FormSection>
        </form>
      </div>
    )
  }

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      <PageHeader
        icon="💼"
        title="Job Postings"
        subtitle="Manage positions listed on the public jobs page."
        stats={[
          { label: 'Total', value: jobs.length, variant: 'info' },
          { label: 'Active', value: activeCount, variant: 'success' },
          { label: 'Inactive', value: inactiveCount, variant: 'warning' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={loadJobs} disabled={loading}>Refresh</button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Posting
            </button>
          </div>
        }
      />

      {loading && <div className="loading-state">Loading job postings…</div>}
      {!loading && jobs.length === 0 && !hasFiltersActive && (
        <EmptyState
          icon="💼"
          title="No job postings yet"
          copy="Create the first posting to list it on the public jobs page."
          action={<button type="button" className="btn btn-primary" onClick={openCreate}>New Posting</button>}
        />
      )}
      {!loading && (jobs.length > 0 || hasFiltersActive) && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <TableColumnHeaderRow
                columns={filterColumns}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <TableColumnFilterRow
                columns={filterColumns}
                values={filters}
                onChange={setFilter}
                onClear={clearAllFilters}
              />
            </thead>
            <tbody>
              {displayedRows.length === 0 ? (
                <TableNoResultsRow colSpan={6} title="No postings match your filters" onClearFilters={clearAllFilters} />
              ) : displayedRows.map((job) => (
                <tr key={job.id}>
                  <td style={{ fontWeight: 600 }}>{job.title}</td>
                  <td>{jobTypeLabel(job.type)}</td>
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
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${job.title}`}
                      actions={[
                        { label: job.isActive ? 'Deactivate' : 'Activate', tone: job.isActive ? 'warning' : 'success', onClick: () => handleToggleActive(job) },
                        { label: 'Edit', onClick: () => openEdit(job) },
                        { label: deleting === job.id ? 'Deleting…' : 'Delete', tone: 'danger', onClick: () => handleDelete(job.id), disabled: deleting === job.id },
                      ]}
                    />
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
