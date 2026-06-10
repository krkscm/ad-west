import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { PaginationBar } from '../../components/common/PaginationBar';
import { useAdminDefinitions } from '../../context/admin-definitions-context';
import { backendApi, LocationDefinitionApi, PermissionApi, PermissionSetApi, SreniDefinitionApi, type ListSortParams } from '../../utils/backendApi';
import { formatPermissionLabel } from '../../utils/permissionSetUtils';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';
import { TableColumnFilterRow, type TableColumnFilterDef } from '../../components/common/TableColumnFilterRow';
import { TableColumnHeaderRow } from '../../components/common/TableColumnHeaderRow';
import { TableNoResultsRow } from '../../components/common/TableNoResultsRow';
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters';
import { useTableSort } from '../../hooks/useTableSort';
import { isListFilterActive } from '../../utils/tableListUtils';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

interface PermissionSetsPageProps {
  onAdd: () => void;
  onEdit: (set: PermissionSetApi) => void;
  editingSetId?: string | null;
}

export const PermissionSetsPage: React.FC<PermissionSetsPageProps> = ({
  onAdd,
  onEdit,
  editingSetId,
}) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const { locationDefinitions, sreniDefinitions } = useAdminDefinitions();
  const permissionsLoaded = useRef(false);

  const [sets, setSets] = useState<PermissionSetApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { filters, debouncedFilters, setFilter, clearFilters, filtersQuery } = useTableColumnFilters();
  const { sortBy, sortDir, toggleSort, clearSort, sortQuery } = useTableSort();

  const [allPermissions, setAllPermissions] = useState<PermissionApi[]>([]);
  const [locations, setLocations] = useState<LocationDefinitionApi[]>([]);

  const ensurePermissionsLoaded = () => {
    if (permissionsLoaded.current) return;
    permissionsLoaded.current = true;
    backendApi.listPermissions().then((perms) => setAllPermissions(perms)).catch(() => {
      permissionsLoaded.current = false;
    });
  };

  const loadSets = (p: number, ps: number, q: string, colFilters = filtersQuery, sort: ListSortParams | undefined = sortQuery) => {
    setIsLoading(true);
    backendApi.listPermissionSetsPaginated({ page: p, pageSize: ps, search: q, filters: colFilters, ...sort })
      .then((res) => { setSets(res.items); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch((err) => addToast(toUiError(err, 'Failed to load permission sets.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { setLocations(locationDefinitions); }, [locationDefinitions]);
  useEffect(() => { ensurePermissionsLoaded(); }, []);
  useEffect(() => { loadSets(page, pageSize, search); }, [page, pageSize]);

  useEffect(() => {
    setPage(1);
    loadSets(1, pageSize, search, filtersQuery);
  }, [debouncedFilters]);

  useEffect(() => {
    setPage(1);
    loadSets(1, pageSize, search, filtersQuery, sortQuery);
  }, [sortBy, sortDir]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); loadSets(1, pageSize, q); }, 400);
  };

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
    loadSets(1, ps, search);
  };

  const permById = useMemo(() => {
    const m = new Map<string, PermissionApi>();
    allPermissions.forEach((p) => m.set(p.id, p));
    return m;
  }, [allPermissions]);

  const locationById = useMemo(() => {
    const m = new Map<string, LocationDefinitionApi>();
    locations.forEach((l) => m.set(l.id, l));
    return m;
  }, [locations]);

  const sreniById = useMemo(() => {
    const m = new Map<string, SreniDefinitionApi>();
    sreniDefinitions.forEach((s) => m.set(s.id, s));
    return m;
  }, [sreniDefinitions]);

  const permissionSetFilterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'name', label: 'Name', filterable: true, placeholder: 'Name…' },
    { key: 'description', label: 'Description', filterable: true, placeholder: 'Description…' },
    { key: '__permissions__', label: 'Permissions', filterable: false, sortable: false },
    {
      key: 'active',
      label: 'Status',
      filterable: true,
      filterType: 'select',
      placeholder: 'All',
      options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
    },
    { key: '__actions__', label: 'Actions', filterable: false, sortable: false, align: 'right' },
  ], []);

  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim());
  const hasFiltersActive = isListFilterActive(search, hasColumnFilters);
  const showEmptyState = !isLoading && sets.length === 0 && !hasFiltersActive;

  const clearAllFilters = () => {
    clearFilters();
    clearSort();
    setSearch('');
    setPage(1);
    loadSets(1, pageSize, '', undefined, undefined);
  };

  const handleToggleActive = async (s: PermissionSetApi) => {
    try {
      await backendApi.updatePermissionSet(s.id, { active: !s.active });
      addToast(`Permission set ${s.active ? 'deactivated' : 'activated'}.`, 'success');
      loadSets(page, pageSize, search);
    } catch (err) { addToast(toUiError(err, 'Failed to update.'), 'error'); }
  };

  const handleDelete = async (s: PermissionSetApi) => {
    const ok = await confirm({ title: 'Delete Permission Set', message: `Delete "${s.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deletePermissionSet(s.id);
      addToast('Permission set deleted.', 'success');
      const newPage = sets.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      loadSets(newPage, pageSize, search);
    } catch (err) { addToast(toUiError(err, 'Failed to delete.'), 'error'); }
  };

  const hasTable = !isLoading && (sets.length > 0 || hasFiltersActive);
  const activePermCount = allPermissions.filter((p) => p.active).length;

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="🗂️"
        title="Permission Sets"
        subtitle="Bundle atomic permissions into named sets that can be granted to roles or users."
        stats={[
          { label: 'Total', value: total, variant: 'info' },
          { label: 'Available Permissions', value: activePermCount, variant: 'warning' },
        ]}
        actions={
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <span style={{ fontSize: '1.15rem' }}>+</span>
            New Set
          </button>
        }
      />

      <div className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`} style={{ marginBottom: hasTable ? 0 : '16px' }}>
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input className="form-input" placeholder="Search sets by name or description…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <div className="list-toolbar__meta">
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
            {isLoading ? 'Loading…' : `${total} set${total !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading permission sets…</div>
      ) : showEmptyState ? (
        <EmptyState
          icon="🔐"
          title="No permission sets defined yet"
          copy="Create a permission set to bundle access for users and roles."
          action={<button type="button" className="btn btn-primary" onClick={onAdd}>New Set</button>}
        />
      ) : (
        <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <table className="custom-table">
            <thead>
              <TableColumnHeaderRow columns={permissionSetFilterColumns} sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <TableColumnFilterRow columns={permissionSetFilterColumns} values={filters} onChange={setFilter} onClear={clearAllFilters} />
            </thead>
            <tbody>
              {sets.length === 0 ? (
                <TableNoResultsRow colSpan={5} title="No sets match your filters" onClearFilters={clearAllFilters} />
              ) : sets.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.83rem' }}>{s.description ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {s.permissionIds.length === 0 ? (
                        <span style={{ opacity: 0.4, fontSize: '0.83rem' }}>None</span>
                      ) : s.permissionIds.slice(0, 4).map((pid) => {
                        const p = permById.get(pid);
                        return (
                          <span key={pid} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: 'var(--chip-bg-soft)', letterSpacing: '0.03em' }}>
                            {formatPermissionLabel(p, pid, locationById, sreniById)}
                          </span>
                        );
                      })}
                      {s.permissionIds.length > 4 && (
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                          +{s.permissionIds.length - 4} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ width: '90px' }}>
                    <span className={`badge ${s.active ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '0.8rem' }}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${s.name}`}
                      actions={[
                        { label: editingSetId === s.id ? 'Editing…' : 'Edit', onClick: () => onEdit(s), disabled: editingSetId === s.id },
                        { label: s.active ? 'Deactivate' : 'Activate', tone: s.active ? 'warning' : 'success', onClick: () => void handleToggleActive(s) },
                        { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(s) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar page={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
        </div>
      )}
    </div>
  );
};
