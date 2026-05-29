import React, { useEffect, useMemo, useState } from 'react'
import { useToast } from '../common/Toast'
import { backendApi, ImportApi, ImportReconciliationApi } from '../../utils/backendApi'

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i)
  return match?.[1] || error.message || fallback
}

export const ImportReconciliationPanel: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'ready_for_review' | 'finalized' | 'failed'>('all')
  const [rows, setRows] = useState<ImportApi[]>([])
  const [selectedImportId, setSelectedImportId] = useState('')
  const [reconciliation, setReconciliation] = useState<ImportReconciliationApi | null>(null)
  const [failureReason, setFailureReason] = useState('Data validation failed during reconciliation review')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const selectedImport = useMemo(() => rows.find((row) => row.id === selectedImportId) || null, [rows, selectedImportId])

  const loadImports = async () => {
    setLoading(true)
    try {
      const imports = await backendApi.listImports(statusFilter === 'all' ? undefined : statusFilter)
      setRows(imports)
      setSelectedImportId((prev) => prev || imports[0]?.id || '')
    } catch (error) {
      setRows([])
      setSelectedImportId('')
      addToast(toUiError(error, 'Failed to load import batches.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadReconciliation = async () => {
    if (!selectedImportId) {
      addToast('Select an import batch first.', 'warning')
      return
    }

    try {
      const result = await backendApi.getImportReconciliation(selectedImportId)
      setReconciliation(result)
      addToast('Reconciliation status refreshed.', 'success')
    } catch (error) {
      setReconciliation(null)
      addToast(toUiError(error, 'Failed to load reconciliation status.'), 'error')
    }
  }

  const markFailed = async () => {
    if (!selectedImportId) {
      addToast('Select an import batch first.', 'warning')
      return
    }

    try {
      await backendApi.markImportFailed(selectedImportId, failureReason.trim())
      addToast('Import marked as failed.', 'success')
      await loadImports()
      setReconciliation(null)
    } catch (error) {
      addToast(toUiError(error, 'Unable to mark import as failed.'), 'error')
    }
  }

  const finalize = async () => {
    if (!selectedImportId) {
      addToast('Select an import batch first.', 'warning')
      return
    }

    try {
      await backendApi.finalizeImport(selectedImportId)
      addToast('Import finalized successfully.', 'success')
      await loadImports()
      await loadReconciliation()
    } catch (error) {
      addToast(toUiError(error, 'Unable to finalize import.'), 'error')
    }
  }

  useEffect(() => {
    void loadImports()
  }, [statusFilter])

  return (
    <div className="animate-slide-up" style={{ display: 'grid', gap: '18px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Import Reconciliation</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
          Review import operational state, mark failed batches, and finalize only when reconciliation gates pass.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '18px', display: 'grid', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'processing' | 'ready_for_review' | 'finalized' | 'failed')}>
            <option value="all">All statuses</option>
            <option value="processing">Processing</option>
            <option value="ready_for_review">Ready for review</option>
            <option value="failed">Failed</option>
            <option value="finalized">Finalized</option>
          </select>
          <button className="btn btn-secondary" onClick={() => void loadImports()} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <select className="input" value={selectedImportId} onChange={(e) => setSelectedImportId(e.target.value)}>
          {rows.length === 0 && <option value="">No imports available</option>}
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.id} | {row.status} | accepted={row.acceptedRows} | duplicate={row.duplicateRows} | validationErrors={row.validationErrorRows}
            </option>
          ))}
        </select>

        {selectedImport && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
            file={selectedImport.fileName} | type={selectedImport.fileType} | processed={selectedImport.processedRows} | failedReason={selectedImport.failedReason || 'n/a'}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px' }}>
          <input className="input" value={failureReason} onChange={(e) => setFailureReason(e.target.value)} placeholder="failure reason" />
          <button className="btn btn-secondary" onClick={() => void loadReconciliation()}>Load Reconciliation</button>
          <button className="btn btn-primary" onClick={() => void markFailed()}>Mark Failed</button>
        </div>

        <button className="btn btn-primary" onClick={() => void finalize()} disabled={!selectedImportId}>
          Finalize Selected Import
        </button>
      </div>

      {reconciliation && (
        <div className="glass-panel" style={{ padding: '18px', display: 'grid', gap: '8px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Reconciliation Summary</h3>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
            status={reconciliation.status} | totalDuplicates={reconciliation.totalDuplicates} | pending={reconciliation.pendingDuplicates} | merged={reconciliation.mergedDuplicates} | skipped={reconciliation.skippedDuplicates} | canFinalize={String(reconciliation.canFinalize)}
          </div>
          {reconciliation.issues.length > 0 && reconciliation.issues.map((issue) => (
            <div key={issue} style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', border: '1px solid var(--border-dark)', borderRadius: '8px', padding: '8px 10px', background: 'var(--panel-soft-bg)' }}>
              {issue}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
