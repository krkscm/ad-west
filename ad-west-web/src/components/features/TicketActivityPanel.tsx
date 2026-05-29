import React, { useState } from 'react'
import { useToast } from '../common/Toast'
import { backendApi, TicketActivityApi } from '../../utils/backendApi'

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i)
  return match?.[1] || error.message || fallback
}

export const TicketActivityPanel: React.FC = () => {
  const [ticketId, setTicketId] = useState('')
  const [rows, setRows] = useState<TicketActivityApi[]>([])
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const loadActivity = async () => {
    const normalizedId = ticketId.trim()
    if (!normalizedId) {
      addToast('Enter a ticket ID to load activity.', 'warning')
      return
    }

    setLoading(true)
    try {
      const result = await backendApi.listHelpdeskTicketActivity(normalizedId)
      setRows(result)
      addToast('Ticket activity loaded.', 'success')
    } catch (error) {
      setRows([])
      addToast(toUiError(error, 'Failed to load ticket activity.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-slide-up" style={{ display: 'grid', gap: '18px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Helpdesk Ticket Activity</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
          Inspect the operational timeline for assignment, status, and comment events on a specific ticket.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '18px', display: 'grid', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
          <input className="input" value={ticketId} onChange={(e) => setTicketId(e.target.value)} placeholder="ticket id" />
          <button className="btn btn-secondary" onClick={() => void loadActivity()} disabled={loading}>
            {loading ? 'Loading...' : 'Load Activity'}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="glass-panel" style={{ padding: '22px', color: 'var(--text-secondary-dark)' }}>
          No activity loaded.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>{row.action}</td>
                  <td>{row.actorId}</td>
                  <td>{row.details ? JSON.stringify(row.details) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
