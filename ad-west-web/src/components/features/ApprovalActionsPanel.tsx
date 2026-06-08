import React, { useEffect, useMemo, useState } from 'react'
import { ApprovalWorkflowRuntimeItemApi, backendApi } from '../../utils/backendApi'
import { useToast } from '../common/Toast'
import { TableRowActionsMenu } from '../common/TableRowActionsMenu'

const statusLabel: Record<string, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const ApprovalActionsPanel: React.FC = () => {
  const { addToast } = useToast()
  const [items, setItems] = useState<ApprovalWorkflowRuntimeItemApi[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const rows = await backendApi.listMyApprovalActions()
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
    item: ApprovalWorkflowRuntimeItemApi,
    decision: 'approved' | 'rejected',
  ) => {
    const stageId = item.currentStageIds[0]
    if (!stageId) {
      addToast('No active stage found for this item.', 'error')
      return
    }
    setBusyId(item.id)
    try {
      await backendApi.reviewApprovalWorkflowRuntimeItem(item.id, {
        stageId,
        decision,
        note: notes[item.id]?.trim() || undefined,
      })
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
          Review approval items assigned to you and submit your decision.
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
              <tr>
                <th style={{ minWidth: '200px' }}>Summary</th>
                <th>Status</th>
                <th>Updated</th>
                <th style={{ minWidth: '280px' }}>Note</th>
                <th style={{ width: '56px' }} />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const busy = busyId === item.id
                const isPending = item.status === 'pending'
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.summary || item.targetId}</td>
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
                          ariaLabel={`Actions for ${item.summary || item.targetId}`}
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
