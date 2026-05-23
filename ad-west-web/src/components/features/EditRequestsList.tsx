import React, { useState, useEffect } from 'react';
import { mockDatabase } from '../../utils/mockDatabase';
import { EditRequest, Contact } from '../../types';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';

export const EditRequestsList: React.FC = () => {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { adminUser } = useAuth();
  const { addToast } = useToast();

  const loadRequests = () => {
    setRequests(mockDatabase.getEditRequests());
    setContacts(mockDatabase.getContacts());
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = (reqId: string) => {
    if (!adminUser) return;
    
    const success = mockDatabase.approveEditRequest(reqId, adminUser.sub, adminUser.name);
    if (success) {
      addToast('Profile change request approved. Member record updated.', 'success');
      loadRequests();
    } else {
      addToast('Failed to approve request. Record might be missing.', 'error');
    }
  };

  const handleReject = (reqId: string) => {
    if (!adminUser) return;

    const success = mockDatabase.rejectEditRequest(reqId, adminUser.sub, adminUser.name);
    if (success) {
      addToast('Profile change request rejected.', 'warning');
      loadRequests();
    } else {
      addToast('Failed to reject request.', 'error');
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Profile Change Approvals</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
          Review and approve self-service contact modification requests submitted by community members.
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: 'var(--text-secondary-dark)',
            backgroundColor: 'rgba(30, 41, 59, 0.2)'
          }}
        >
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🎉</span>
          <h4 style={{ color: 'var(--text-primary-dark)', marginBottom: '4px' }}>All Caught Up!</h4>
          <p style={{ fontSize: '0.875rem' }}>There are no pending profile change requests awaiting review.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {pendingRequests.map(req => {
            const contact = contacts.find(c => c.id === req.contactId);
            
            return (
              <div 
                key={req.id} 
                className="glass-panel" 
                style={{ 
                  padding: '24px',
                  backgroundColor: 'rgba(30, 41, 59, 0.4)'
                }}
              >
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    borderBottom: '1px solid var(--border-dark)',
                    paddingBottom: '14px',
                    marginBottom: '16px'
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{req.contactName}</h3>
                    <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem', marginTop: '2px' }}>
                      Requested: {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                      onClick={() => handleReject(req.id)}
                    >
                      Reject
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={() => handleApprove(req.id)}
                    >
                      Approve Change
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary-dark)' }}>
                    Modified Fields Comparison
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.keys(req.requestedFields).map(field => {
                      const currentValue = contact ? (contact as any)[field] : 'N/A';
                      const requestedValue = req.requestedFields[field];

                      // Capitalize field name
                      const fieldLabel = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                      return (
                        <div 
                          key={field}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 2fr 2fr',
                            gap: '16px',
                            alignItems: 'center',
                            padding: '10px 14px',
                            backgroundColor: 'rgba(15, 23, 42, 0.3)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-dark)',
                            fontSize: '0.875rem'
                          }}
                        >
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary-dark)' }}>{fieldLabel}</span>
                          <span style={{ color: '#f87171', textDecoration: 'line-through' }}>
                            {currentValue || '(empty)'}
                          </span>
                          <span style={{ color: '#34d399', fontWeight: 600 }}>
                            {requestedValue}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
