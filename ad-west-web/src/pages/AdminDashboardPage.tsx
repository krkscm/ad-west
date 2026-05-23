import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockDatabase } from '../utils/mockDatabase';
import { AdminUsersList } from '../components/features/AdminUsersList';
import { AuditLogTable } from '../components/features/AuditLogTable';
import { EditRequestsList } from '../components/features/EditRequestsList';
import { AuditLog } from '../types';

type ActiveTab = 'dashboard' | 'admins' | 'approvals' | 'logs';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const { adminUser, logout } = useAuth();

  // Metrics state
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [totalContactsCount, setTotalContactsCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    // Load counts and recent logs
    const requests = mockDatabase.getEditRequests();
    setPendingApprovalsCount(requests.filter(r => r.status === 'pending').length);

    const tickets = mockDatabase.getTickets();
    setOpenTicketsCount(tickets.filter(t => t.status === 'new' || t.status === 'in_progress').length);

    const contacts = mockDatabase.getContacts();
    setTotalContactsCount(contacts.filter(c => c.status === 'active').length);

    const logs = mockDatabase.getAuditLogs();
    setRecentLogs(logs.slice(0, 5));
  }, [activeTab]);

  if (!adminUser) return null;

  // Determine user permissions based on first role
  const userRole = adminUser.roles[0]?.role;
  const userScope = adminUser.roles[0]?.scopeId || 'global';

  const isSuperAdmin = userRole === 'Super Admin';
  const isZoneAdmin = userRole === 'Zone Admin';

  // Allowed tabs:
  // Super Admin: dashboard, admins, approvals, logs
  // Zone Admin: dashboard, approvals, logs
  // Sreny Admin: dashboard, approvals
  const showAdminsTab = isSuperAdmin;
  const showLogsTab = isSuperAdmin || isZoneAdmin;

  return (
    <div className="admin-theme" style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
      
      {/* Sidebar navigation */}
      <aside 
        style={{
          width: '260px',
          borderRight: '1px solid var(--border-dark)',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0'
        }}
      >
        {/* Brand */}
        <div style={{ padding: '0 24px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#fff'
            }}
          >
            AD
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>ADWest Panel</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary-dark)', fontWeight: 600 }}>DIRECTORY MVP</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              justifyContent: 'flex-start', 
              padding: '10px 16px', 
              fontSize: '0.9rem',
              background: activeTab === 'dashboard' ? '' : 'transparent',
              border: 'none',
              color: activeTab === 'dashboard' ? '#fff' : 'var(--text-secondary-dark)'
            }}
          >
            <span>📊</span> Dashboard
          </button>

          {showAdminsTab && (
            <button 
              onClick={() => setActiveTab('admins')}
              className={`btn ${activeTab === 'admins' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ 
                justifyContent: 'flex-start', 
                padding: '10px 16px', 
                fontSize: '0.9rem',
                background: activeTab === 'admins' ? '' : 'transparent',
                border: 'none',
                color: activeTab === 'admins' ? '#fff' : 'var(--text-secondary-dark)'
              }}
            >
              <span>🔑</span> Admins (RBAC)
            </button>
          )}

          <button 
            onClick={() => setActiveTab('approvals')}
            className={`btn ${activeTab === 'approvals' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              justifyContent: 'flex-start', 
              padding: '10px 16px', 
              fontSize: '0.9rem',
              background: activeTab === 'approvals' ? '' : 'transparent',
              border: 'none',
              color: activeTab === 'approvals' ? '#fff' : 'var(--text-secondary-dark)',
              position: 'relative'
            }}
          >
            <span>📝</span> Approvals
            {pendingApprovalsCount > 0 && (
              <span 
                style={{ 
                  position: 'absolute', 
                  right: '16px', 
                  backgroundColor: 'var(--error)', 
                  color: 'white', 
                  fontSize: '0.7rem', 
                  padding: '2px 8px', 
                  borderRadius: '10px',
                  fontWeight: 700
                }}
              >
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          {showLogsTab && (
            <button 
              onClick={() => setActiveTab('logs')}
              className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ 
                justifyContent: 'flex-start', 
                padding: '10px 16px', 
                fontSize: '0.9rem',
                background: activeTab === 'logs' ? '' : 'transparent',
                border: 'none',
                color: activeTab === 'logs' ? '#fff' : 'var(--text-secondary-dark)'
              }}
            >
              <span>🗂️</span> Audit Logs
            </button>
          )}
        </nav>

        {/* Logout Section */}
        <div style={{ padding: '0 12px' }}>
          <button 
            onClick={logout}
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              justifyContent: 'flex-start', 
              padding: '10px 16px', 
              fontSize: '0.9rem',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171'
            }}
          >
            <span>🚪</span> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        
        {/* Top Header bar */}
        <header 
          style={{
            height: '72px',
            borderBottom: '1px solid var(--border-dark)',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', fontWeight: 600 }}>JURISDICTION SCOPE</span>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', textTransform: 'capitalize', marginTop: '2px' }}>
              🌍 {userScope === 'global' ? 'Global Organization' : userScope.replace(/_/g, ' ')}
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{adminUser.name}</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)' }}>{adminUser.email}</span>
            </div>
            <span 
              className={`badge ${
                isSuperAdmin ? 'badge-error' : isZoneAdmin ? 'badge-warning' : 'badge-info'
              }`}
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              🛡️ {userRole}
            </span>
          </div>
        </header>

        {/* Body content */}
        <div style={{ padding: '32px', flex: 1 }}>
          
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="animate-slide-up">
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Platform Overview</h2>
                <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
                  Monitoring community directory health, pending validations, and administrative logs.
                </p>
              </div>

              {/* Grid Widgets */}
              <div className="dashboard-grid" style={{ marginBottom: '32px' }}>
                
                {/* Widget 1: Pending approvals */}
                <div 
                  className="widget-card glass-panel"
                  style={{ borderLeft: '4px solid var(--warning)' }}
                >
                  <div className="widget-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>📝</div>
                  <div className="widget-value">{pendingApprovalsCount}</div>
                  <div className="widget-label" style={{ color: 'var(--text-secondary-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Pending Approvals</span>
                    {pendingApprovalsCount > 0 && (
                      <button 
                        onClick={() => setActiveTab('approvals')}
                        style={{ border: 'none', background: 'transparent', color: 'var(--warning)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Review &rarr;
                      </button>
                    )}
                  </div>
                </div>

                {/* Widget 2: Helpdesk tickets */}
                <div 
                  className="widget-card glass-panel"
                  style={{ borderLeft: '4px solid var(--info)' }}
                >
                  <div className="widget-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--info)' }}>🎫</div>
                  <div className="widget-value">{openTicketsCount}</div>
                  <div className="widget-label" style={{ color: 'var(--text-secondary-dark)' }}>Active Helpdesk Tickets</div>
                </div>

                {/* Widget 3: Duplicate alerts */}
                <div 
                  className="widget-card glass-panel"
                  style={{ borderLeft: '4px solid var(--error)' }}
                >
                  <div className="widget-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}>⚠️</div>
                  <div className="widget-value">5</div>
                  <div className="widget-label" style={{ color: 'var(--text-secondary-dark)' }}>Contact Duplicate Alerts</div>
                </div>

                {/* Widget 4: Total members */}
                <div 
                  className="widget-card glass-panel"
                  style={{ borderLeft: '4px solid var(--success)' }}
                >
                  <div className="widget-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>👥</div>
                  <div className="widget-value">{totalContactsCount}</div>
                  <div className="widget-label" style={{ color: 'var(--text-secondary-dark)' }}>Active Members Directory</div>
                </div>

              </div>

              {/* Layout split: recent activity and calendar */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '32px' }}>
                
                {/* Recent audit activity list */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🗂️</span> Recent Security Audits
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recentLogs.map(log => {
                      const date = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      let bColor = 'var(--info)';
                      if (log.action.includes('FAILURE')) bColor = 'var(--error)';
                      if (log.action.includes('SUCCESS') || log.action.includes('APPROVE') || log.action.includes('ENROLLED')) bColor = 'var(--success)';

                      return (
                        <div 
                          key={log.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: 'rgba(15, 23, 42, 0.3)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-dark)'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)' }}>{date} &bull; {log.actorName}</span>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '2px' }}>{log.action.replace(/_/g, ' ')}</h4>
                          </div>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: bColor }} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming programs list */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📅</span> Active Programs Schedule
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {mockDatabase.getPrograms().map(prog => (
                      <div 
                        key={prog.id}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: 'rgba(15, 23, 42, 0.3)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-dark)'
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', fontWeight: 600 }}>{prog.sreny}</span>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: '2px' }}>{prog.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '4px', fontWeight: 600 }}>📅 {prog.date}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: ADMINS LIST */}
          {activeTab === 'admins' && showAdminsTab && <AdminUsersList />}

          {/* TAB 3: APPROVALS */}
          {activeTab === 'approvals' && <EditRequestsList />}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'logs' && showLogsTab && <AuditLogTable />}

        </div>
      </main>
    </div>
  );
};
