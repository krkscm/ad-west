import React, { useState, useEffect } from 'react';
import { mockDatabase } from '../../utils/mockDatabase';
import { AuditLog } from '../../types';

export const AuditLogTable: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    setLogs(mockDatabase.getAuditLogs());
  }, []);

  // Filter Logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entityType && log.entityType.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter ? log.action === actionFilter : true;

    return matchesSearch && matchesAction;
  });

  // Extract all unique actions for filtering dropdown
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  const toggleRow = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const renderDiff = (oldVal: any, newVal: any) => {
    if (!oldVal && !newVal) return <span style={{ color: 'var(--text-secondary-dark)' }}>No data payload</span>;

    return (
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px', 
          backgroundColor: 'rgba(15, 23, 42, 0.4)', 
          padding: '16px', 
          borderRadius: '8px',
          border: '1px solid var(--border-dark)',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          whiteSpace: 'pre-wrap',
          color: '#e2e8f0'
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
    );
  };

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Security Audit Logs</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
          Real-time security auditing showing administrator authentication, CRUD operations, and contact modifications.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '18px 24px', 
          marginBottom: '20px', 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gap: '16px',
          backgroundColor: 'rgba(30, 41, 59, 0.3)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-dark)' }}>Search Log Records</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by Actor, Entity ID, Action..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-dark)' }}>Filter by Action Type</label>
          <select 
            className="form-input"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            <option value="">All Action Types</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '48px' }}></th>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action Triggered</th>
              <th>Entity Modifed</th>
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
              filteredLogs.map(log => {
                const isExpanded = expandedLogId === log.id;
                const formattedDate = new Date(log.timestamp).toLocaleString();

                let badgeClass = 'badge-info';
                if (log.action.includes('FAILURE')) badgeClass = 'badge-error';
                if (log.action.includes('RESET')) badgeClass = 'badge-warning';
                if (log.action.includes('SUCCESS') || log.action.includes('APPROVE') || log.action.includes('CREATE')) badgeClass = 'badge-success';

                return (
                  <React.Fragment key={log.id}>
                    <tr 
                      onClick={() => toggleRow(log.id)} 
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                        {isExpanded ? '▼' : '▶'}
                      </td>
                      <td style={{ color: 'var(--text-secondary-dark)' }}>{formattedDate}</td>
                      <td style={{ fontWeight: 600 }}>{log.actorName}</td>
                      <td>
                        <span className={`badge ${badgeClass}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{log.entityType}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.entityId}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td></td>
                        <td colSpan={5} style={{ padding: '20px 24px', backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                          <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', fontWeight: 600 }}>Payload Difference Log</h4>
                          {renderDiff(log.oldVal, log.newVal)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
