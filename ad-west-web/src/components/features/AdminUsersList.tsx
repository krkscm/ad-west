import React, { useState, useEffect } from 'react';
import { mockDatabase } from '../../utils/mockDatabase';
import { hashPassword, createTotpSecret } from '../../utils/mockAuth';
import { AdminUser, AdminRole, ScopeType } from '../../types';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';

export const AdminUsersList: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AdminRole>('Sreny Admin');
  const [selectedScopeId, setSelectedScopeId] = useState('sreny_silicon_valley');

  const { addToast } = useToast();

  const loadAdmins = () => {
    setAdmins(mockDatabase.getAdmins());
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const openAddModal = () => {
    setEditingAdmin(null);
    setName('');
    setEmail('');
    setPassword('');
    setSelectedRole('Sreny Admin');
    setSelectedScopeId('sreny_silicon_valley');
    setIsModalOpen(true);
  };

  const openEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setName(admin.name);
    setEmail(admin.email);
    setPassword('');
    
    const roleAssignment = admin.roles[0];
    if (roleAssignment) {
      setSelectedRole(roleAssignment.role);
      setSelectedScopeId(roleAssignment.scopeId);
    }
    
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (id === 'admin_super') {
      addToast('Cannot delete primary Super Admin!', 'error');
      return;
    }
    if (window.confirm('Are you sure you want to delete this administrator? This action will take effect immediately.')) {
      mockDatabase.deleteAdmin(id);
      mockDatabase.addAuditLog({
        actorId: 'admin_super',
        actorName: 'Sarah Connor',
        action: 'DELETE_ADMIN',
        entityType: 'AdminUser',
        entityId: id,
        oldVal: { id },
        newVal: null
      });
      addToast('Administrator deleted successfully.', 'success');
      loadAdmins();
    }
  };

  const handleResetMfa = (admin: AdminUser) => {
    if (window.confirm(`Reset MFA for ${admin.name}? They will be forced to enroll a new authenticator device on their next login.`)) {
      mockDatabase.saveAdmin({
        ...admin,
        mfaEnabled: false,
        totpSecret: createTotpSecret()
      });
      mockDatabase.addAuditLog({
        actorId: 'admin_super',
        actorName: 'Sarah Connor',
        action: 'MFA_RESET',
        entityType: 'AdminUser',
        entityId: admin.id,
        oldVal: { mfaEnabled: admin.mfaEnabled },
        newVal: { mfaEnabled: false }
      });
      addToast(`MFA secret reset for ${admin.name}.`, 'success');
      loadAdmins();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      addToast('Please fill in all required fields.', 'warning');
      return;
    }

    if (!editingAdmin && !password.trim()) {
      addToast('Password is required for new administrators.', 'warning');
      return;
    }

    // Determine scope values
    let scopeType: ScopeType = 'global';
    if (selectedRole === 'Zone Admin') scopeType = 'zone';
    if (selectedRole === 'Sreny Admin') scopeType = 'sreny';

    const cleanScopeId = selectedRole === 'Super Admin' ? 'global' : selectedScopeId;

    const adminsList = mockDatabase.getAdmins();
    
    // Check email uniqueness
    const emailExists = adminsList.some(
      a => a.email.toLowerCase() === email.toLowerCase().trim() && a.id !== editingAdmin?.id
    );
    if (emailExists) {
      addToast('An administrator with this email already exists.', 'error');
      return;
    }

    if (editingAdmin) {
      // Editing existing admin
      const updatedAdmin: AdminUser = {
        ...editingAdmin,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        roles: [
          {
            id: editingAdmin.roles[0]?.id || `role_${Math.random().toString(36).substr(2, 9)}`,
            adminUserId: editingAdmin.id,
            role: selectedRole,
            scopeType,
            scopeId: cleanScopeId
          }
        ]
      };
      
      mockDatabase.saveAdmin(updatedAdmin);
      mockDatabase.addAuditLog({
        actorId: 'admin_super',
        actorName: 'Sarah Connor',
        action: 'UPDATE_ADMIN',
        entityType: 'AdminUser',
        entityId: editingAdmin.id,
        oldVal: editingAdmin,
        newVal: updatedAdmin
      });

      addToast('Administrator details updated.', 'success');
    } else {
      // Creating new admin
      const newAdminId = `admin_${Math.random().toString(36).substr(2, 9)}`;
      const newAdmin: AdminUser = {
        id: newAdminId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: hashPassword(password),
        totpSecret: createTotpSecret(),
        mfaEnabled: false,
        createdAt: new Date().toISOString(),
        roles: [
          {
            id: `role_${Math.random().toString(36).substr(2, 9)}`,
            adminUserId: newAdminId,
            role: selectedRole,
            scopeType,
            scopeId: cleanScopeId
          }
        ]
      };

      mockDatabase.saveAdmin(newAdmin);
      mockDatabase.addAuditLog({
        actorId: 'admin_super',
        actorName: 'Sarah Connor',
        action: 'CREATE_ADMIN',
        entityType: 'AdminUser',
        entityId: newAdminId,
        oldVal: null,
        newVal: { name: newAdmin.name, email: newAdmin.email, role: selectedRole, scope: cleanScopeId }
      });

      addToast('New administrator created successfully.', 'success');
    }

    setIsModalOpen(false);
    loadAdmins();
  };

  return (
    <div className="animate-slide-up">
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Administrator User Management</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
            Provision administration accounts, configure hierarchical scopes, and monitor security statuses.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <span>➕</span> Add Administrator
        </button>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Target Scope</th>
              <th>MFA Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => {
              const roleAssignment = admin.roles[0];
              const displayScope = roleAssignment?.scopeId === 'global' 
                ? 'All Regions (Global)' 
                : roleAssignment?.scopeId.replace(/_/g, ' ').replace('zone ', 'Zone ').replace('sreny ', 'Sreny ');

              return (
                <tr key={admin.id}>
                  <td style={{ fontWeight: 600 }}>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>
                    <span 
                      className={`badge ${
                        roleAssignment?.role === 'Super Admin' 
                          ? 'badge-error' 
                          : roleAssignment?.role === 'Zone Admin' 
                            ? 'badge-warning' 
                            : 'badge-info'
                      }`}
                    >
                      {roleAssignment?.role || 'No Role'}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {displayScope || 'Unassigned'}
                  </td>
                  <td>
                    {admin.mfaEnabled ? (
                      <span className="badge badge-success">🛡️ Active</span>
                    ) : (
                      <span className="badge badge-warning">⚠️ Setup Pending</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => openEditModal(admin)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                        onClick={() => handleResetMfa(admin)}
                      >
                        Reset MFA
                      </button>
                      <button 
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleDelete(admin.id)}
                        disabled={admin.id === 'admin_super'}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit/Add Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingAdmin ? 'Edit Administrator Settings' : 'Create New Administrator'}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Clark Kent"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input 
              type="email" 
              className="form-input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="e.g. clark.k@adwest.org"
              required
            />
          </div>

          {!editingAdmin && (
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input 
                type="password" 
                className="form-input" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Administrative Role *</label>
            <select 
              className="form-input"
              value={selectedRole}
              onChange={e => {
                const role = e.target.value as AdminRole;
                setSelectedRole(role);
                if (role === 'Zone Admin') setSelectedScopeId('zone_west_coast');
                if (role === 'Sreny Admin') setSelectedScopeId('sreny_silicon_valley');
              }}
              style={{ cursor: 'pointer' }}
            >
              <option value="Super Admin">Super Admin</option>
              <option value="Zone Admin">Zone Admin</option>
              <option value="Sreny Admin">Sreny Admin</option>
            </select>
          </div>

          {selectedRole !== 'Super Admin' && (
            <div className="form-group">
              <label className="form-label">Assigned Jurisdiction (Scope) *</label>
              {selectedRole === 'Zone Admin' ? (
                <select 
                  className="form-input"
                  value={selectedScopeId}
                  onChange={e => setSelectedScopeId(e.target.value)}
                >
                  <option value="zone_west_coast">West Coast Zone</option>
                  <option value="zone_east_coast">East Coast Zone</option>
                </select>
              ) : (
                <select 
                  className="form-input"
                  value={selectedScopeId}
                  onChange={e => setSelectedScopeId(e.target.value)}
                >
                  <option value="sreny_silicon_valley">Silicon Valley Sreny</option>
                  <option value="sreny_oakland">Oakland Sreny</option>
                  <option value="sreny_abu_dhabi_core">Abu Dhabi Core Sreny</option>
                </select>
              )}
            </div>
          )}

          <div style={{ marginTop: '28px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Administrator
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
