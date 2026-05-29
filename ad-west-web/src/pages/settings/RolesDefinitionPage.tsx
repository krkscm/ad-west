import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
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

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ── Page header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Roles Definition</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px', margin: '4px 0 0' }}>
            Configure and maintain standard roles and administrative level assignments.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '16px', paddingRight: '16px' }}
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
      </div>

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
                <button type="button" className="btn btn-secondary" onClick={resetForm} style={{ flex: 1, fontSize: '0.875rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ flex: 2, fontSize: '0.875rem' }}>
                  {isSaving ? 'Saving…' : editingRoleId ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Toolbar: search + filters ── */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          marginBottom: '0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderBottom: '1px solid var(--border-dark)',
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 240px', position: 'relative', maxWidth: '360px' }}>
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary-dark)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input
            className="form-input"
            style={{ paddingLeft: '34px', marginBottom: 0, fontSize: '0.875rem' }}
            placeholder="Search by code or name…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border-dark)' }} />

        {/* Page size */}
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

        {/* Record count */}
        {!isLoading && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {total} {total === 1 ? 'role' : 'roles'}
          </span>
        )}
        {isLoading && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            Loading…
          </span>
        )}
      </div>

      {/* ── Table ── */}
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
            {isLoading ? (
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid var(--border-dark)' }}
                >
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ padding: '14px 20px' }}>
                      <div
                        style={{
                          height: '14px',
                          borderRadius: '6px',
                          background: 'var(--border-dark)',
                          width: j === 4 ? '120px' : j === 3 ? '60px' : j === 2 ? '60px' : '100%',
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedRoles.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: '56px 24px',
                    color: 'var(--text-secondary-dark)',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗂️</div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>No roles found</div>
                  <div style={{ fontSize: '0.83rem' }}>
                    {search ? 'Try a different search term.' : 'Click "New Role" to create the first one.'}
                  </div>
                </td>
              </tr>
            ) : (
              sortedRoles.map((role) => (
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
                  <td style={{ padding: '10px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => startEdit(role)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Edit
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '0.8rem', 
                          color: role.active ? 'var(--error)' : 'var(--success)',
                          borderColor: role.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          background: role.active ? 'rgba(239, 68, 68, 0.02)' : 'rgba(16, 185, 129, 0.02)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onClick={() => void handleToggleActive(role)}
                      >
                        {role.active ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Deactivate
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                            Activate
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 10px',
                          color: 'var(--error)',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                          background: 'rgba(239, 68, 68, 0.02)',
                        }}
                        onClick={() => void handleDelete(role)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 0 && (
        <div
          style={{
            marginTop: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.82rem' }}>
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total} {total === 1 ? 'role' : 'roles'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page <= 1}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-dark)',
                color: page <= 1 ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              «
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-dark)',
                color: page <= 1 ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              ‹ Prev
            </button>

            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                style={{
                  background: p === page ? 'var(--primary)' : 'transparent',
                  border: `1px solid ${p === page ? 'var(--primary)' : 'var(--border-dark)'}`,
                  color: p === page ? '#fff' : 'var(--text-primary-dark)',
                  padding: '5px 11px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: p === page ? 700 : 400,
                  cursor: 'pointer',
                  minWidth: '34px',
                }}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-dark)',
                color: page >= totalPages ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              Next ›
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-dark)',
                color: page >= totalPages ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

