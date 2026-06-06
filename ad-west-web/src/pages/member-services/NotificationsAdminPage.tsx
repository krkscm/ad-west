import React, { useCallback, useEffect, useState } from 'react'
import { AppNotificationApi, NotificationTarget, backendApi } from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { DateTimePicker } from '../../components/common/DateTimePicker'
import { useEnumOptions } from '../../hooks/useEnumOptions'

type Mode = 'list' | 'create' | 'edit'

const BLANK = { title: '', message: '', validFrom: '', validTo: '', target: 'all' as NotificationTarget }

function isLive(n: AppNotificationApi) {
  const now = new Date().toISOString()
  return n.isActive && n.validFrom <= now && n.validTo >= now
}

export function NotificationsAdminPage() {
  const { addToast } = useToast()
  const confirm = useConfirm()
  const { options: targetOptions, labelByValue: targetLabel } = useEnumOptions('notification_target')
  const [items, setItems] = useState<AppNotificationApi[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await backendApi.listNotifications()
      setItems(res.items)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load notifications', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(BLANK); setEditId(null); setMode('create') }

  const openEdit = (n: AppNotificationApi) => {
    setForm({ title: n.title, message: n.message, validFrom: n.validFrom.slice(0, 16), validTo: n.validTo.slice(0, 16), target: n.target })
    setEditId(n.id)
    setMode('edit')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim() || !form.validTo) {
      addToast('Title, message, and valid-to date are required', 'warning')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(), message: form.message.trim(),
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
        validTo: new Date(form.validTo).toISOString(), target: form.target,
      }
      if (mode === 'create') {
        const created = await backendApi.createNotification(payload)
        setItems((prev) => [created, ...prev])
        addToast('Notification created', 'success')
      } else if (editId) {
        const updated = await backendApi.updateNotification(editId, payload)
        setItems((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
        addToast('Notification updated', 'success')
      }
      setMode('list')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (n: AppNotificationApi) => {
    try {
      const updated = await backendApi.updateNotification(n.id, { isActive: !n.isActive })
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      addToast(n.isActive ? 'Deactivated' : 'Activated', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Delete Notification', message: 'Delete this notification? It will stop showing to users immediately.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try {
      await backendApi.deleteNotification(id)
      setItems((prev) => prev.filter((n) => n.id !== id))
      addToast('Deleted', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    }
  }

  const activeCount = items.filter(isLive).length

  if (mode !== 'list') {
    return (
      <div className="animate-slide-up" style={{ maxWidth: '920px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setMode('list')}>← Back</button>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>
            {mode === 'create' ? 'New Notification' : 'Edit Notification'}
          </h2>
        </div>
        <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--primary)' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Title <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="form-input" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Notification title" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Message <span style={{ color: 'var(--error)' }}>*</span></label>
              <textarea className="form-input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Full notification message…" rows={5} required style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
              <DateTimePicker
                value={form.validFrom}
                onChange={(v) => setForm({ ...form, validFrom: v })}
                label="Valid From"
              />
              <DateTimePicker
                value={form.validTo}
                onChange={(v) => setForm({ ...form, validTo: v })}
                label="Valid To"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Target Audience</label>
              <select className="form-input" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as NotificationTarget })}>
                {targetOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="notification-form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : mode === 'create' ? 'Create Notification' : 'Save Changes'}</button>
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
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Notifications</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>Manage announcements shown to users on login.</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{items.length}</span>Total
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{activeCount}</span>Live Now
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>Refresh</button>
          <button className="btn btn-primary" onClick={openCreate}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Notification</button>
        </div>
      </div>

      {loading && <div style={{ color: 'var(--text-secondary-dark)', padding: '20px' }}>Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>
          No notifications yet. Create one to display it on user login.
        </div>
      )}
      {!loading && items.length > 0 && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Target</th>
                <th>Valid Period</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => {
                const live = isLive(n)
                return (
                  <tr key={n.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)', marginTop: '2px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                    </td>
                    <td>{targetLabel(n.target)}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>
                      {new Date(n.validFrom).toLocaleDateString('en-AE')}
                      <span style={{ margin: '0 4px' }}>→</span>
                      {new Date(n.validTo).toLocaleDateString('en-AE')}
                    </td>
                    <td>
                      <span className={`badge ${live ? 'badge-success' : 'badge-info'}`}>
                        {live ? 'Live' : n.isActive ? 'Scheduled / Expired' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 10px' }} onClick={() => handleToggle(n)}>
                          {n.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 10px' }} onClick={() => openEdit(n)}>Edit</button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 10px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDelete(n.id)}>Delete</button>
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
  )
}
