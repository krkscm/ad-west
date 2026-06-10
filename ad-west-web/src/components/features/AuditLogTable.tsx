import React, { useEffect, useMemo, useState } from 'react'
import { TableColumnFilterRow, type TableColumnFilterDef } from '../common/TableColumnFilterRow'
import { TableColumnHeaderRow } from '../common/TableColumnHeaderRow'
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters'
import { useTableSort } from '../../hooks/useTableSort'
import { applyClientColumnFilters, type ClientFilterAccessor } from '../../utils/clientTableFilter'
import { applyClientColumnSort } from '../../utils/clientTableSort'
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
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const { filters, debouncedFilters, setFilter, clearFilters } = useTableColumnFilters()
  const { sortBy, sortDir, toggleSort, clearSort } = useTableSort()

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

  const uniqueActions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs],
  )

  const filterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: '__expand__', filterable: false, sortable: false, width: '48px' },
    { key: 'timestamp', label: 'Timestamp', filterable: true, placeholder: 'Timestamp…' },
    { key: 'actor', label: 'Actor', filterable: true, placeholder: 'Actor…' },
    {
      key: 'action',
      label: 'Action Triggered',
      filterable: true,
      filterType: 'select',
      placeholder: 'All actions',
      options: uniqueActions.map((action) => ({
        value: action,
        label: action.replace(/_/g, ' '),
      })),
    },
    { key: 'entityType', label: 'Entity Modified', filterable: true, placeholder: 'Entity type…' },
    { key: 'entityId', label: 'Entity ID', filterable: true, placeholder: 'Entity ID…' },
  ], [uniqueActions])

  const accessors = useMemo<Record<string, ClientFilterAccessor<UiAuditLog>>>(() => ({
    timestamp: { getValue: (log) => new Date(log.timestamp).toLocaleString() },
    actor: { getValue: (log) => `${log.actorName} ${log.actorId}`.trim() },
    action: { getValue: (log) => log.action, match: 'exact' },
    entityType: { getValue: (log) => log.entityType },
    entityId: { getValue: (log) => log.entityId },
  }), [])

  const displayedLogs = useMemo(
    () => applyClientColumnSort(
      applyClientColumnFilters(logs, debouncedFilters, accessors),
      sortBy,
      sortDir,
      accessors,
    ),
    [logs, debouncedFilters, accessors, sortBy, sortDir],
  )
  const clearAllFilters = () => {
    clearFilters()
    clearSort()
  }
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
            {displayedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary-dark)' }}>
                  No audit logs found matching criteria.
                </td>
              </tr>
            ) : (
              displayedLogs.map((log) => {
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
