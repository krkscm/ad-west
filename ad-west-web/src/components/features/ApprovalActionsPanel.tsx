import React, { useEffect, useMemo, useState } from 'react'
import { ApprovalItemApi, backendApi } from '../../utils/backendApi'
import { useToast } from '../common/Toast'

const statusLabel: Record<string, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  need_more_information: 'Need More Information',
}

export const ApprovalActionsPanel: React.FC = () => {
  const { addToast } = useToast()
  const [items, setItems] = useState<ApprovalItemApi[]>([])
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
    itemId: string,
    decision: 'approved' | 'rejected' | 'need_more_information',
  ) => {
    setBusyId(itemId)
    try {
      await backendApi.reviewApprovalItem(itemId, {
        decision,
        note: notes[itemId]?.trim() || undefined,
      })
      addToast(`Decision recorded: ${decision.replace(/_/g, ' ')}`, 'success')
      await load()
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to submit decision.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleResubmit = async (itemId: string) => {
    setBusyId(itemId)
    try {
      await backendApi.resubmitApprovalItem(itemId, {
        note: notes[itemId]?.trim() || undefined,
      })
      addToast('Information submitted and approval flow restarted.', 'success')
      await load()
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to resubmit item.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px' }}>Actions</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>
          Review event/report approval lines assigned to you and respond to requests for more information.
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
                <th>Type</th>
                <th>Status</th>
                <th>Updated</th>
                <th style={{ minWidth: '280px' }}>Note</th>
                <th style={{ minWidth: '320px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const busy = busyId === item.id
                const isPending = item.status === 'pending'
                const needsInfo = item.status === 'need_more_information'
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.summary || item.targetId}</td>
                    <td>{item.targetType === 'calendar_event' ? 'Event' : 'Report'}</td>
                    <td>{statusLabel[item.status] ?? item.status}</td>
                    <td>{new Date(item.updatedAt).toLocaleString()}</td>
                    <td>
                      <textarea
                        className="form-input"
                        rows={2}
                        value={notes[item.id] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setNotes((prev) => ({ ...prev, [item.id]: value }))
                        }}
                        placeholder={isPending ? 'Add review note (optional)' : 'Add more information (optional)'}
                        disabled={busy}
                        style={{ resize: 'vertical', minWidth: '250px' }}
                      />
                    </td>
                    <td>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className="btn btn-primary" disabled={busy} onClick={() => void handleReview(item.id, 'approved')}>
                            Approve
                          </button>
                          <button className="btn btn-secondary" disabled={busy} onClick={() => void handleReview(item.id, 'rejected')}>
                            Reject
                          </button>
                          <button className="btn btn-secondary" disabled={busy} onClick={() => void handleReview(item.id, 'need_more_information')}>
                            Need More Information
                          </button>
                        </div>
                      ) : needsInfo ? (
                        <button className="btn btn-primary" disabled={busy} onClick={() => void handleResubmit(item.id)}>
                          Submit More Information
                        </button>
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
