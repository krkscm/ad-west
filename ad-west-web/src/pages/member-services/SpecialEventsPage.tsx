import React, { useCallback, useEffect, useState } from 'react'
import { backendApi, EventFormFieldApi, EventRegistrationApi, FormFieldType, SpecialEventApi } from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'
import { SwitchToggle } from '../../components/common/SwitchToggle'
import { DateRangePicker } from '../../components/common/DateTimePicker'

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Text', number: 'Number', email: 'Email', phone: 'Phone',
  date: 'Date', select: 'Dropdown', checkbox: 'Checkbox', textarea: 'Long Text',
}

type Mode = 'list' | 'create' | 'edit' | 'registrations'

const BLANK_FORM = {
  title: '', description: '', dateTime: '', endDateTime: '', venue: '',
  isPublic: false, registrationEnabled: false,
  sreniIds: [] as string[], formFields: [] as Omit<EventFormFieldApi, 'id' | 'eventId'>[],
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' })
}

export function SpecialEventsPage() {
  const { addToast } = useToast()
  const [events, setEvents] = useState<SpecialEventApi[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [allSrenis, setAllSrenis] = useState<{ id: string; name: string }[]>([])
  const [viewingEvent, setViewingEvent] = useState<SpecialEventApi | null>(null)
  const [registrations, setRegistrations] = useState<EventRegistrationApi[]>([])
  const [regLoading, setRegLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [evRes, srRes] = await Promise.all([backendApi.listSpecialEvents(), backendApi.listSrenies()])
      setEvents(evRes.items)
      setAllSrenis(srRes.map((s: any) => ({ id: s.id, name: s.name })))
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load events', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(BLANK_FORM); setEditId(null); setMode('create') }

  const openEdit = (ev: SpecialEventApi) => {
    setForm({
      title: ev.title, description: ev.description ?? '', dateTime: ev.dateTime.slice(0, 16),
      endDateTime: ev.endDateTime?.slice(0, 16) ?? '', venue: ev.venue ?? '',
      isPublic: ev.isPublic, registrationEnabled: ev.registrationEnabled,
      sreniIds: [...ev.sreniIds],
      formFields: ev.formFields.map((f) => ({ fieldType: f.fieldType, label: f.label, placeholder: f.placeholder, options: f.options, isRequired: f.isRequired, sortOrder: f.sortOrder })),
    })
    setEditId(ev.id)
    setMode('edit')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.dateTime) { addToast('Title and date/time are required', 'warning'); return }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(), description: form.description.trim() || undefined,
        dateTime: new Date(form.dateTime).toISOString(),
        endDateTime: form.endDateTime ? new Date(form.endDateTime).toISOString() : undefined,
        venue: form.venue.trim() || undefined, isPublic: form.isPublic,
        registrationEnabled: form.registrationEnabled, sreniIds: form.sreniIds,
        formFields: form.registrationEnabled ? form.formFields : [],
      }
      if (mode === 'create') {
        const created = await backendApi.createSpecialEvent(payload as any)
        setEvents((prev) => [created, ...prev])
        addToast('Event created', 'success')
      } else if (editId) {
        const updated = await backendApi.updateSpecialEvent(editId, payload)
        setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)))
        addToast('Event updated', 'success')
      }
      setMode('list')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event? All registrations will be removed.')) return
    try {
      await backendApi.deleteSpecialEvent(id)
      setEvents((prev) => prev.filter((ev) => ev.id !== id))
      addToast('Event deleted', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    }
  }

  const openRegistrations = async (ev: SpecialEventApi) => {
    setViewingEvent(ev); setRegLoading(true); setMode('registrations')
    try {
      const res = await backendApi.listEventRegistrations(ev.id)
      setRegistrations(res.items)
    } catch { addToast('Failed to load registrations', 'error') }
    finally { setRegLoading(false) }
  }

  const toggleSreni = (id: string) =>
    setForm((f) => ({ ...f, sreniIds: f.sreniIds.includes(id) ? f.sreniIds.filter((s) => s !== id) : [...f.sreniIds, id] }))

  const addField = () =>
    setForm((f) => ({ ...f, formFields: [...f.formFields, { fieldType: 'text', label: '', placeholder: '', options: [], isRequired: false, sortOrder: f.formFields.length }] }))

  const updateField = (i: number, patch: Partial<Omit<EventFormFieldApi, 'id' | 'eventId'>>) =>
    setForm((f) => ({ ...f, formFields: f.formFields.map((field, idx) => idx === i ? { ...field, ...patch } : field) }))

  const removeField = (i: number) =>
    setForm((f) => ({ ...f, formFields: f.formFields.filter((_, idx) => idx !== i) }))

  const upcomingCount = events.filter((ev) => new Date(ev.dateTime) >= new Date()).length

  if (mode === 'registrations' && viewingEvent) {
    return (
      <div className="animate-slide-up" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setMode('list')}>← Back</button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>Registrations — {viewingEvent.title}</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary-dark)', fontSize: '0.88rem' }}>{fmt(viewingEvent.dateTime)}</p>
          </div>
        </div>
        {regLoading && <div style={{ color: 'var(--text-secondary-dark)', padding: '20px' }}>Loading…</div>}
        {!regLoading && registrations.length === 0 && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>No registrations yet.</div>
        )}
        {!regLoading && registrations.length > 0 && (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>#</th>
                  {Object.keys(registrations[0]?.formData ?? {}).map((k) => <th key={k}>{k}</th>)}
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg, i) => (
                  <tr key={reg.id}>
                    <td style={{ color: 'var(--text-secondary-dark)' }}>{i + 1}</td>
                    {Object.values(reg.formData).map((v, j) => <td key={j}>{String(v)}</td>)}
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>{new Date(reg.submittedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="animate-slide-up" style={{ maxWidth: '860px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setMode('list')}>← Back</button>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800 }}>
            {mode === 'create' ? 'Create Special Event' : 'Edit Event'}
          </h2>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Event details */}
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary-dark)' }}>Event Details</p>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Title <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="form-input" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Description</label>
              <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ resize: 'vertical' }} placeholder="Describe the event…" />
            </div>
            <DateRangePicker
              startValue={form.dateTime}
              endValue={form.endDateTime}
              onStartChange={(v) => setForm({ ...form, dateTime: v })}
              onEndChange={(v) => setForm({ ...form, endDateTime: v })}
              startRequired
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Venue</label>
              <input className="form-input" type="text" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Venue or location" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Visibility</label>
                <SwitchToggle
                  checked={form.isPublic}
                  onChange={(v) => setForm({ ...form, isPublic: v })}
                  labelOn="Public event"
                  labelOff="Private event"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Registration</label>
                <SwitchToggle
                  checked={form.registrationEnabled}
                  onChange={(v) => setForm({ ...form, registrationEnabled: v })}
                  labelOn="Registration open"
                  labelOff="Registration disabled"
                />
              </div>
            </div>
          </div>

          {/* Sreni selector */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary-dark)' }}>Add to Sreni Calendars</p>
            {allSrenis.length === 0
              ? <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>No srenis configured.</p>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
                  {allSrenis.map((s) => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', padding: '8px 12px', border: '1px solid var(--border-dark)', borderRadius: '8px', background: form.sreniIds.includes(s.id) ? 'var(--primary-light)' : 'transparent' }}>
                      <input type="checkbox" checked={form.sreniIds.includes(s.id)} onChange={() => toggleSreni(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
            }
          </div>

          {/* Form builder */}
          {form.registrationEnabled && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary-dark)' }}>Registration Form Fields</p>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 12px' }} onClick={addField}>+ Add Field</button>
              </div>
              {form.formFields.length === 0 && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>No fields yet. Click "Add Field" to build the registration form.</p>}
              {form.formFields.length > 0 && (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Label</th>
                        <th>Placeholder</th>
                        <th>Required</th>
                        <th style={{ textAlign: 'right' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.formFields.map((f, i) => (
                        <tr key={i}>
                          <td>
                            <select className="form-input" value={f.fieldType} onChange={(e) => updateField(i, { fieldType: e.target.value as FormFieldType })} style={{ marginBottom: 0, minWidth: '110px' }}>
                              {(Object.entries(FIELD_TYPE_LABELS) as [FormFieldType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </td>
                          <td>
                            <input className="form-input" type="text" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="Label" style={{ marginBottom: 0 }} />
                          </td>
                          <td>
                            {f.fieldType === 'select'
                              ? <input className="form-input" type="text" value={(f.options ?? []).join(', ')} onChange={(e) => updateField(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })} placeholder="Option 1, Option 2" style={{ marginBottom: 0 }} />
                              : <input className="form-input" type="text" value={f.placeholder ?? ''} onChange={(e) => updateField(i, { placeholder: e.target.value })} placeholder="Optional" style={{ marginBottom: 0 }} />
                            }
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input type="checkbox" checked={f.isRequired} onChange={(e) => updateField(i, { isRequired: e.target.checked })} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 10px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => removeField(i)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : mode === 'create' ? 'Create Event' : 'Save Changes'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode('list')}>Cancel</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Special Events</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>Create events and publish them to Sreni calendars.</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{events.length}</span>Total
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{upcomingCount}</span>Upcoming
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>Refresh</button>
          <button className="btn btn-primary" onClick={openCreate}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Create Event</button>
        </div>
      </div>

      {loading && <div style={{ color: 'var(--text-secondary-dark)', padding: '20px' }}>Loading…</div>}
      {!loading && events.length === 0 && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>
          No special events yet. Create the first one!
        </div>
      )}
      {!loading && events.length > 0 && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date &amp; Time</th>
                <th>Venue</th>
                <th>Srenis</th>
                <th>Flags</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 600 }}>{ev.title}</td>
                  <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {fmt(ev.dateTime)}
                    {ev.endDateTime && <div style={{ color: 'var(--text-secondary-dark)' }}>→ {fmt(ev.endDateTime)}</div>}
                  </td>
                  <td>{ev.venue || '—'}</td>
                  <td>{ev.sreniIds.length > 0 ? `${ev.sreniIds.length} sreni${ev.sreniIds.length > 1 ? 's' : ''}` : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {ev.isPublic && <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Public</span>}
                      {ev.registrationEnabled && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Registration</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {ev.registrationEnabled && (
                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 10px' }} onClick={() => openRegistrations(ev)}>Registrations</button>
                      )}
                      <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 10px' }} onClick={() => openEdit(ev)}>Edit</button>
                      <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 10px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDelete(ev.id)}>Delete</button>
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
