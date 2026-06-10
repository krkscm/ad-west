import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';
import { PaginationBar } from '../../components/common/PaginationBar';
import { useAdminDefinitions } from '../../context/admin-definitions-context';
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

interface UsersPageProps {
  onAdd: () => void;
  onEdit: (user: UserApi) => void;
  editingUserId?: string | null;
}

export const UsersPage: React.FC<UsersPageProps> = ({ onAdd, onEdit, editingUserId }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const { locationDefinitions } = useAdminDefinitions();

  const [users, setUsers] = useState<UserApi[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
    setLocations(locationDefinitions);
  }, [locationDefinitions]);

  useEffect(() => {
    void loadSupport();
    void loadUsers(1, pageSize, '');
  }, []);

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
      const newPage = users.length === 1 && page > 1 ? page - 1 : page;
      void loadUsers(newPage, pageSize, search);
    } catch (e) { addToast(toUiError(e, 'Failed to delete.'), 'error'); }
  };

  const hasTable = !isLoading && users.length > 0;

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="👥"
        title="Users"
        subtitle="Manage application users with role and sthan assignments."
        stats={[
          { label: 'Total', value: total, variant: 'info' },
          { label: 'Active', value: users.filter((u) => u.active).length, variant: 'success' },
        ]}
        actions={
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <span style={{ fontSize: '1.15rem' }}>+</span>
            New User
          </button>
        }
      />

      <div className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`} style={{ marginBottom: hasTable ? 0 : '16px' }}>
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input
            className="form-input"
            placeholder="Search name, email or phone…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading users…</div>
      ) : users.length === 0 ? (
        <EmptyState
          icon="👤"
          title={search ? 'No users match your search' : 'No users yet'}
          copy={search ? 'Try a different search term.' : 'Click "New User" to add one.'}
          action={!search ? (
            <button type="button" className="btn btn-primary" onClick={onAdd}>New User</button>
          ) : undefined}
        />
      ) : (
        <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                {['Name', 'Gender', 'Phone', 'Email', 'Role', 'Sthan', 'Active', 'Actions'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const role = u.roleId ? roleById.get(u.roleId) : undefined;
                const sthan = u.sthanId ? locationById.get(u.sthanId) : undefined;
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ fontSize: '0.84rem', textTransform: 'capitalize' }}>
                      {u.gender ?? <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.84rem' }}>{u.phone ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.84rem' }}>{u.email ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {role ? (
                          <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>{role.name}</span>
                        ) : <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>}
                        {u.isSuperAdmin && (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Super Admin</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {sthan ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.78rem' }}>{sthan.name}</span>
                      ) : <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>}
                    </td>
                    <td style={{ width: '80px' }}>
                      <span className={`badge ${u.active ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '0.8rem' }}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                      <TableRowActionsMenu
                        ariaLabel={`Actions for ${u.name}`}
                        actions={[
                          { label: editingUserId === u.id ? 'Editing…' : 'Edit', onClick: () => onEdit(u), disabled: editingUserId === u.id },
                          { label: u.active ? 'Deactivate' : 'Activate', tone: u.active ? 'warning' : 'success', onClick: () => void handleToggleActive(u) },
                          { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(u) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
};
