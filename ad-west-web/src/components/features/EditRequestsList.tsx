import React, { useEffect, useState } from 'react'
import { useToast } from '../common/Toast'
import { backendApi, MemberEditRequestApi } from '../../utils/backendApi'

export const EditRequestsList: React.FC = () => {
  const [requests, setRequests] = useState<MemberEditRequestApi[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { addToast } = useToast()

  const loadRequests = async () => {
    setLoading(true)
    try {
      const rows = await backendApi.listAdminEditRequests('pending')
      setRequests(rows)
    } catch (error) {
      setRequests([])
      addToast(error instanceof Error ? error.message : 'Failed to load approval queue.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRequests()
  }, [])

  const handleDecision = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId)
    try {
      if (action === 'approve') {
        await backendApi.approveAdminEditRequest(requestId)
        addToast('Request approved and member profile updated.', 'success')
      } else {
        await backendApi.rejectAdminEditRequest(requestId)
        addToast('Request rejected.', 'info')
      }

      setRequests((prev) => prev.filter((request) => request.id !== requestId))
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to process request.', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Profile Change Approvals</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
          Approve or reject pending member profile updates from a single moderation queue.
        </p>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '24px', color: 'var(--text-secondary-dark)' }}>
          Loading pending requests...
        </div>
      ) : requests.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-secondary-dark)',
            backgroundColor: 'var(--panel-soft-bg)',
          }}
        >
          <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '12px' }}>✅</span>
          <h4 style={{ color: 'var(--text-primary-dark)', marginBottom: '6px' }}>No Pending Requests</h4>
          <p style={{ fontSize: '0.875rem', maxWidth: '560px', margin: '0 auto' }}>
            The moderation queue is currently clear.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Field</th>
                <th>Current Value</th>
                <th>Requested Value</th>
                <th>Submitted</th>
                <th style={{ width: '220px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const busy = processingId === request.id
                return (
                  <tr key={request.id}>
                    <td style={{ fontWeight: 600 }}>{request.memberName || request.memberId}</td>
                    <td>{request.field}</td>
                    <td>{request.currentValue || '-'}</td>
                    <td>{request.requestedValue}</td>
                    <td>{new Date(request.createdAt).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '8px 12px', fontSize: '0.75rem' }}
                          disabled={busy}
                          onClick={() => {
                            void handleDecision(request.id, 'approve')
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.75rem' }}
                          disabled={busy}
                          onClick={() => {
                            void handleDecision(request.id, 'reject')
                          }}
                        >
                          Reject
                        </button>
                      </div>
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
