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
import { backendApi, LocationDefinitionApi, type ListSortParams } from '../../utils/backendApi';
import { LocationLevelBadge } from '../../components/settings/LocationLevelBadge';

type LocationLevel = LocationDefinitionApi['level'];

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

interface LocationDefinitionPageProps {
  onAdd: () => void;
  onEdit: (location: LocationDefinitionApi) => void;
  editingLocationId?: string | null;
}

export const LocationDefinitionPage: React.FC<LocationDefinitionPageProps> = ({
  onAdd,
  onEdit,
  editingLocationId,
}) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const { locationDefinitions } = useAdminDefinitions();

  const [items, setItems] = useState<LocationDefinitionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LocationLevel | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { filters, debouncedFilters, setFilter, clearFilters, filtersQuery } = useTableColumnFilters();
  const { sortBy, sortDir, toggleSort, clearSort, sortQuery } = useTableSort();

  const allLocations = locationDefinitions;

  const load = (p: number, ps: number, q: string, lv: string, colFilters = filtersQuery, sort: ListSortParams | undefined = sortQuery) => {
    setIsLoading(true);
    backendApi.listLocationDefinitionsPaginated({ page: p, pageSize: ps, search: q, level: lv || undefined, filters: colFilters, ...sort })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load locations.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(page, pageSize, search, levelFilter); }, [page, pageSize, levelFilter]);

  useEffect(() => {
    setPage(1);
    load(1, pageSize, search, levelFilter, filtersQuery);
  }, [debouncedFilters]);

  useEffect(() => {
    setPage(1);
    load(1, pageSize, search, levelFilter, filtersQuery, sortQuery);
  }, [sortBy, sortDir]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); load(1, pageSize, q, levelFilter); }, 400);
  };

  const handleLevelFilter = (lv: LocationLevel | '') => {
    setLevelFilter(lv);
    setPage(1);
  };

  const handleToggleActive = async (loc: LocationDefinitionApi) => {
    try {
      await backendApi.updateLocationDefinition(loc.id, { level: loc.level, active: !loc.active });
      addToast(`Location ${loc.active ? 'deactivated' : 'activated'} successfully.`, 'success');
      load(page, pageSize, search, levelFilter);
    } catch (error) {
      addToast(toUiError(error, 'Failed to update location status.'), 'error');
    }
  };

  const handleDelete = async (loc: LocationDefinitionApi) => {
    const ok = await confirm({ title: 'Delete Location', message: `Delete "${loc.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deleteLocationDefinition(loc.id);
      addToast('Location deleted successfully.', 'success');
      const newPage = items.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      load(newPage, pageSize, search, levelFilter);
    } catch (error) {
      addToast(toUiError(error, 'Failed to delete location.'), 'error');
    }
  };

  const zoneCount = items.filter((l) => l.level === 'ZONE').length;
  const sthanCount = items.filter((l) => l.level === 'STHAN').length;
  const divisionCount = items.filter((l) => l.level === 'DIVISION').length;

  const locationFilterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'code', label: 'Code', filterable: true, placeholder: 'Code…' },
    { key: 'name', label: 'Name', filterable: true, placeholder: 'Name…' },
    {
      key: 'level',
      label: 'Level',
      filterable: true,
      filterType: 'select',
      placeholder: 'All levels',
      options: [
        { value: 'zone', label: 'Zone' },
        { value: 'sthan', label: 'Sthan' },
        { value: 'division', label: 'Division' },
      ],
    },
    { key: '__parent__', label: 'Parent', filterable: false, sortable: false },
    {
      key: 'active',
      label: 'Status',
      filterable: true,
      filterType: 'select',
      placeholder: 'All',
      options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
    },
    { key: '__created__', label: 'Created', filterable: false, sortable: false },
    { key: '__actions__', label: 'Actions', filterable: false, sortable: false, align: 'right' },
  ], []);

  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim());
  const hasFiltersActive = isListFilterActive(search, hasColumnFilters, levelFilter);
  const showEmptyState = !isLoading && items.length === 0 && !hasFiltersActive;
  const hasTable = !isLoading && (items.length > 0 || hasFiltersActive);

  const clearAllFilters = () => {
    clearFilters();
    clearSort();
    setSearch('');
    setLevelFilter('');
    setPage(1);
    load(1, pageSize, '', '', undefined, undefined);
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        icon="📍"
        title="Location Definition"
        subtitle="Manage zones and sthans — the geographic hierarchy of your organisation."
        stats={[
          { label: 'Total', value: total, variant: 'info' },
          { label: 'Zones (page)', value: zoneCount, variant: 'info' },
          { label: 'Sthans (page)', value: sthanCount, variant: 'warning' },
          { label: 'Divisions (page)', value: divisionCount, variant: 'success' },
        ]}
        actions={
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Location
          </button>
        }
      />

      <div className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`} style={{ marginBottom: hasTable ? 0 : '16px' }}>
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input className="form-input" placeholder="Search by name or code…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {([
            { val: '', label: 'All' },
            { val: 'ZONE', label: '🏢 Zones' },
            { val: 'STHAN', label: '📍 Sthans' },
            { val: 'DIVISION', label: '🗂️ Divisions' },
          ] as { val: LocationLevel | ''; label: string }[]).map(({ val, label }) => (
            <button key={val} type="button" onClick={() => handleLevelFilter(val)}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid', borderColor: levelFilter === val ? 'var(--primary)' : 'var(--border-dark)', background: levelFilter === val ? 'rgba(99,102,241,0.1)' : 'transparent', color: levelFilter === val ? 'var(--primary)' : 'var(--text-secondary-dark)', fontWeight: levelFilter === val ? 700 : 400, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
        {!isLoading && (
          <div className="list-toolbar__meta">
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
              {total} location{total !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading locations…</div>
      ) : showEmptyState ? (
        <EmptyState
          icon="🗺️"
          title="No locations yet"
          copy="Create your first zone, sthan, or division."
          action={<button type="button" className="btn btn-primary" onClick={onAdd}>New Location</button>}
        />
      ) : (
        <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, boxShadow: 'none' }}>
          <table className="custom-table">
            <thead>
              <TableColumnHeaderRow columns={locationFilterColumns} sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <TableColumnFilterRow columns={locationFilterColumns} values={filters} onChange={setFilter} onClear={clearAllFilters} />
            </thead>
            <tbody>
              {items.length === 0 ? (
                <TableNoResultsRow colSpan={7} title="No locations match your filters" onClearFilters={clearAllFilters} />
              ) : items.map((loc) => (
                <tr key={loc.id} style={{ opacity: loc.active ? 1 : 0.55 }}>
                  <td style={{ padding: '14px 20px' }}>
                    {loc.code ? (
                      <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, background: 'var(--chip-bg-soft)', color: 'var(--text-primary-dark)', padding: '3px 8px', borderRadius: '5px' }}>{loc.code}</code>
                    ) : (
                      <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.82rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>{loc.name}</td>
                  <td style={{ padding: '14px 20px' }}><LocationLevelBadge level={loc.level} /></td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>
                    {loc.parentId
                      ? (() => { const p = allLocations.find((l) => l.id === loc.parentId); return p ? (p.code ? `${p.code} – ${p.name}` : p.name) : <span style={{ fontStyle: 'italic' }}>Unknown</span>; })()
                      : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.5 }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: loc.active ? 'var(--success)' : 'var(--error)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: loc.active ? 'var(--success)' : 'var(--error)', display: 'inline-block' }} />
                      {loc.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>{new Date(loc.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 20px', textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${loc.name}`}
                      actions={[
                        { label: editingLocationId === loc.id ? 'Editing…' : 'Edit', onClick: () => onEdit(loc), disabled: editingLocationId === loc.id },
                        { label: loc.active ? 'Deactivate' : 'Activate', tone: loc.active ? 'warning' : 'success', onClick: () => void handleToggleActive(loc) },
                        { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(loc) },
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
            onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
};
