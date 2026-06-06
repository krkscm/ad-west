import { useCallback, useEffect, useState } from 'react'
import { backendApi, HelpdeskTicketApi, TicketStatus } from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'
import { useEnumOptions } from '../../hooks/useEnumOptions'

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'var(--error)',
  in_progress: 'var(--warning)',
  resolved: 'var(--success)',
  closed: 'var(--text-secondary-dark)',
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

  return (
    <div className="animate-slide-up" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Helpdesk Tickets</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>
            Manage support requests submitted via the public helpdesk page.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{tickets.length}</span>Total
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{openCount}</span>Open
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span style={{ fontWeight: 800 }}>{resolvedCount}</span>Resolved
            </span>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={loadTickets} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary-dark)' }}>Status</label>
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
          {loading && <div style={{ color: 'var(--text-secondary-dark)', padding: '20px' }}>Loading…</div>}
          {!loading && tickets.length === 0 && (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>
              No tickets found.
            </div>
          )}
          {!loading && tickets.length > 0 && (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Contact</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
                    const isActive = selected?.id === ticket.id
                    return (
                      <tr
                        key={ticket.id}
                        onClick={() => openTicket(ticket)}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--primary-light)' : 'transparent' }}
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
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: STATUS_COLORS[ticket.status], background: `${STATUS_COLORS[ticket.status]}18`, borderRadius: '20px', padding: '2px 8px' }}>
                            {statusLabel(ticket.status)}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                          {new Date(ticket.createdAt).toLocaleString()}
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
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>Status</label>
                <select className="form-input" value={editStatus} onChange={(e) => setEditStatus(e.target.value as TicketStatus)}>
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
                  placeholder="Add notes visible to internal staff…"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
