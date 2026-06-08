import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { ThemeToggle } from '../components/common/ThemeToggle';

interface MemberPortalPageProps {
  onBack: () => void;
}

type ActiveSection = 'profile' | 'workspace';

export const MemberPortalPage: React.FC<MemberPortalPageProps> = ({ onBack }) => {
  const { memberUser, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<ActiveSection>('profile');

  const profileName = useMemo(() => {
    if (!memberUser) return 'Member';
    return `${memberUser.firstName} ${memberUser.lastName}`.trim();
  }, [memberUser]);

  if (!memberUser) {
    return null;
  }

  return (
    <div className="member-portal-shell">
      <header className="member-portal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
            }}
          >
            {(memberUser.firstName?.[0] ?? 'M').toUpperCase()}
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary-dark)', margin: 0 }}>{profileName}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)' }}>Member Portal Workspace</span>
          </div>
        </div>

        <div className="member-portal-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <ThemeToggle iconOnly placement="header" />
          <button className="btn btn-secondary btn-md" onClick={onBack}>
            Back
          </button>
          <button className="btn btn-danger-outline" onClick={logout}>
            Log Out
          </button>
        </div>
      </header>

      <div
        className="member-portal-layout"
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '32px',
          gap: '24px',
        }}
      >
        <aside className="member-portal-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            className={`btn member-portal-nav-btn${activeSection === 'profile' ? ' is-active' : ''}`}
          >
            My Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('workspace')}
            className={`btn member-portal-nav-btn${activeSection === 'workspace' ? ' is-active' : ''}`}
          >
            Workspace Notice
          </button>
        </aside>

        <div className="member-portal-card member-portal-content">
          {activeSection === 'profile' && (
            <div className="animate-slide-up">
              <div style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: '18px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary-dark)', margin: 0 }}>Profile Directory Card</h2>
                <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem', marginTop: '2px' }}>
                  Existing visual framework is preserved while deprecated modules are removed.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-dark)' }}>EMAIL ADDRESS</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px', color: 'var(--text-primary-dark)' }}>{memberUser.emailPrimary || '-'}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-dark)' }}>PRIMARY PHONE</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px', color: 'var(--text-primary-dark)' }}>{memberUser.phonePrimary || '-'}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-dark)' }}>ADDRESS</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px', color: 'var(--text-primary-dark)' }}>{memberUser.address || '-'}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-dark)' }}>MEMBERSHIPS</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px', color: 'var(--text-primary-dark)' }}>{memberUser.memberships.length}</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'workspace' && (
            <div className="animate-slide-up">
              <div style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: '18px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary-dark)', margin: 0 }}>Workspace Transition</h2>
              </div>
              <div className="helper-box">
                Deprecated modules (profile edit-request workflow, helpdesk/tickets, programs/session legacy attendance, jobs/resumes) were removed and will be redesigned.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
