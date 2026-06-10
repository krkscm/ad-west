import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { PaginationBar } from '../../components/common/PaginationBar';
import { TableColumnFilterRow, type TableColumnFilterDef } from '../../components/common/TableColumnFilterRow';
import { TableColumnHeaderRow } from '../../components/common/TableColumnHeaderRow';
import { TableNoResultsRow } from '../../components/common/TableNoResultsRow';
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters';
import { useTableSort } from '../../hooks/useTableSort';
import { isListFilterActive } from '../../utils/tableListUtils';
import { backendApi, EnumValueApi, SreniDefinitionApi, type ListSortParams } from '../../utils/backendApi';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

interface SreniDefinitionPageProps {
  onAdd: () => void;
  onEdit: (sreni: SreniDefinitionApi) => void;
  editingSreniId?: string | null;
  onSreniChange?: () => void;
}

export const SreniDefinitionPage: React.FC<SreniDefinitionPageProps> = ({
  onAdd,
  onEdit,
  editingSreniId,
  onSreniChange,
}) => {
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<SreniDefinitionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { filters, debouncedFilters, setFilter, clearFilters, filtersQuery } = useTableColumnFilters();
  const { sortBy, sortDir, toggleSort, clearSort, sortQuery } = useTableSort();

  const [enrollmentScopeOptions, setEnrollmentScopeOptions] = useState<EnumValueApi[]>([]);
  const [strategyOptions, setStrategyOptions] = useState<EnumValueApi[]>([]);

  const load = (p: number, ps: number, q: string, colFilters = filtersQuery, sort: ListSortParams | undefined = sortQuery) => {
    setIsLoading(true);
    backendApi.listSreniDefinitionsPaginated({ page: p, pageSize: ps, search: q, filters: colFilters, ...sort })
      .then((res) => { setItems(res.items); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch((err) => addToast(toUiError(err, 'Failed to load srenies.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(page, pageSize, search); }, [page, pageSize]);

  useEffect(() => {
    setPage(1);
    load(1, pageSize, search, filtersQuery);
  }, [debouncedFilters]);

  useEffect(() => {
    setPage(1);
    load(1, pageSize, search, filtersQuery, sortQuery);
  }, [sortBy, sortDir]);

  useEffect(() => {
    Promise.all([
      backendApi.listEnumValues('enrollment_scope', true),
      backendApi.listEnumValues('primary_contact_strategy', true),
    ])
      .then(([scopes, strategies]) => {
        setEnrollmentScopeOptions(scopes);
        setStrategyOptions(strategies);
      })
      .catch(() => undefined);
  }, []);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); load(1, pageSize, q); }, 400);
  };

  const handleToggleActive = async (sreni: SreniDefinitionApi) => {
    try {
      await backendApi.updateSreniDefinition(sreni.id, { active: !sreni.active });
      addToast(`Sreni ${sreni.active ? 'deactivated' : 'activated'} successfully.`, 'success');
      onSreniChange?.();
      load(page, pageSize, search);
    } catch (error) {
      addToast(toUiError(error, 'Failed to update sreni status.'), 'error');
    }
  };

  const handleToggleUploadExcel = async (sreni: SreniDefinitionApi) => {
    try {
      await backendApi.updateSreniDefinition(sreni.id, { showInUploadExcel: !sreni.showInUploadExcel });
      addToast(`Upload Excel column ${sreni.showInUploadExcel ? 'disabled' : 'enabled'} for ${sreni.name}.`, 'success');
      onSreniChange?.();
      load(page, pageSize, search);
    } catch (error) {
      addToast(toUiError(error, 'Failed to update upload Excel setting.'), 'error');
    }
  };

  const handleToggleJoinUsVisibility = async (sreni: SreniDefinitionApi) => {
    try {
      await backendApi.updateSreniDefinition(sreni.id, { joinUsVisible: !sreni.joinUsVisible });
      addToast(`Join Us visibility ${sreni.joinUsVisible ? 'disabled' : 'enabled'} for ${sreni.name}.`, 'success');
      onSreniChange?.();
      load(page, pageSize, search);
    } catch (error) {
      addToast(toUiError(error, 'Failed to update Join Us visibility.'), 'error');
    }
  };

  const handleDelete = async (sreni: SreniDefinitionApi) => {
    const ok = await confirm({ title: 'Delete Sreni', message: `Delete "${sreni.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deleteSreniDefinition(sreni.id);
      addToast('Sreni deleted successfully.', 'success');
      onSreniChange?.();
      const newPage = items.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      load(newPage, pageSize, search);
    } catch (error) {
      addToast(toUiError(error, 'Failed to delete sreni.'), 'error');
    }
  };

  const labelForEnum = (options: EnumValueApi[], value?: string) =>
    options.find((o) => o.value === value)?.label ?? value ?? '—';

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
    load(1, ps, search);
  };

  const sreniFilterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'code', label: 'Code', filterable: true, placeholder: 'Code…' },
    { key: 'name', label: 'Name', filterable: true, placeholder: 'Name…' },
    { key: 'description', label: 'Description', filterable: true, placeholder: 'Description…' },
    { key: 'enrollmentScope', label: 'Enrollment', filterable: true, placeholder: 'Enrollment…' },
    { key: 'primaryContactStrategy', label: 'Strategy', filterable: true, placeholder: 'Strategy…' },
    {
      key: 'joinUsVisible',
      label: 'Join Us',
      filterable: true,
      filterType: 'select',
      placeholder: 'All',
      options: [{ value: 'true', label: 'Visible' }, { value: 'false', label: 'Hidden' }],
    },
    {
      key: 'active',
      label: 'Status',
      filterable: true,
      filterType: 'select',
      placeholder: 'All',
      options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }],
    },
    { key: 'createdBy', label: 'Created By', filterable: true, placeholder: 'Created by…' },
    { key: '__actions__', label: 'Actions', filterable: false, sortable: false, align: 'right' },
  ], []);

  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim());
  const hasFiltersActive = isListFilterActive(search, hasColumnFilters);
  const showEmptyState = !isLoading && items.length === 0 && !hasFiltersActive;
  const hasTable = !isLoading && (items.length > 0 || hasFiltersActive);

  const clearAllFilters = () => {
    clearFilters();
    clearSort();
    setSearch('');
    setPage(1);
    load(1, pageSize, '', undefined, undefined);
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        icon="🏘️"
        title="Sreni Definition"
        subtitle="Define and manage srenies — the organisational units of your association."
        stats={[{ label: 'Total', value: total, variant: 'info' }]}
        actions={
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Sreni
          </button>
        }
      />

      <div className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`} style={{ marginBottom: hasTable ? 0 : '16px' }}>
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input className="form-input" placeholder="Search by name, code or description…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <div className="list-toolbar__meta">
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
            {isLoading ? 'Loading…' : `${total} sreni${total !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading srenies…</div>
      ) : showEmptyState ? (
        <EmptyState
          icon="🏘️"
          title="No srenies defined yet"
          copy="Add your first sreni to configure participation and features."
          action={<button type="button" className="btn btn-primary" onClick={onAdd}>New Sreni</button>}
        />
      ) : (
        <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <table className="custom-table">
            <thead>
              <TableColumnHeaderRow columns={sreniFilterColumns} sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <TableColumnFilterRow columns={sreniFilterColumns} values={filters} onChange={setFilter} onClear={clearAllFilters} />
            </thead>
            <tbody>
              {items.length === 0 ? (
                <TableNoResultsRow colSpan={9} title="No srenies match your filters" onClearFilters={clearAllFilters} />
              ) : items.map((sreni) => (
                <tr key={sreni.id} style={{ opacity: sreni.active ? 1 : 0.55 }}>
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    {sreni.code ? (
                      <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, background: 'var(--chip-bg-soft)', color: 'var(--text-primary-dark)', padding: '3px 8px', borderRadius: '5px' }}>{sreni.code}</code>
                    ) : (
                      <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>{sreni.name}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary-dark)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sreni.description}>
                    {sreni.description ?? <span style={{ opacity: 0.45 }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>
                    {labelForEnum(enrollmentScopeOptions, sreni.enrollmentScope)}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: 'var(--text-secondary-dark)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={labelForEnum(strategyOptions, sreni.primaryContactStrategy)}>
                    {labelForEnum(strategyOptions, sreni.primaryContactStrategy)}
                  </td>
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: sreni.joinUsVisible ? 'var(--success)' : 'var(--text-secondary-dark)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sreni.joinUsVisible ? 'var(--success)' : 'var(--text-secondary-dark)', display: 'inline-block' }} />
                      {sreni.joinUsVisible ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: sreni.active ? 'var(--success)' : 'var(--error)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sreni.active ? 'var(--success)' : 'var(--error)', display: 'inline-block' }} />
                      {sreni.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>
                    {sreni.createdBy ?? <span style={{ opacity: 0.45 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 20px', textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${sreni.name}`}
                      actions={[
                        { label: editingSreniId === sreni.id ? 'Editing…' : 'Edit', onClick: () => onEdit(sreni), disabled: editingSreniId === sreni.id },
                        { label: sreni.showInUploadExcel ? 'Hide from Upload Excel' : 'Show in Upload Excel', tone: sreni.showInUploadExcel ? 'warning' : 'success', onClick: () => void handleToggleUploadExcel(sreni) },
                        { label: sreni.joinUsVisible ? 'Hide from Join Us' : 'Show in Join Us', tone: sreni.joinUsVisible ? 'warning' : 'success', onClick: () => void handleToggleJoinUsVisibility(sreni) },
                        { label: sreni.active ? 'Deactivate' : 'Activate', tone: sreni.active ? 'warning' : 'success', onClick: () => void handleToggleActive(sreni) },
                        { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(sreni) },
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
