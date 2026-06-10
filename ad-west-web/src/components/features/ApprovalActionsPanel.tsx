import React, { useEffect, useMemo, useState } from 'react'
import { ApprovalWorkflowRuntimeItemApi, backendApi } from '../../utils/backendApi'
import { useToast } from '../common/Toast'
import { TableRowActionsMenu } from '../common/TableRowActionsMenu'
import { TableColumnFilterRow, type TableColumnFilterDef } from '../common/TableColumnFilterRow'
import { TableColumnHeaderRow } from '../common/TableColumnHeaderRow'
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters'
import { useTableSort } from '../../hooks/useTableSort'
import { applyClientColumnFilters, type ClientFilterAccessor } from '../../utils/clientTableFilter'
import { applyClientColumnSort } from '../../utils/clientTableSort'

const statusLabel: Record<string, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
}

type ApprovalActionRow = {
  id: string
  kind: 'workflow' | 'reimbursement'
  summary: string
  status: 'pending' | 'approved' | 'rejected'
  updatedAt: string
  workflowItem?: ApprovalWorkflowRuntimeItemApi
  reimbursementId?: string
}

export const ApprovalActionsPanel: React.FC = () => {
  const { addToast } = useToast()
  const [items, setItems] = useState<ApprovalActionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const { filters, debouncedFilters, setFilter, clearFilters } = useTableColumnFilters()
  const { sortBy, sortDir, toggleSort, clearSort } = useTableSort()

  const filterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'summary', label: 'Summary', filterable: true, placeholder: 'Summary…' },
    {
      key: 'status',
      label: 'Status',
      filterable: true,
      filterType: 'select',
      placeholder: 'All statuses',
      options: [
        { value: 'pending', label: statusLabel.pending },
        { value: 'approved', label: statusLabel.approved },
        { value: 'rejected', label: statusLabel.rejected },
      ],
    },
    { key: 'updated', label: 'Updated', filterable: true, placeholder: 'Updated…' },
    { key: 'note', label: 'Note', filterable: false, sortable: false },
    { key: '__actions__', filterable: false, sortable: false, width: '56px' },
  ], [])

  const accessors = useMemo<Record<string, ClientFilterAccessor<ApprovalActionRow>>>(() => ({
    summary: { getValue: (item) => item.summary },
    status: { getValue: (item) => item.status, match: 'exact' },
    updated: { getValue: (item) => new Date(item.updatedAt).toLocaleString() },
  }), [])

  const displayedItems = useMemo(
    () => applyClientColumnSort(
      applyClientColumnFilters(items, debouncedFilters, accessors),
      sortBy,
      sortDir,
      accessors,
    ),
    [items, debouncedFilters, accessors, sortBy, sortDir],
  )
  const clearAllFilters = () => {
    clearFilters()
    clearSort()
  }

  const load = async () => {
    setLoading(true)
    try {
      const [workflowItems, access] = await Promise.all([
        backendApi.listMyApprovalActions('pending').catch(() => []),
        backendApi.getReimbursementAccess().catch(() => ({ canReview: false })),
      ])

      const rows: ApprovalActionRow[] = workflowItems.map((item) => ({
        id: item.id,
        kind: 'workflow',
        summary: item.summary || item.targetId,
        status: item.status,
        updatedAt: item.updatedAt,
        workflowItem: item,
      }))

      if (access.canReview) {
        const queue = await backendApi.listReimbursementReviewQueue()
        for (const reimbursement of queue.items) {
          const amount = `${reimbursement.currency} ${Number(reimbursement.amount).toFixed(2)}`
          rows.push({
            id: `reimbursement-${reimbursement.id}`,
            kind: 'reimbursement',
            summary: `Reimbursement: ${reimbursement.description} (${amount})`,
            status: 'pending',
            updatedAt: reimbursement.updatedAt,
            reimbursementId: reimbursement.id,
          })
        }
      }

      rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      setItems(rows)
    } catch (error) {
      setItems([])
      addToast(error instanceof Error ? error.message : 'Failed to load approval actions.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === 'pending').length,
    [items],
  )

  const handleReview = async (
    item: ApprovalActionRow,
    decision: 'approved' | 'rejected',
  ) => {
    setBusyId(item.id)
    try {
      if (item.kind === 'reimbursement' && item.reimbursementId) {
        await backendApi.reviewReimbursement(item.reimbursementId, {
          status: decision,
          reviewerNotes: notes[item.id]?.trim() || undefined,
        })
      } else if (item.workflowItem) {
        const stageId = item.workflowItem.currentStageIds[0]
        if (!stageId) {
          addToast('No active stage found for this item.', 'error')
          return
        }
        await backendApi.reviewApprovalWorkflowRuntimeItem(item.workflowItem.id, {
          stageId,
          decision,
          note: notes[item.id]?.trim() || undefined,
        })
      }
      addToast(`Decision recorded: ${decision}`, 'success')
      await load()
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to submit decision.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px' }}>📝 My Approvals</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>
          Review pending reimbursements and other items assigned to your role.
        </p>
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-warning">Pending: {pendingCount}</span>
          <span className="badge">Total: {items.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '24px', color: 'var(--text-secondary-dark)' }}>
          Loading actions...
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
          No approval actions right now.
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
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
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary-dark)' }}>
                    No approval actions match the current filters.
                  </td>
                </tr>
              ) : displayedItems.map((item) => {
                const busy = busyId === item.id
                const isPending = item.status === 'pending'
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.summary}</td>
                    <td>{statusLabel[item.status] ?? item.status}</td>
                    <td>{new Date(item.updatedAt).toLocaleString()}</td>
                    <td>
                      {isPending && (
                        <textarea
                          className="form-input"
                          rows={2}
                          value={notes[item.id] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setNotes((prev) => ({ ...prev, [item.id]: value }))
                          }}
                          placeholder="Add review note (optional)"
                          disabled={busy}
                          style={{ resize: 'vertical', minWidth: '250px' }}
                        />
                      )}
                    </td>
                    <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                      {isPending ? (
                        <TableRowActionsMenu
                          ariaLabel={`Actions for ${item.summary}`}
                          actions={[
                            { label: 'Approve', onClick: () => void handleReview(item, 'approved'), disabled: busy },
                            { label: 'Reject', tone: 'danger', onClick: () => void handleReview(item, 'rejected'), disabled: busy },
                          ]}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.82rem' }}>Completed</span>
                      )}
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
