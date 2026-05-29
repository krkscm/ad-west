import React, { useEffect, useState } from 'react'
import { backendApi } from '../../utils/backendApi'

interface UiAuditLog {
  id: string
  actorId: string
  actorName: string
  action: string
  entityType: string
  entityId: string
  oldVal: Record<string, unknown> | null
  newVal: Record<string, unknown> | null
  timestamp: string
}

export const AuditLogTable: React.FC = () => {
  const [logs, setLogs] = useState<UiAuditLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await backendApi.listAuditLogs()
        setLogs(
          rows.map((log) => ({
            id: log.id,
            actorId: log.actorId,
            actorName: log.actorId,
            action: log.action,
            entityType: log.targetType,
            entityId: log.targetId,
            oldVal: null,
            newVal: log.details || null,
            timestamp: log.timestamp,
          })),
        )
      } catch {
        setLogs([])
      }
    }

    void load()
  }, [])

  const filteredLogs = logs.filter((log) => {
    const term = searchQuery.toLowerCase()
    const matchesSearch =
      log.actorName.toLowerCase().includes(term) ||
      log.actorId.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.entityType && log.entityType.toLowerCase().includes(term))

    const matchesAction = actionFilter ? log.action === actionFilter : true

    return matchesSearch && matchesAction
  })

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)))

  const toggleRow = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id)
  }

  const renderDiff = (oldVal: Record<string, unknown> | null, newVal: Record<string, unknown> | null) => {
    if (!oldVal && !newVal) return <span style={{ color: 'var(--text-secondary-dark)' }}>No data payload</span>

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          backgroundColor: 'var(--panel-soft-bg)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--border-dark)',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          whiteSpace: 'pre-wrap',
          color: 'var(--text-primary-dark)',
        }}
      >
        <div>
          <h5 style={{ color: '#ef4444', marginBottom: '8px', fontSize: '0.85rem' }}>◀ Previous State (Old Value)</h5>
          {oldVal ? JSON.stringify(oldVal, null, 2) : <span style={{ color: '#64748b' }}>None (New Record)</span>}
        </div>
        <div>
          <h5 style={{ color: '#34d399', marginBottom: '8px', fontSize: '0.85rem' }}>▶ Target State (New Value)</h5>
          {newVal ? JSON.stringify(newVal, null, 2) : <span style={{ color: '#64748b' }}>None (Deleted Record)</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Security Audit Logs</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
          Real-time security auditing showing administrator authentication and sensitive operations.
        </p>
      </div>

      <div
        className="glass-panel"
        style={{
          padding: '18px 24px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '16px',
          backgroundColor: 'var(--panel-soft-bg)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-dark)' }}>Search Log Records</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by Actor, Entity ID, Action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-dark)' }}>Filter by Action Type</label>
          <select className="form-input" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ cursor: 'pointer' }}>
            <option value="">All Action Types</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '48px' }}></th>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action Triggered</th>
              <th>Entity Modified</th>
              <th>Entity ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary-dark)' }}>
                  No audit logs found matching criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id
                const formattedDate = new Date(log.timestamp).toLocaleString()

                let badgeClass = 'badge-info'
                if (log.action.includes('FAILURE')) badgeClass = 'badge-error'
                if (log.action.includes('RESET')) badgeClass = 'badge-warning'
                if (log.action.includes('SUCCESS') || log.action.includes('APPROVE') || log.action.includes('CREATE')) badgeClass = 'badge-success'

                return (
                  <React.Fragment key={log.id}>
                    <tr onClick={() => toggleRow(log.id)} style={{ cursor: 'pointer' }}>
                      <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>{isExpanded ? '▼' : '▶'}</td>
                      <td style={{ color: 'var(--text-secondary-dark)' }}>{formattedDate}</td>
                      <td style={{ fontWeight: 600 }}>{log.actorName}</td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{log.action.replace(/_/g, ' ')}</span>
                      </td>
                      <td>{log.entityType}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.entityId}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td></td>
                        <td colSpan={5} style={{ padding: '20px 24px', backgroundColor: 'var(--panel-soft-bg)' }}>
                          <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', fontWeight: 600 }}>Payload Difference Log</h4>
                          {renderDiff(log.oldVal, log.newVal)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
