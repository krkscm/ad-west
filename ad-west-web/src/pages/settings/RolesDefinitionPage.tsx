import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';
import { PaginationBar } from '../../components/common/PaginationBar';
import { backendApi, RoleDefinitionApi } from '../../utils/backendApi';

type RoleLevel = RoleDefinitionApi['level'];

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match && match[1]) {
    return match[1];
  }

  return error.message || fallback;
};

const LevelBadge: React.FC<{ level: RoleLevel }> = ({ level }) => (
  <span
    className={level === 'ZONE' ? 'badge badge-info' : 'badge badge-warning'}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 8px',
      fontSize: '0.75rem',
      fontWeight: 600,
      border: '1px solid currentColor',
      background: 'transparent',
    }}
  >
    <span>{level === 'ZONE' ? '🏢' : '📍'}</span>
    <span>{level === 'ZONE' ? 'Zone' : 'Sthan'}</span>
  </span>
);

export const RolesDefinitionPage: React.FC = () => {
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [roles, setRoles] = useState<RoleDefinitionApi[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<RoleLevel>('ZONE');

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.code.localeCompare(b.code)),
    [roles],
  );

  const resetForm = () => {
    setEditingRoleId(null);
    setCode('');
    setName('');
    setLevel('ZONE');
    setFormOpen(false);
  };

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const response = await backendApi.listRoleDefinitions({ page, pageSize, search });
      setRoles(response.items);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      if (response.page !== page) {
        setPage(response.page);
      }
    } catch (error) {
      addToast(toUiError(error, 'Failed to load role definitions.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, [page, pageSize, search]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode || !cleanName) {
      addToast('Code and name are required.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      if (editingRoleId) {
        await backendApi.updateRoleDefinition(editingRoleId, {
          code: cleanCode,
          name: cleanName,
          level,
        });
        addToast('Role updated successfully.', 'success');
      } else {
        await backendApi.createRoleDefinition({
          code: cleanCode,
          name: cleanName,
          level,
          active: true,
        });
        addToast('Role created successfully.', 'success');
      }

      resetForm();
      await loadRoles();
    } catch (error) {
      addToast(toUiError(error, 'Failed to save role definition.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (role: RoleDefinitionApi) => {
    setEditingRoleId(role.id);
    setCode(role.code);
    setName(role.name);
    setLevel(role.level);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActive = async (role: RoleDefinitionApi) => {
    try {
      await backendApi.updateRoleDefinitionStatus(role.id, !role.active);
      addToast(`Role ${role.active ? 'deactivated' : 'activated'} successfully.`, 'success');
      await loadRoles();
    } catch (error) {
      addToast(toUiError(error, 'Failed to update role status.'), 'error');
    }
  };

  const handleDelete = async (role: RoleDefinitionApi) => {
    const accepted = await confirm({
      title: 'Delete Role',
      message: `Delete role "${role.code}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!accepted) return;

    try {
      await backendApi.deleteRoleDefinition(role.id);
      addToast('Role deleted successfully.', 'success');
      if (editingRoleId === role.id) {
        resetForm();
      }
      await loadRoles();
    } catch (error) {
      addToast(toUiError(error, 'Failed to delete role.'), 'error');
    }
  };

  const hasTable = !isLoading && sortedRoles.length > 0;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      <PageHeader
        icon="🎭"
        title="Roles Definition"
        subtitle="Configure and maintain standard roles and administrative level assignments."
        actions={
          <button
            type="button"
            className={`btn ${formOpen && !editingRoleId ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => {
              if (formOpen && !editingRoleId) {
                setFormOpen(false);
              } else {
                resetForm();
                setFormOpen(true);
              }
            }}
          >
            {formOpen && !editingRoleId ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            )}
            {formOpen && !editingRoleId ? 'Close' : 'New Role'}
          </button>
        }
      />

      {/* ── Collapsible form ── */}
      {formOpen && (
        <div
          className="glass-panel"
          style={{
            padding: '20px 24px',
            marginBottom: '20px',
            borderLeft: '3px solid var(--primary)',
            animation: 'slideUp 0.22s ease',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingRoleId ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Edit Role Definition
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                New Role Definition
              </>
            )}
          </h3>
          <form onSubmit={handleSave}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                alignItems: 'end',
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>Code *</label>
                <input
                  className="form-input"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="e.g. ZONE_COORD"
                  maxLength={40}
                  required
                  autoFocus
                  style={{ fontSize: '0.875rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>Name *</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Zone Coordinator"
                  maxLength={120}
                  required
                  style={{ fontSize: '0.875rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>Level *</label>
                <select
                  className="form-input"
                  value={level}
                  onChange={(event) => setLevel(event.target.value as RoleLevel)}
                  style={{ fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  <option value="ZONE">Zone</option>
                  <option value="STHAN">Sthan</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary btn-md" onClick={resetForm} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-md" disabled={isSaving} style={{ flex: 2 }}>
                  {isSaving ? 'Saving…' : editingRoleId ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Toolbar: search + filters ── */}
      <div
        className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`}
        style={{ marginBottom: hasTable ? 0 : '16px' }}
      >
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input
            className="form-input"
            placeholder="Search by code or name…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>Show</span>
          <select
            className="form-input"
            style={{ width: 'auto', padding: '6px 28px 6px 12px', marginBottom: 0, fontSize: '0.8rem', cursor: 'pointer' }}
            value={String(pageSize)}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <div className="list-toolbar__meta">
          {!isLoading && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>
              {total} {total === 1 ? 'role' : 'roles'}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading roles…</div>
      ) : sortedRoles.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No roles found"
          copy={search ? 'Try a different search term.' : 'Click "New Role" to create the first one.'}
        />
      ) : (
      <div
        className="table-container"
        style={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          boxShadow: 'none',
        }}
      >
        <table className="custom-table">
          <thead>
            <tr>
              {['Code', 'Name', 'Level', 'Status', 'Actions'].map((col) => (
                <th
                  key={col}
                  style={{
                    textAlign: col === 'Actions' ? 'right' : 'left',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRoles.map((role) => (
                <tr
                  key={role.id}
                  style={{ opacity: role.active ? 1 : 0.55 }}
                >
                  {/* Code */}
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <code
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        background: 'var(--chip-bg-soft)',
                        color: 'var(--text-primary-dark)',
                        padding: '3px 8px',
                        borderRadius: '5px',
                      }}
                    >
                      {role.code}
                    </code>
                  </td>

                  {/* Name */}
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>{role.name}</td>

                  {/* Level */}
                  <td style={{ padding: '14px 20px' }}>
                    <LevelBadge level={role.level} />
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.8rem', 
                      fontWeight: 600,
                      color: role.active ? 'var(--success)' : 'var(--error)' 
                    }}>
                      <span 
                        className="status-dot"
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: role.active ? 'var(--success)' : 'var(--error)',
                          boxShadow: role.active ? '0 0 8px var(--success)' : '0 0 8px var(--error)',
                          display: 'inline-block',
                          animation: role.active ? 'pulse 2s infinite' : 'none'
                        }} 
                      />
                      {role.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '10px 20px', textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${role.name}`}
                      actions={[
                        { label: 'Edit', onClick: () => startEdit(role) },
                        { label: role.active ? 'Deactivate' : 'Activate', tone: role.active ? 'warning' : 'success', onClick: () => void handleToggleActive(role) },
                        { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(role) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
      )}
    </div>
  );
};

