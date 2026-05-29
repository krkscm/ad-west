import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import {
  backendApi,
  LocationDefinitionApi,
  RoleDefinitionApi,
  UserApi,
} from '../../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '8px',
  border: '1px solid var(--border-dark)', background: 'var(--surface-dark-elevated)',
  color: 'var(--text-primary-dark)', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box',
};
const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface UsersPageProps {
  onAdd: () => void;
  onEdit: (user: UserApi) => void;
  editingUserId?: string | null;
}

export const UsersPage: React.FC<UsersPageProps> = ({ onAdd, onEdit, editingUserId }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [users, setUsers] = useState<UserApi[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [roles, setRoles] = useState<RoleDefinitionApi[]>([]);
  const [locations, setLocations] = useState<LocationDefinitionApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSupport = async () => {
    try {
      const r = await backendApi.listRoleDefinitions({ pageSize: 500 });
      setRoles(r.items);
    } catch (e) {
      addToast(toUiError(e, 'Failed to load roles.'), 'error');
    }
    try {
      const loc = await backendApi.listLocationDefinitions();
      setLocations(loc);
    } catch (e) {
      addToast(toUiError(e, 'Failed to load locations.'), 'error');
    }
  };

  const loadUsers = async (p = page, ps = pageSize, q = search) => {
    setIsLoading(true);
    try {
      const res = await backendApi.listUsers({ page: p, pageSize: ps, search: q || undefined });
      setUsers(res.items); setTotal(res.total);
      setPage(res.page); setPageSize(res.pageSize); setTotalPages(res.totalPages);
    } catch (e) { addToast(toUiError(e, 'Failed to load users.'), 'error'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    void loadSupport();
    void loadUsers(1, pageSize, '');
  }, []);

  // Debounced search — fires API after 400 ms idle
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
      void loadUsers(1, pageSize, value);
    }, 400);
  };

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps); setPage(1);
    void loadUsers(1, ps, search);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    void loadUsers(p, pageSize, search);
  };

  const roleById = useMemo(() => {
    const m = new Map<string, RoleDefinitionApi>();
    roles.forEach((r) => m.set(r.id, r));
    return m;
  }, [roles]);

  const locationById = useMemo(() => {
    const m = new Map<string, LocationDefinitionApi>();
    locations.forEach((l) => m.set(l.id, l));
    return m;
  }, [locations]);

  const handleToggleActive = async (u: UserApi) => {
    try {
      await backendApi.updateUser(u.id, { active: !u.active });
      addToast(`User ${u.active ? 'deactivated' : 'activated'}.`, 'success');
      void loadUsers(page, pageSize, search);
    } catch (e) { addToast(toUiError(e, 'Failed to update.'), 'error'); }
  };

  const handleDelete = async (u: UserApi) => {
    const ok = await confirm({ title: 'Delete User', message: `Delete "${u.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deleteUser(u.id);
      addToast('User deleted.', 'success');
      // Go back a page if last item on current page was deleted
      const newPage = users.length === 1 && page > 1 ? page - 1 : page;
      void loadUsers(newPage, pageSize, search);
    } catch (e) { addToast(toUiError(e, 'Failed to delete.'), 'error'); }
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const nums: (number | '…')[] = [1];
    if (page > 3) nums.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i);
    if (page < totalPages - 2) nums.push('…');
    nums.push(totalPages);
    return nums;
  }, [page, totalPages]);

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Users</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>
            Manage application users with role and sthan assignments.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[{ label: 'Total', count: total, color: '#818cf8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' },
              { label: 'Active', count: users.filter((u) => u.active).length, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' }].map(({ label, count, color, bg, border }) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: bg, color, border: `1px solid ${border}` }}>
                <span style={{ fontWeight: 800 }}>{count}</span>{label}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={onAdd}>
          <span style={{ fontSize: '1.15rem' }}>+</span>
          New User
        </button>
      </div>

      {/* Search + Page Size */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
          <input style={{ ...inputStyle, paddingLeft: '36px' }} placeholder="Search name, email or phone…"
            value={searchInput} onChange={(e) => handleSearchChange(e.target.value)} />
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary-dark)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>Rows:</span>
          {PAGE_SIZE_OPTIONS.map((ps) => (
            <button key={ps} type="button"
              style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-dark)', background: pageSize === ps ? 'var(--primary)' : 'transparent', color: pageSize === ps ? '#fff' : 'var(--text-secondary-dark)' }}
              onClick={() => handlePageSizeChange(ps)}>{ps}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>Loading users…</div>
      ) : users.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
          {search ? 'No users match your search.' : 'No users yet. Click "New User" to add one.'}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--table-head-bg)', borderBottom: '1px solid var(--border-dark)' }}>
                {['Name', 'Phone', 'Email', 'Role', 'Sthan', 'Active', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const role = u.roleId ? roleById.get(u.roleId) : undefined;
                const sthan = u.sthanId ? locationById.get(u.sthanId) : undefined;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-dark)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--table-row-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 18px', fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: '12px 18px', color: 'var(--text-secondary-dark)', fontSize: '0.84rem' }}>{u.phone ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ padding: '12px 18px', color: 'var(--text-secondary-dark)', fontSize: '0.84rem' }}>{u.email ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {role ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(99,102,241,0.25)' }}>
                            {role.name}
                          </span>
                        ) : <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>}
                        {u.isSuperAdmin && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(16,185,129,0.25)' }}>
                            Super Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      {sthan ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(245,158,11,0.25)' }}>
                          {sthan.name}
                        </span>
                      ) : <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 18px', width: '80px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: u.active ? '#10b981' : '#94a3b8' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: u.active ? '#10b981' : '#94a3b8' }} />
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', width: '230px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => onEdit(u)}>{editingUserId === u.id ? 'Editing...' : '✎ Edit'}</button>
                        <button style={{ background: 'transparent', border: `1px solid ${u.active ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', color: u.active ? '#f87171' : '#34d399' }}
                          onClick={() => void handleToggleActive(u)}>{u.active ? '⊘ Deactivate' : '✓ Activate'}</button>
                        <button style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '6px', padding: '4px 9px', cursor: 'pointer', fontSize: '0.85rem', color: '#f87171' }}
                          onClick={() => void handleDelete(u)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button type="button" disabled={page <= 1}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-dark)', background: 'transparent', color: page <= 1 ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)', cursor: page <= 1 ? 'default' : 'pointer', fontSize: '0.84rem', opacity: page <= 1 ? 0.4 : 1 }}
                  onClick={() => handlePageChange(page - 1)}>‹ Prev</button>
                {pageNumbers.map((n, i) =>
                  n === '…' ? (
                    <span key={`ellipsis-${i}`} style={{ padding: '5px 4px', color: 'var(--text-secondary-dark)', fontSize: '0.84rem' }}>…</span>
                  ) : (
                    <button key={n} type="button"
                      style={{ minWidth: '34px', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-dark)', background: n === page ? 'var(--primary)' : 'transparent', color: n === page ? '#fff' : 'var(--text-primary-dark)', cursor: n === page ? 'default' : 'pointer', fontSize: '0.84rem', fontWeight: n === page ? 700 : 400 }}
                      onClick={() => n !== page && handlePageChange(n as number)}>{n}</button>
                  )
                )}
                <button type="button" disabled={page >= totalPages}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-dark)', background: 'transparent', color: page >= totalPages ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)', cursor: page >= totalPages ? 'default' : 'pointer', fontSize: '0.84rem', opacity: page >= totalPages ? 0.4 : 1 }}
                  onClick={() => handlePageChange(page + 1)}>Next ›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
