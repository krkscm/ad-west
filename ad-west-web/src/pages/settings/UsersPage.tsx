import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';
import { PaginationBar } from '../../components/common/PaginationBar';
import { TableColumnFilterRow, type TableColumnFilterDef } from '../../components/common/TableColumnFilterRow';
import { TableColumnHeaderRow } from '../../components/common/TableColumnHeaderRow';
import { TableNoResultsRow } from '../../components/common/TableNoResultsRow';
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters';
import { useTableSort } from '../../hooks/useTableSort';
import { isListFilterActive } from '../../utils/tableListUtils';
import { useAdminDefinitions } from '../../context/admin-definitions-context';
import {
  backendApi,
  LocationDefinitionApi,
  RoleDefinitionApi,
  UserApi,
  type ListSortParams,
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
  const { filters, debouncedFilters, setFilter, clearFilters, filtersQuery } = useTableColumnFilters();
  const { sortBy, sortDir, toggleSort, clearSort, sortQuery } = useTableSort();

  const loadSupport = async () => {
    try {
      const r = await backendApi.listRoleDefinitions({ pageSize: 500 });
      setRoles(r.items);
    } catch (e) {
      addToast(toUiError(e, 'Failed to load roles.'), 'error');
    }
  };

  const loadUsers = async (p = page, ps = pageSize, q = search, colFilters = filtersQuery, sort: ListSortParams | undefined = sortQuery) => {
    setIsLoading(true);
    try {
      const res = await backendApi.listUsers({ page: p, pageSize: ps, search: q || undefined, filters: colFilters, ...sort });
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

  useEffect(() => {
    setPage(1);
    void loadUsers(1, pageSize, search, filtersQuery);
  }, [debouncedFilters]);

  useEffect(() => {
    setPage(1);
    void loadUsers(1, pageSize, search, filtersQuery, sortQuery);
  }, [sortBy, sortDir]);

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

  const userFilterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'name', label: 'Name', filterable: true, placeholder: 'Name…' },
    { key: 'gender', label: 'Gender', filterable: true, placeholder: 'Gender…' },
    { key: 'phone', label: 'Phone', filterable: true, placeholder: 'Phone…' },
    { key: 'email', label: 'Email', filterable: true, placeholder: 'Email…' },
    {
      key: 'roleId',
      label: 'Role',
      filterable: true,
      filterType: 'select',
      placeholder: 'All roles',
      options: roles.map((r) => ({ value: r.id, label: r.name })),
    },
    {
      key: 'sthanId',
      label: 'Sthan',
      filterable: true,
      filterType: 'select',
      placeholder: 'All sthans',
      options: locations.filter((l) => l.level === 'STHAN' && l.active).map((l) => ({ value: l.id, label: l.name })),
    },
    {
      key: 'active',
      label: 'Active',
      filterable: true,
      filterType: 'select',
      placeholder: 'All',
      options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
    },
    { key: '__actions__', label: 'Actions', filterable: false, sortable: false, align: 'right' },
  ], [roles, locations]);

  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim());
  const hasFiltersActive = isListFilterActive(search, hasColumnFilters);
  const showEmptyState = !isLoading && users.length === 0 && !hasFiltersActive;
  const hasTable = !isLoading && (users.length > 0 || hasFiltersActive);

  const clearAllFilters = () => {
    clearFilters();
    clearSort();
    setSearch('');
    setSearchInput('');
    setPage(1);
    void loadUsers(1, pageSize, '', undefined, undefined);
  };

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
      ) : showEmptyState ? (
        <EmptyState
          icon="👤"
          title="No users yet"
          copy="Click &quot;New User&quot; to add one."
          action={(
            <button type="button" className="btn btn-primary" onClick={onAdd}>New User</button>
          )}
        />
      ) : (
        <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <table className="custom-table">
            <thead>
              <TableColumnHeaderRow
                columns={userFilterColumns}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <TableColumnFilterRow
                columns={userFilterColumns}
                values={filters}
                onChange={setFilter}
                onClear={clearAllFilters}
              />
            </thead>
            <tbody>
              {users.length === 0 ? (
                <TableNoResultsRow colSpan={8} title="No users match your filters" onClearFilters={clearAllFilters} />
              ) : users.map((u) => {
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
