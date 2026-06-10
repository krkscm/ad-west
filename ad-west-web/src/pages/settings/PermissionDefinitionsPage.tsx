import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { useAdminDefinitions } from '../../context/admin-definitions-context';
import { backendApi, LocationDefinitionApi, PermissionApi, SreniDefinitionApi, type ListSortParams } from '../../utils/backendApi';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';
import { PaginationBar } from '../../components/common/PaginationBar';
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

interface PermissionDefinitionsPageProps {
  onAdd: () => void;
  onEdit: (permission: PermissionApi) => void;
  editingPermissionId?: string | null;
}

export const PermissionDefinitionsPage: React.FC<PermissionDefinitionsPageProps> = ({
  onAdd,
  onEdit,
  editingPermissionId,
}) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const { sreniDefinitions, locationDefinitions } = useAdminDefinitions();

  const [items, setItems] = useState<PermissionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { filters, debouncedFilters, setFilter, clearFilters, filtersQuery } = useTableColumnFilters();
  const { sortBy, sortDir, toggleSort, clearSort, sortQuery } = useTableSort();

  const [locations, setLocations] = useState<LocationDefinitionApi[]>([]);
  const [sreniDefs, setSreniDefs] = useState<SreniDefinitionApi[]>([]);

  const loadPerms = (p: number, ps: number, q: string, locId: string, colFilters = filtersQuery, sort: ListSortParams | undefined = sortQuery) => {
    setIsLoading(true);
    backendApi.listPermissionsPaginated({ page: p, pageSize: ps, search: q, locationId: locId || undefined, filters: colFilters, ...sort })
      .then((res) => { setItems(res.items); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch((err) => addToast(toUiError(err, 'Failed to load permissions.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    setLocations(locationDefinitions);
    setSreniDefs(sreniDefinitions);
  }, [locationDefinitions, sreniDefinitions]);

  useEffect(() => { loadPerms(page, pageSize, search, locationFilter); }, [page, pageSize, locationFilter]);

  useEffect(() => {
    setPage(1);
    loadPerms(1, pageSize, search, locationFilter, filtersQuery);
  }, [debouncedFilters]);

  useEffect(() => {
    setPage(1);
    loadPerms(1, pageSize, search, locationFilter, filtersQuery, sortQuery);
  }, [sortBy, sortDir]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); loadPerms(1, pageSize, q, locationFilter); }, 400);
  };

  const handleLocationFilter = (locId: string) => {
    setLocationFilter(locId);
    setPage(1);
  };

  const activeLocations = useMemo(() => locations.filter((l) => l.active), [locations]);
  const activeSreniDefs = useMemo(() => sreniDefs.filter((s) => s.active), [sreniDefs]);
  const locationById = useMemo(() => { const m = new Map<string, LocationDefinitionApi>(); locations.forEach((l) => m.set(l.id, l)); return m; }, [locations]);
  const sreniById = useMemo(() => { const m = new Map<string, SreniDefinitionApi>(); sreniDefs.forEach((s) => m.set(s.id, s)); return m; }, [sreniDefs]);

  const handleToggleActive = async (p: PermissionApi) => {
    try {
      await backendApi.updatePermission(p.id, { active: !p.active });
      addToast(`Permission ${p.active ? 'deactivated' : 'activated'}.`, 'success');
      loadPerms(page, pageSize, search, locationFilter);
    } catch (err) { addToast(toUiError(err, 'Failed to update.'), 'error'); }
  };

  const handleDelete = async (p: PermissionApi) => {
    const ok = await confirm({ title: 'Delete Permission', message: `Delete "${p.name}" (${p.code})? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deletePermission(p.id);
      addToast('Permission deleted.', 'success');
      const newPage = items.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      loadPerms(newPage, pageSize, search, locationFilter);
    } catch (err) { addToast(toUiError(err, 'Failed to delete.'), 'error'); }
  };

  const permissionFilterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'code', label: 'Code', filterable: true, placeholder: 'Code…' },
    { key: 'name', label: 'Name', filterable: true, placeholder: 'Name…' },
    {
      key: 'locationId',
      label: 'Location',
      filterable: true,
      filterType: 'select',
      placeholder: 'All locations',
      options: activeLocations.map((l) => ({ value: l.id, label: l.name })),
    },
    {
      key: 'sreniId',
      label: 'Sreni',
      filterable: true,
      filterType: 'select',
      placeholder: 'All srenis',
      options: activeSreniDefs.map((s) => ({ value: s.id, label: s.name })),
    },
    { key: 'description', label: 'Description', filterable: true, placeholder: 'Description…' },
    {
      key: 'active',
      label: 'Status',
      filterable: true,
      filterType: 'select',
      placeholder: 'All',
      options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
    },
    { key: '__actions__', label: 'Actions', filterable: false, sortable: false, align: 'right' },
  ], [activeLocations, activeSreniDefs]);

  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim());
  const hasFiltersActive = isListFilterActive(search, hasColumnFilters, locationFilter);
  const showEmptyState = !isLoading && items.length === 0 && !hasFiltersActive;
  const hasTable = !isLoading && (items.length > 0 || hasFiltersActive);

  const clearAllFilters = () => {
    clearFilters();
    clearSort();
    setSearch('');
    setLocationFilter('');
    setPage(1);
    loadPerms(1, pageSize, '', '', undefined, undefined);
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="🔒"
        title="Permission Definitions"
        subtitle="Each permission maps a Location to a Sreni and defines an operational scope."
        stats={[{ label: 'Total', value: total, variant: 'info' }]}
        actions={
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Permission
          </button>
        }
      />

      <div className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`} style={{ marginBottom: hasTable ? 0 : '16px' }}>
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input className="form-input" placeholder="Search code or name…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <select className="form-input" style={{ maxWidth: '200px', marginBottom: 0, fontSize: '0.875rem', cursor: 'pointer' }} value={locationFilter} onChange={(e) => handleLocationFilter(e.target.value)}>
          <option value="">All locations</option>
          {activeLocations.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.level})</option>)}
        </select>
        {(search || locationFilter) && (
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setSearch(''); handleLocationFilter(''); }}>Clear Filters</button>
        )}
        {!isLoading && (
          <div className="list-toolbar__meta">
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
              {total} permission{total !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading permissions…</div>
      ) : showEmptyState ? (
        <EmptyState
          title="No permissions defined yet"
          copy="Create a permission to map a location and sreni."
          action={<button type="button" className="btn btn-primary" onClick={onAdd}>New Permission</button>}
        />
      ) : (
        <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, boxShadow: 'none' }}>
          <table className="custom-table">
            <thead>
              <TableColumnHeaderRow columns={permissionFilterColumns} sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <TableColumnFilterRow columns={permissionFilterColumns} values={filters} onChange={setFilter} onClear={clearAllFilters} />
            </thead>
            <tbody>
              {items.length === 0 ? (
                <TableNoResultsRow colSpan={7} title="No permissions match your filters" onClearFilters={clearAllFilters} />
              ) : items.map((p) => {
                const loc = locationById.get(p.locationId);
                const sreni = sreniById.get(p.sreniId);
                const locLevel = loc?.level ?? '';
                const locColorClass = locLevel === 'ZONE' ? 'badge-info' : 'badge-warning';

                return (
                  <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, background: 'var(--chip-bg-soft)', color: 'var(--text-primary-dark)', padding: '3px 8px', borderRadius: '5px' }}>{p.code}</code>
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      {loc ? (
                        <span className={`badge ${locColorClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid currentColor', background: 'transparent', padding: '3px 8px' }}>
                          <span>{loc.level === 'ZONE' ? '🏢' : '📍'}</span>
                          <span>{loc.name}</span>
                        </span>
                      ) : <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>{p.locationId.slice(0, 8)}…</span>}
                    </td>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      {sreni ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid currentColor', background: 'transparent', padding: '3px 8px' }}>
                          <span>📦</span>
                          <span>{sreni.name}</span>
                        </span>
                      ) : <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>{p.sreniId.slice(0, 8)}…</span>}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-secondary-dark)', fontSize: '0.83rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.description}>
                      {p.description ?? <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: p.active ? 'var(--success)' : 'var(--error)' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.active ? 'var(--success)' : 'var(--error)', display: 'inline-block' }} />
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                      <TableRowActionsMenu
                        ariaLabel={`Actions for ${p.name}`}
                        actions={[
                          { label: editingPermissionId === p.id ? 'Editing…' : 'Edit', onClick: () => onEdit(p), disabled: editingPermissionId === p.id },
                          { label: p.active ? 'Deactivate' : 'Activate', tone: p.active ? 'warning' : 'success', onClick: () => void handleToggleActive(p) },
                          { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(p) },
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
            onPageChange={setPage}
            onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
};
