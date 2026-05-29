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
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        className="member-portal-header"
        style={{
          height: '72px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-light)',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary-light)' }}>{profileName}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-light)' }}>Member Portal Workspace</span>
          </div>
        </div>

        <div className="member-portal-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <ThemeToggle iconOnly placement="header" />
          <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={onBack}>
            Back
          </button>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={logout}>
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
            onClick={() => setActiveSection('profile')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              fontSize: '0.9rem',
              backgroundColor: activeSection === 'profile' ? 'var(--primary-light)' : 'transparent',
              color: activeSection === 'profile' ? 'var(--primary)' : 'var(--text-secondary-light)',
            }}
          >
            My Profile
          </button>

          <button
            onClick={() => setActiveSection('workspace')}
            className="btn"
            style={{
              justifyContent: 'flex-start',
              padding: '12px 16px',
              fontSize: '0.9rem',
              backgroundColor: activeSection === 'workspace' ? 'var(--primary-light)' : 'transparent',
              color: activeSection === 'workspace' ? 'var(--primary)' : 'var(--text-secondary-light)',
            }}
          >
            Workspace Notice
          </button>
        </aside>

        <div className="member-portal-content" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '32px', boxShadow: 'var(--shadow-md)' }}>
          {activeSection === 'profile' && (
            <div className="animate-slide-up">
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '18px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Profile Directory Card</h2>
                <p style={{ color: 'var(--text-secondary-light)', fontSize: '0.85rem', marginTop: '2px' }}>
                  Existing visual framework is preserved while deprecated modules are removed.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-light)' }}>EMAIL ADDRESS</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>{memberUser.emailPrimary || '-'}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-light)' }}>PRIMARY PHONE</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>{memberUser.phonePrimary || '-'}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-light)' }}>ADDRESS</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>{memberUser.address || '-'}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary-light)' }}>MEMBERSHIPS</span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>{memberUser.memberships.length}</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'workspace' && (
            <div className="animate-slide-up">
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '18px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Workspace Transition</h2>
              </div>
              <div className="helper-box" style={{ backgroundColor: 'var(--info-light)', borderColor: 'rgba(59, 130, 246, 0.2)', color: '#1e3a8a' }}>
                Deprecated modules (profile edit-request workflow, helpdesk/tickets, programs/session legacy attendance, jobs/resumes) were removed and will be redesigned.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
