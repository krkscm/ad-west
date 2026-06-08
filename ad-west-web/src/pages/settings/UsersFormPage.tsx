import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../components/common/Toast';
import { SwitchToggle } from '../../components/common/SwitchToggle';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
import {
  AdminUserApi,
  backendApi,
  LocationDefinitionApi,
  PermissionSetApi,
  RoleDefinitionApi,
  UserApi,
} from '../../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};


interface UsersFormPageProps {
  editingUser: UserApi | null;
  onBack: () => void;
  onSaved: () => void;
}

export const UsersFormPage: React.FC<UsersFormPageProps> = ({ editingUser, onBack, onSaved }) => {
  const { addToast } = useToast();

  const [roles, setRoles] = useState<RoleDefinitionApi[]>([]);
  const [locations, setLocations] = useState<LocationDefinitionApi[]>([]);
  const [permissionSets, setPermissionSets] = useState<PermissionSetApi[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserApi[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'male' | 'female' | ''>('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRoleId, setFormRoleId] = useState('');
  const [formSthanId, setFormSthanId] = useState('');
  const [formPermissionSetId, setFormPermissionSetId] = useState('');
  const [formAdminManagement, setFormAdminManagement] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [formReportingToRoleIds, setFormReportingToRoleIds] = useState<string[]>([]);

  const [changePassword, setChangePassword] = useState(false);
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [reportingDropdownOpen, setReportingDropdownOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const reportingTriggerRef = useRef<HTMLButtonElement>(null);
  const reportingDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = reportingTriggerRef.current?.contains(target);
      const inPanel = reportingDropdownRef.current?.contains(target);
      if (!inTrigger && !inPanel) setReportingDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openReportingDropdown = () => {
    if (reportingTriggerRef.current) {
      const r = reportingTriggerRef.current.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setReportingDropdownOpen(o => !o);
  };

  useEffect(() => {
    const loadSupport = async () => {
      await Promise.allSettled([
        backendApi.listRoleDefinitions({ pageSize: 500 })
          .then((r) => setRoles(r.items))
          .catch(() => addToast('Failed to load roles.', 'error')),
        backendApi.listLocationDefinitions()
          .then(setLocations)
          .catch(() => addToast('Failed to load locations.', 'error')),
        backendApi.listPermissionSets()
          .then(setPermissionSets)
          .catch(() => addToast('Failed to load permission sets.', 'error')),
        backendApi.listAdminUsers()
          .then(setAdminUsers)
          .catch(() => undefined),
      ]);
    };
    void loadSupport();
  }, [addToast]);

  useEffect(() => {
    setFormName(editingUser?.name ?? '');
    setFormGender(editingUser?.gender ?? '');
    setFormPhone(editingUser?.phone ?? '');
    setFormEmail(editingUser?.email ?? '');
    setFormRoleId(editingUser?.roleId ?? '');
    setFormSthanId(editingUser?.sthanId ?? '');
    setFormPermissionSetId(editingUser?.permissionSetId ?? '');
    setFormAdminManagement(editingUser?.adminManagement ?? '');
    setIsSuperAdmin(editingUser?.isSuperAdmin ?? false);
    setFormReportingToRoleIds(editingUser?.reportingToRoleIds ?? []);
    setChangePassword(false);
    setFormPassword('');
    setShowPassword(false);
  }, [editingUser]);

  const activeRoles = useMemo(() => roles.filter((r) => r.active), [roles]);
  const sthans = useMemo(() => locations.filter((l) => l.level === 'STHAN' && l.active), [locations]);
  const activePermissionSets = useMemo(() => permissionSets.filter((p) => p.active), [permissionSets]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) { addToast('Name is required.', 'warning'); return; }
    if (!editingUser && !formPassword.trim()) {
      addToast('Password is required.', 'warning'); return;
    }
    if (editingUser && changePassword && !formPassword.trim()) {
      addToast('Enter a new password to reset it.', 'warning'); return;
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        await backendApi.updateUser(editingUser.id, {
          name: cleanName,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          gender: formGender || undefined,
          roleId: formRoleId || undefined,
          sthanId: formSthanId || undefined,
          permissionSetId: formPermissionSetId || undefined,
          adminManagement: formAdminManagement || undefined,
          password: changePassword ? formPassword.trim() : undefined,
          isSuperAdmin,
          reportingToRoleIds: formReportingToRoleIds,
        });
        addToast('User updated.', 'success');
        onSaved();
      } else {
        await backendApi.createUser({
          name: cleanName,
          password: formPassword.trim(),
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          gender: formGender || undefined,
          roleId: formRoleId || undefined,
          sthanId: formSthanId || undefined,
          permissionSetId: formPermissionSetId || undefined,
          adminManagement: formAdminManagement || undefined,
          isSuperAdmin,
          reportingToRoleIds: formReportingToRoleIds,
        });
        addToast('User created successfully.', 'success');
        onSaved();
      }
    } catch (e) {
      addToast(toUiError(e, 'Failed to save user.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="animate-slide-up">

      <PageHeader
        icon="👥"
        title={editingUser ? 'Edit User' : 'New User'}
        subtitle={editingUser ? editingUser.name : 'Create a user account with role, sthan, and access settings.'}
        actions={<button type="button" className="btn btn-secondary" onClick={onBack}>Back to List</button>}
      />

      <form onSubmit={(e) => void handleSave(e)} className="animate-stagger">

        {/* Top row: Profile+Security | Access */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start', marginBottom: '20px' }}>

          {/* Left column */}
          <div style={{ display: 'grid', gap: '16px' }}>

            {/* Profile card */}
            <FormSection title="Profile" accent="primary" flatHover>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Full Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <input className="form-input" placeholder="e.g. Kiran Raj" value={formName}
                  onChange={(e) => setFormName(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="+971 50 000 0000" value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="user@example.com" value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label className="form-label">Gender</label>
                <select
                  className="form-input"
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as 'male' | 'female' | '')}
                  style={{ cursor: 'pointer', maxWidth: '240px' }}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </FormSection>

            <FormSection title="Security" accent="warning" flatHover>

              {editingUser ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: changePassword ? '16px' : 0 }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Password Reset</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '2px' }}>
                        Set a new password for this user account
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setChangePassword(p => !p); setFormPassword(''); }}
                      style={{
                        padding: '7px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                        border: changePassword ? '1px solid rgba(239,68,68,0.35)' : '1px solid #f59e0b',
                        background: changePassword ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.08)',
                        color: changePassword ? '#ef4444' : '#f59e0b',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {changePassword ? 'Cancel' : 'Change Password'}
                    </button>
                  </div>
                  {changePassword && (
                    <div>
                      <label className="form-label">New Password *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          className="form-input"
                          type={showChangePassword ? 'text' : 'password'}
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                          minLength={8}
                          required
                          autoFocus
                          style={{ paddingRight: '48px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowChangePassword(p => !p)}
                          style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                            color: 'var(--text-secondary-dark)', fontSize: '1rem', lineHeight: 1,
                          }}
                          aria-label={showChangePassword ? 'Hide password' : 'Show password'}
                        >
                          {showChangePassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="form-label">Password <span style={{ color: 'var(--error)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Set initial password"
                      minLength={8}
                      required
                      style={{ paddingRight: '48px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                        color: 'var(--text-secondary-dark)', fontSize: '1rem', lineHeight: 1,
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginTop: '6px' }}>
                    The user will be prompted to reset this on first login.
                  </p>
                </div>
              )}
            </FormSection>

          </div>

          <FormSection title="Access" accent="success" flatHover>

            <div className="form-group">
              <label className="form-label">Admin Access</label>
              <SwitchToggle
                checked={isSuperAdmin}
                onChange={setIsSuperAdmin}
                labelOn="Super Admin"
                labelOff="Regular User"
              />
            </div>

            {/* Admin Management */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Admin Management</label>
              <select className="form-input" value={formAdminManagement} onChange={(e) => setFormAdminManagement(e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="">Not assigned</option>
                {adminUsers.filter((a) => a.active).map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                ))}
              </select>
            </div>

            {/* Permission Set */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Permission Set</label>
              <select className="form-input" value={formPermissionSetId} onChange={(e) => setFormPermissionSetId(e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="">No permission set</option>
                {activePermissionSets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Reporting To — custom multi-select dropdown */}
            <div>
              <label className="form-label">Reporting To</label>
              <div style={{ position: 'relative' }}>
                <button
                  ref={reportingTriggerRef}
                  type="button"
                  onClick={openReportingDropdown}
                  style={{
                    width: '100%', minHeight: '42px', padding: '8px 36px 8px 12px',
                    borderRadius: '8px', border: '1px solid var(--border-dark)',
                    background: 'var(--surface-dark-elevated)',
                    color: formReportingToRoleIds.length > 0 ? 'inherit' : 'var(--text-secondary-dark)',
                    fontSize: '0.875rem', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', position: 'relative',
                  }}
                >
                  <span style={{ flex: 1 }}>
                    {formReportingToRoleIds.length === 0
                      ? 'None selected'
                      : `${formReportingToRoleIds.length} role${formReportingToRoleIds.length > 1 ? 's' : ''} selected`}
                  </span>
                  <span style={{
                    position: 'absolute', right: '10px', top: '50%',
                    transform: `translateY(-50%) rotate(${reportingDropdownOpen ? 180 : 0}deg)`,
                    transition: 'transform 0.2s', color: 'var(--text-secondary-dark)',
                    fontSize: '0.75rem', pointerEvents: 'none',
                  }}>▼</span>
                </button>

                {reportingDropdownOpen && dropdownRect && createPortal(
                  <div ref={reportingDropdownRef} style={{
                    position: 'fixed', top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width, zIndex: 9999,
                    background: 'var(--surface-dark)', border: '1px solid var(--border-dark)',
                    borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    maxHeight: '220px', overflowY: 'auto',
                  }}>
                    {activeRoles.length === 0 ? (
                      <div style={{ padding: '16px 14px', fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                        No roles defined yet
                      </div>
                    ) : activeRoles.map((r) => {
                      const checked = formReportingToRoleIds.includes(r.id);
                      return (
                        <div
                          key={r.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                            padding: '9px 14px', fontSize: '0.875rem',
                            background: checked ? 'rgba(99,102,241,0.08)' : 'transparent',
                          }}
                        >
                          <span>
                            <span style={{ fontWeight: checked ? 600 : 400 }}>{r.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginLeft: '6px' }}>{r.level}</span>
                          </span>
                          <SwitchToggle
                            variant="inline"
                            checked={checked}
                            onChange={(nextChecked) => {
                              setFormReportingToRoleIds((prev) =>
                                nextChecked ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                              );
                            }}
                            ariaLabel={`Toggle reporting role ${r.name}`}
                          />
                        </div>
                      );
                    })}
                  </div>,
                  document.body
                )}
              </div>

              {formReportingToRoleIds.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {formReportingToRoleIds.map((id) => {
                    const role = activeRoles.find(r => r.id === id);
                    return role ? (
                      <span key={id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px 2px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                        background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                      }}>
                        {role.name}
                        <button
                          type="button"
                          onClick={() => setFormReportingToRoleIds(prev => prev.filter(x => x !== id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'inherit', lineHeight: 1, fontSize: '0.9rem' }}
                          aria-label={`Remove ${role.name}`}
                        >×</button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </FormSection>

        </div>

        <FormSection title="Organizational" accent="violet" flatHover>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Role</label>
              <select className="form-input" value={formRoleId} onChange={(e) => setFormRoleId(e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="">No role assigned</option>
                {activeRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.level})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sthan</label>
              <select className="form-input" value={formSthanId} onChange={(e) => setFormSthanId(e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="">No sthan assigned</option>
                {sthans.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
                ))}
              </select>
            </div>

          </div>
        </FormSection>

        <FormActions>
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ minWidth: '100px' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ minWidth: '140px' }}>
            {isSaving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
          </button>
        </FormActions>
      </form>
    </div>
  );
};

