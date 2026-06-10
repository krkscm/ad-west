import { useCallback, useEffect, useMemo, useState } from 'react'
import { backendApi, HelpdeskTicketApi, TicketStatus } from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'
import { useEnumOptions } from '../../hooks/useEnumOptions'
import { PageHeader } from '../../components/common/PageHeader'
import { EmptyState } from '../../components/common/EmptyState'
import { TableColumnFilterRow, type TableColumnFilterDef } from '../../components/common/TableColumnFilterRow'
import { TableColumnHeaderRow } from '../../components/common/TableColumnHeaderRow'
import { TableNoResultsRow } from '../../components/common/TableNoResultsRow'
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters'
import { useTableSort } from '../../hooks/useTableSort'
import { applyClientColumnFilters, type ClientFilterAccessor } from '../../utils/clientTableFilter'
import { applyClientColumnSort } from '../../utils/clientTableSort'
import { isListFilterActive } from '../../utils/tableListUtils'

const STATUS_BADGE: Record<TicketStatus, string> = {
  open: 'badge-error',
  in_progress: 'badge-warning',
  resolved: 'badge-success',
  closed: 'badge-info',
}

export function HelpdeskTicketsPage() {
  const { addToast } = useToast()
  const { options: statusOptions, labelByValue: statusLabel } = useEnumOptions('helpdesk_ticket_status')
  const { labelByValue: categoryLabel } = useEnumOptions('helpdesk_ticket_category')
  const [tickets, setTickets] = useState<HelpdeskTicketApi[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selected, setSelected] = useState<HelpdeskTicketApi | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] = useState<TicketStatus>('open')
  const [saving, setSaving] = useState(false)
  const { filters, debouncedFilters, setFilter, clearFilters } = useTableColumnFilters()
  const { sortBy, sortDir, toggleSort, clearSort } = useTableSort()

  const filterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'subject', label: 'Subject', filterable: true, placeholder: 'Subject…' },
    { key: 'contactName', label: 'Contact', filterable: true, placeholder: 'Contact…' },
    { key: 'category', label: 'Category', filterable: true, placeholder: 'Category…' },
    {
      key: 'status',
      label: 'Status',
      filterable: true,
      filterType: 'select',
      placeholder: 'All statuses',
      options: statusOptions.map((o) => ({ value: o.value, label: o.label })),
    },
    { key: 'submittedAt', label: 'Submitted', filterable: true, placeholder: 'Submitted…' },
    { key: '__actions__', filterable: false, sortable: false, width: '56px' },
  ], [statusOptions])

  const accessors = useMemo<Record<string, ClientFilterAccessor<HelpdeskTicketApi>>>(() => ({
    subject: { getValue: (t) => t.subject },
    contactName: { getValue: (t) => t.name },
    category: { getValue: (t) => categoryLabel(t.category) },
    status: { getValue: (t) => t.status, match: 'exact' },
    submittedAt: { getValue: (t) => new Date(t.createdAt).toLocaleString() },
  }), [categoryLabel])

  const displayedRows = useMemo(
    () => applyClientColumnSort(
      applyClientColumnFilters(tickets, debouncedFilters, accessors),
      sortBy,
      sortDir,
      accessors,
    ),
    [tickets, debouncedFilters, accessors, sortBy, sortDir],
  )

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await backendApi.listHelpdeskTickets(filterStatus || undefined)
      setTickets(res.items)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load tickets', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, addToast])

  useEffect(() => { loadTickets() }, [loadTickets])

  const openTicket = (ticket: HelpdeskTicketApi) => {
    setSelected(ticket)
    setEditNotes(ticket.notes ?? '')
    setEditStatus(ticket.status)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await backendApi.updateHelpdeskTicket(selected.id, { status: editStatus, notes: editNotes })
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setSelected(updated)
      addToast('Ticket updated', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openCount = tickets.filter((ticket) => ticket.status === 'open').length
  const resolvedCount = tickets.filter((ticket) => ticket.status === 'resolved').length
  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim())
  const hasFiltersActive = isListFilterActive(hasColumnFilters, filterStatus)
  const clearAllFilters = () => {
    clearFilters()
    clearSort()
    setFilterStatus('')
  }

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      <PageHeader
        icon="🎫"
        title="Helpdesk Tickets"
        subtitle="Manage support requests submitted via the public helpdesk page."
        actions={
          <button className="btn btn-secondary" onClick={loadTickets} disabled={loading}>
            Refresh
          </button>
        }
      />

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span className="badge badge-info">
          <strong>{tickets.length}</strong> Total
        </span>
        <span className="badge badge-error">
          <strong>{openCount}</strong> Open
        </span>
        <span className="badge badge-success">
          <strong>{resolvedCount}</strong> Resolved
        </span>
      </div>

      <div className="glass-panel list-toolbar" style={{ marginBottom: '16px' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>Status</label>
        <div style={{ width: '220px', maxWidth: '100%' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0,1fr) 360px' : '1fr', gap: '16px', alignItems: 'start' }}>
        <div>
          {loading && <div className="loading-state">Loading…</div>}
          {!loading && tickets.length === 0 && !hasFiltersActive && (
            <EmptyState
              icon="🎫"
              title="No tickets found"
              copy="Support requests will appear here once submitted."
            />
          )}
          {!loading && (tickets.length > 0 || hasFiltersActive) && (
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
                    <TableNoResultsRow colSpan={6} title="No tickets match your filters" onClearFilters={clearAllFilters} />
                  ) : displayedRows.map((ticket) => {
                    const isActive = selected?.id === ticket.id
                    return (
                      <tr
                        key={ticket.id}
                        onClick={() => openTicket(ticket)}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--primary-light)' : undefined }}
                      >
                        <td style={{ fontWeight: 600 }}>{ticket.subject}</td>
                        <td>
                          {ticket.name}
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
                            {ticket.phone}{ticket.email ? ` · ${ticket.email}` : ''}
                          </div>
                        </td>
                        <td>{categoryLabel(ticket.category)}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[ticket.status]}`}>
                            {statusLabel(ticket.status)}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                          {new Date(ticket.createdAt).toLocaleString()}
                        </td>
                        <td />
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
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary-dark)', fontWeight: 700 }}>{selected.subject}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary-dark)' }}>✕</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '0.82rem' }}>
              <tbody>
                {[
                  ['Name', selected.name],
                  ['Phone', selected.phone],
                  ['Email', selected.email ?? '—'],
                  ['Category', categoryLabel(selected.category)],
                  ['Submitted', new Date(selected.createdAt).toLocaleString()],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--border-dark)' }}>
                    <td style={{ padding: '6px 0', color: 'var(--text-secondary-dark)', width: '90px', fontWeight: 600 }}>{k}</td>
                    <td style={{ padding: '6px 0', color: 'var(--text-primary-dark)' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ background: 'var(--panel-soft-bg)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-primary-dark)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {selected.description}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={editStatus} onChange={(e) => setEditStatus(e.target.value as TicketStatus)}>
                  {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Internal Notes</label>
                <textarea
                  className="form-input"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes visible to internal staff…"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Updating…' : 'Update'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
