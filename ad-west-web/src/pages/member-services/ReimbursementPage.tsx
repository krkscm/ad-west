import React, { useCallback, useEffect, useState } from 'react'
import { backendApi, ReimbursementApi, ReimbursementCategory, ReimbursementStatus } from '../../utils/backendApi'
import { useAuth } from '../../context/auth-context'
import { useToast } from '../../components/common/Toast'
import { SwitchToggle } from '../../components/common/SwitchToggle'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { FileUploadZone } from '../../components/common/FileUploadZone'

const CATEGORY_LABELS: Record<ReimbursementCategory, string> = {
  travel: 'Travel',
  food: 'Food & Meals',
  accommodation: 'Accommodation',
  event_supplies: 'Event Supplies',
  printing: 'Printing',
  other: 'Other',
}

const STATUS_COLORS: Record<ReimbursementStatus, string> = {
  draft:          'var(--text-secondary-dark)',
  submitted:      'var(--warning)',
  pending_review: 'var(--warning)',
  approved:       'var(--success)',
  rejected:       'var(--error)',
}

const STATUS_LABELS: Record<ReimbursementStatus, string> = {
  draft:          'Draft',
  submitted:      'Submitted',
  pending_review: 'Pending Review',
  approved:       'Approved',
  rejected:       'Rejected',
}

type Mode = 'list' | 'create'

const BLANK = { category: 'other' as ReimbursementCategory, description: '', amount: '', currency: 'AED', asDraft: false }
const MAX_RECEIPT_BYTES = 500 * 1024
const ALLOWED_RECEIPT_EXT = ['.jpg', '.jpeg', '.png', '.pdf']

export function ReimbursementPage() {
  const { adminUser } = useAuth()
  const { addToast } = useToast()
  const confirm = useConfirm()
  const isSuperAdmin = adminUser?.roles?.some((r: any) => r.role === 'SUPER_ADMIN') ?? false

  const [items, setItems] = useState<ReimbursementApi[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<ReimbursementApi | null>(null)
  const [form, setForm] = useState(BLANK)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptError, setReceiptError] = useState('')
  const [saving, setSaving] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<ReimbursementStatus>('approved')
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = isSuperAdmin
        ? await backendApi.listReimbursements({ status: filterStatus || undefined })
        : await backendApi.listMyReimbursements()
      setItems(res.items)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, isSuperAdmin, addToast])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim() || !form.amount) return
    if (!receiptFile) { setReceiptError('A receipt or proof of payment is required.'); return }
    if (receiptError) return
    setSaving(true)
    try {
      await backendApi.createReimbursement({ category: form.category, description: form.description, amount: parseFloat(form.amount), currency: form.currency, asDraft: form.asDraft, receiptFile: receiptFile ?? undefined })
      addToast('Reimbursement request created', 'success')
      setMode('list')
      setForm(BLANK)
      setReceiptFile(null)
      setReceiptError('')
      load()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitRequest = async (id: string) => {
    try {
      const updated = await backendApi.submitReimbursement(id)
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setSelected(updated)
      addToast('Request submitted for review', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to submit', 'error')
    }
  }

  const handleReview = async () => {
    if (!selected) return
    setReviewing(true)
    try {
      const updated = await backendApi.reviewReimbursement(selected.id, { status: reviewStatus, reviewerNotes: reviewNotes })
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setSelected(updated)
      addToast('Review saved', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to review', 'error')
    } finally {
      setReviewing(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Delete Request', message: 'Delete this reimbursement request? This cannot be undone.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try {
      await backendApi.deleteReimbursement(id)
      setItems((prev) => prev.filter((r) => r.id !== id))
      if (selected?.id === id) setSelected(null)
      addToast('Deleted', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    }
  }

  const submittedCount = items.filter((r) => r.status === 'submitted' || r.status === 'pending_review').length
  const approvedCount = items.filter((r) => r.status === 'approved').length

  if (mode === 'create') {
    return (
      <div className="animate-slide-up" style={{ maxWidth: '680px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={() => { setMode('list'); setForm(BLANK) }}>← Back</button>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>New Reimbursement Request</h2>
        </div>
        <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--primary)' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Category</label>
                <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ReimbursementCategory })}>
                  {(Object.entries(CATEGORY_LABELS) as [ReimbursementCategory, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Amount <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input className="form-input" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Currency</label>
                  <select className="form-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                    <option>AED</option><option>USD</option><option>INR</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Description <span style={{ color: 'var(--error)' }}>*</span></label>
              <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the expense and purpose…" rows={4} required style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
                Receipt / Proof of Payment <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <FileUploadZone
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                maxBytes={MAX_RECEIPT_BYTES}
                allowedExtensions={ALLOWED_RECEIPT_EXT}
                hint="JPG, PNG or PDF · Max 500 KB · Required"
                file={receiptFile}
                error={receiptError}
                onChange={(f, err) => { setReceiptFile(f); setReceiptError(err ?? '') }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Submission Mode</label>
              <SwitchToggle
                checked={form.asDraft}
                onChange={(v) => setForm({ ...form, asDraft: v })}
                labelOn="Save as draft — submit for review later"
                labelOff="Submit immediately for review"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create Request'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setMode('list'); setForm(BLANK) }}>Cancel</button>
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
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Reimbursements</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>Raise and track expense reimbursement requests.</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{items.length}</span>Total
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{submittedCount}</span>Pending
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{approvedCount}</span>Approved
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>Refresh</button>
          <button className="btn btn-primary" onClick={() => { setMode('create'); setSelected(null) }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Request</button>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)' }}>Status</label>
          <div style={{ width: '220px', maxWidth: '100%' }}>
            <select className="form-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ marginBottom: 0 }}>
              <option value="">All Statuses</option>
              {(Object.entries(STATUS_LABELS) as [ReimbursementStatus, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0,1fr) 360px' : '1fr', gap: '16px', alignItems: 'start' }}>
        <div>
          {loading && <div style={{ color: 'var(--text-secondary-dark)', padding: '20px' }}>Loading…</div>}
          {!loading && items.length === 0 && (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>
              No reimbursement requests found.
            </div>
          )}
          {!loading && items.length > 0 && (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const isActive = selected?.id === r.id
                    return (
                      <tr key={r.id} onClick={() => { setSelected(r); setReviewStatus('approved'); setReviewNotes(r.reviewerNotes ?? '') }} style={{ cursor: 'pointer', background: isActive ? 'var(--primary-light)' : 'transparent' }}>
                        <td style={{ fontWeight: 600 }}>{CATEGORY_LABELS[r.category] ?? r.category}</td>
                        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                        <td style={{ fontWeight: 700 }}>
                          {r.currency} {Number(r.amount).toFixed(2)}
                          {r.receiptUrl && <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: 'var(--primary)' }}>📎</span>}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: STATUS_COLORS[r.status], background: `${STATUS_COLORS[r.status]}18`, borderRadius: '20px', padding: '2px 8px' }}>
                            {STATUS_LABELS[r.status]}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {r.status === 'draft' && (
                              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 10px' }} onClick={() => handleSubmitRequest(r.id)}>Submit</button>
                            )}
                            {(r.status === 'draft' || isSuperAdmin) && (
                              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 10px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDelete(r.id)}>Delete</button>
                            )}
                          </div>
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
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{CATEGORY_LABELS[selected.category]}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary-dark)' }}>✕</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '0.82rem' }}>
              <tbody>
                {[
                  ['Amount', `${selected.currency} ${Number(selected.amount).toFixed(2)}`],
                  ['Status', STATUS_LABELS[selected.status]],
                  ['Submitted', new Date(selected.createdAt).toLocaleString()],
                  ...(selected.reviewedAt ? [['Reviewed', new Date(selected.reviewedAt).toLocaleString()]] : []),
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--border-dark)' }}>
                    <td style={{ padding: '6px 0', color: 'var(--text-secondary-dark)', width: '80px', fontWeight: 600 }}>{k}</td>
                    <td style={{ padding: '6px 0' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ background: 'var(--panel-soft-bg)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {selected.description}
            </div>
            {selected.receiptUrl && (
              <div style={{ marginBottom: '12px' }}>
                <a
                  href={selected.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  View Receipt {selected.receiptOriginalName ? `(${selected.receiptOriginalName})` : ''}
                </a>
              </div>
            )}
            {selected.reviewerNotes && (
              <div style={{ background: 'var(--panel-soft-bg)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                <strong>Reviewer note:</strong> {selected.reviewerNotes}
              </div>
            )}
            {isSuperAdmin && ['submitted', 'pending_review'].includes(selected.status) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Decision</label>
                  <select className="form-input" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as ReimbursementStatus)}>
                    <option value="pending_review">Mark Pending Review</option>
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Notes</label>
                  <textarea className="form-input" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
                </div>
                <button className="btn btn-primary" onClick={handleReview} disabled={reviewing}>{reviewing ? 'Saving…' : 'Save Review'}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
