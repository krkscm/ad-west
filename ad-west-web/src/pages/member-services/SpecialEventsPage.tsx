import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { backendApi, EventFormFieldApi, EventRegistrationApi, FormFieldType, SpecialEventApi } from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { SwitchToggle } from '../../components/common/SwitchToggle'
import { DateRangePicker } from '../../components/common/DateTimePicker'
import { PageHeader } from '../../components/common/PageHeader'
import { FormSection } from '../../components/common/FormSection'
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu'
import { FormActions } from '../../components/common/FormActions'
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
  const confirm = useConfirm()
  const { options: fieldTypeOptions } = useEnumOptions('form_field_type')
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
  const { filters: eventFilters, debouncedFilters: eventDebouncedFilters, setFilter: setEventFilter, clearFilters: clearEventFilters } = useTableColumnFilters()
  const { filters: regFilters, debouncedFilters: regDebouncedFilters, setFilter: setRegFilter, clearFilters: clearRegFilters } = useTableColumnFilters()
  const { sortBy: eventSortBy, sortDir: eventSortDir, toggleSort: toggleEventSort, clearSort: clearEventSort } = useTableSort()
  const { sortBy: regSortBy, sortDir: regSortDir, toggleSort: toggleRegSort, clearSort: clearRegSort } = useTableSort()

  const eventFilterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'title', label: 'Title', filterable: true, placeholder: 'Title…' },
    { key: 'date', label: 'Date & Time', filterable: true, placeholder: 'Date…' },
    { key: 'venue', label: 'Venue', filterable: true, placeholder: 'Venue…' },
    { key: 'flags', label: 'Flags', filterable: true, placeholder: 'Flags…' },
    { key: '__srenis__', label: 'Srenis', filterable: false, sortable: false },
    { key: '__actions__', label: 'Actions', filterable: false, sortable: false, align: 'right' },
  ], [])

  const eventAccessors = useMemo<Record<string, ClientFilterAccessor<SpecialEventApi>>>(() => ({
    title: { getValue: (ev) => ev.title },
    date: {
      getValue: (ev) => {
        const parts = [fmt(ev.dateTime)]
        if (ev.endDateTime) parts.push(fmt(ev.endDateTime))
        return parts.join(' ')
      },
    },
    venue: { getValue: (ev) => ev.venue ?? '' },
    flags: {
      getValue: (ev) => {
        const parts: string[] = []
        if (ev.isPublic) parts.push('Public')
        if (ev.registrationEnabled) parts.push('Registration')
        return parts.join(' ')
      },
    },
  }), [])

  const displayedEvents = useMemo(
    () => applyClientColumnSort(
      applyClientColumnFilters(events, eventDebouncedFilters, eventAccessors),
      eventSortBy,
      eventSortDir,
      eventAccessors,
    ),
    [events, eventDebouncedFilters, eventAccessors, eventSortBy, eventSortDir],
  )

  const regFormKeys = useMemo(
    () => (registrations.length > 0 ? Object.keys(registrations[0]?.formData ?? {}) : []),
    [registrations],
  )

  const regFilterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: '__index__', label: '#', filterable: false, sortable: false },
    ...regFormKeys.map((k) => ({ key: `form_${k}`, label: k, filterable: true as const, placeholder: `${k}…` })),
    { key: 'submitted', label: 'Submitted', filterable: true, placeholder: 'Submitted…' },
    { key: '__actions__', filterable: false, sortable: false, width: '56px' },
  ], [regFormKeys])

  const regAccessors = useMemo<Record<string, ClientFilterAccessor<EventRegistrationApi>>>(() => {
    const a: Record<string, ClientFilterAccessor<EventRegistrationApi>> = {
      submitted: { getValue: (r) => new Date(r.submittedAt).toLocaleString() },
    }
    regFormKeys.forEach((k) => {
      a[`form_${k}`] = { getValue: (r) => String(r.formData[k] ?? '') }
    })
    return a
  }, [regFormKeys])

  const displayedRegistrations = useMemo(
    () => applyClientColumnSort(
      applyClientColumnFilters(registrations, regDebouncedFilters, regAccessors),
      regSortBy,
      regSortDir,
      regAccessors,
    ),
    [registrations, regDebouncedFilters, regAccessors, regSortBy, regSortDir],
  )
  const clearAllEventFilters = () => {
    clearEventFilters()
    clearEventSort()
  }
  const clearAllRegFilters = () => {
    clearRegFilters()
    clearRegSort()
  }
  const hasEventColumnFilters = Object.values(eventDebouncedFilters).some((v) => v.trim())
  const hasEventFiltersActive = isListFilterActive(hasEventColumnFilters)
  const hasRegColumnFilters = Object.values(regDebouncedFilters).some((v) => v.trim())
  const hasRegFiltersActive = isListFilterActive(hasRegColumnFilters)
  const regTableColSpan = 2 + regFormKeys.length

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
        const updated = await backendApi.updateSpecialEvent(editId, payload as any)
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
    const ok = await confirm({ title: 'Delete Event', message: 'Delete this event? All registrations will also be removed.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
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
        <PageHeader
          icon="🗓️"
          title={`Registrations — ${viewingEvent.title}`}
          subtitle={fmt(viewingEvent.dateTime)}
          actions={<button className="btn btn-secondary" onClick={() => setMode('list')}>← Back</button>}
        />
        {regLoading && <div className="loading-state">Loading…</div>}
        {!regLoading && registrations.length === 0 && (
          <EmptyState title="No registrations yet" />
        )}
        {!regLoading && (registrations.length > 0 || hasRegFiltersActive) && (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <TableColumnHeaderRow
                  columns={regFilterColumns}
                  sortBy={regSortBy}
                  sortDir={regSortDir}
                  onSort={toggleRegSort}
                />
                <TableColumnFilterRow
                  columns={regFilterColumns}
                  values={regFilters}
                  onChange={setRegFilter}
                  onClear={clearAllRegFilters}
                />
              </thead>
              <tbody>
                {displayedRegistrations.length === 0 ? (
                  <TableNoResultsRow colSpan={regTableColSpan} title="No registrations match your filters" onClearFilters={clearAllRegFilters} />
                ) : displayedRegistrations.map((reg, i) => (
                  <tr key={reg.id}>
                    <td style={{ color: 'var(--text-secondary-dark)' }}>{i + 1}</td>
                    {regFormKeys.map((k) => <td key={k}>{String(reg.formData[k] ?? '')}</td>)}
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>{new Date(reg.submittedAt).toLocaleString()}</td>
                    <td />
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
        <PageHeader
          icon="🗓️"
          title={mode === 'create' ? 'Create Special Event' : 'Edit Event'}
          actions={<button className="btn btn-secondary" onClick={() => setMode('list')}>← Back</button>}
        />

        <form onSubmit={handleSave}>
          <div className="animate-stagger">
            <FormSection title="Event Details" accent="primary">
              <div className="form-group">
                <label className="form-label">Title <span style={{ color: 'var(--error)' }}>*</span></label>
                <input className="form-input" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ resize: 'vertical' }} placeholder="Describe the event…" />
              </div>
              <DateRangePicker
                startValue={form.dateTime}
                endValue={form.endDateTime}
                onStartChange={(v) => setForm({ ...form, dateTime: v })}
                onEndChange={(v) => setForm({ ...form, endDateTime: v })}
                startRequired
              />
              <div className="form-group">
                <label className="form-label">Venue</label>
                <input className="form-input" type="text" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Venue or location" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <SwitchToggle
                    checked={form.isPublic}
                    onChange={(v) => setForm({ ...form, isPublic: v })}
                    labelOn="Public event"
                    labelOff="Private event"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration</label>
                  <SwitchToggle
                    checked={form.registrationEnabled}
                    onChange={(v) => setForm({ ...form, registrationEnabled: v })}
                    labelOn="Registration open"
                    labelOff="Registration disabled"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Add to Sreni Calendars" accent="none">
              {allSrenis.length === 0
                ? <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>No srenis configured.</p>
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
                    {allSrenis.map((s) => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.85rem', padding: '8px 12px', border: '1px solid var(--border-dark)', borderRadius: '8px', background: form.sreniIds.includes(s.id) ? 'var(--primary-light)' : 'transparent' }}>
                        <span>{s.name}</span>
                        <SwitchToggle
                          variant="inline"
                          checked={form.sreniIds.includes(s.id)}
                          onChange={() => toggleSreni(s.id)}
                          ariaLabel={`Add event to ${s.name} calendar`}
                        />
                      </div>
                    ))}
                  </div>
              }
            </FormSection>

            {form.registrationEnabled && (
              <FormSection title="Registration Form Fields" accent="none">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addField}>+ Add Field</button>
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
                                {fieldTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                              <SwitchToggle
                                variant="inline"
                                checked={f.isRequired}
                                onChange={(isRequired) => updateField(i, { isRequired })}
                                ariaLabel={`${f.isRequired ? 'Mark' : 'Unmark'} ${f.label || 'field'} as required`}
                              />
                            </td>
                            <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                              <TableRowActionsMenu
                                ariaLabel={`Actions for field ${f.label || i + 1}`}
                                actions={[{ label: 'Remove', tone: 'danger', onClick: () => removeField(i) }]}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </FormSection>
            )}
          </div>

          <FormActions>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? (mode === 'create' ? 'Creating…' : 'Updating…') : mode === 'create' ? 'Create' : 'Update'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode('list')}>Cancel</button>
          </FormActions>
        </form>
      </div>
    )
  }

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      <PageHeader
        icon="🗓️"
        title="Special Events"
        subtitle="Create events and publish them to Sreni calendars."
        stats={[
          { label: 'Total', value: events.length, variant: 'info' },
          { label: 'Upcoming', value: upcomingCount, variant: 'success' },
        ]}
        actions={
          <>
            <button className="btn btn-secondary" onClick={load} disabled={loading}>Refresh</button>
            <button className="btn btn-primary" onClick={openCreate}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Create Event</button>
          </>
        }
      />

      {loading && <div className="loading-state">Loading…</div>}
      {!loading && events.length === 0 && (
        <EmptyState
          title="No special events yet"
          copy="Create the first one!"
          action={<button className="btn btn-primary" onClick={openCreate}>Create Event</button>}
        />
      )}
      {!loading && (events.length > 0 || hasEventFiltersActive) && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <TableColumnHeaderRow
                columns={eventFilterColumns}
                sortBy={eventSortBy}
                sortDir={eventSortDir}
                onSort={toggleEventSort}
              />
              <TableColumnFilterRow
                columns={eventFilterColumns}
                values={eventFilters}
                onChange={setEventFilter}
                onClear={clearAllEventFilters}
              />
            </thead>
            <tbody>
              {displayedEvents.length === 0 ? (
                <TableNoResultsRow colSpan={6} title="No events match your filters" onClearFilters={clearAllEventFilters} />
              ) : displayedEvents.map((ev) => (
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
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${ev.title}`}
                      actions={[
                        ...(ev.registrationEnabled ? [{ label: 'Registrations', onClick: () => openRegistrations(ev) }] : []),
                        { label: 'Edit', onClick: () => openEdit(ev) },
                        { label: 'Delete', tone: 'danger', onClick: () => handleDelete(ev.id) },
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
