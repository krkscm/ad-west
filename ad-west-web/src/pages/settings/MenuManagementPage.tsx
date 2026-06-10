import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { TableColumnFilterRow, type TableColumnFilterDef } from '../../components/common/TableColumnFilterRow';
import { TableColumnHeaderRow } from '../../components/common/TableColumnHeaderRow';
import { TableNoResultsRow } from '../../components/common/TableNoResultsRow';
import { isListFilterActive } from '../../utils/tableListUtils';
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters';
import { useTableSort } from '../../hooks/useTableSort';
import { applyClientColumnFilters, type ClientFilterAccessor } from '../../utils/clientTableFilter';
import { applyClientColumnSort } from '../../utils/clientTableSort';
import { backendApi, MenuItemApi } from '../../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

export const MenuManagementPage: React.FC = () => {
  const { addToast } = useToast();
  const [menus, setMenus] = useState<MenuItemApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { filters, debouncedFilters, setFilter, clearFilters } = useTableColumnFilters();
  const { sortBy, sortDir, toggleSort, clearSort } = useTableSort();

  const menuByKey = useMemo(() => {
    const m = new Map<string, MenuItemApi>();
    menus.forEach((item) => m.set(item.key, item));
    return m;
  }, [menus]);

  const filterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'label', label: 'Label', filterable: true, placeholder: 'Label…' },
    { key: 'key', label: 'Key', filterable: true, placeholder: 'Key…' },
    { key: 'parent', label: 'Parent', filterable: true, placeholder: 'Parent…' },
    { key: 'order', label: 'Order', filterable: true, placeholder: 'Order…', align: 'center' },
    {
      key: 'active',
      label: 'Status',
      filterable: true,
      filterType: 'select',
      placeholder: 'All',
      options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }],
      align: 'center',
    },
    { key: '__actions__', filterable: false, sortable: false, width: '56px' },
  ], []);

  const accessors = useMemo<Record<string, ClientFilterAccessor<MenuItemApi>>>(() => ({
    label: { getValue: (item) => item.label },
    key: { getValue: (item) => item.key },
    parent: {
      getValue: (item) => {
        if (!item.parentKey) return '—';
        return menuByKey.get(item.parentKey)?.label ?? item.parentKey;
      },
    },
    order: { getValue: (item) => String(item.sortOrder), match: 'exact' },
    active: { getValue: (item) => (item.active ? 'active' : 'inactive'), match: 'exact' },
  }), [menuByKey]);

  const displayedRows = useMemo(
    () => applyClientColumnSort(
      applyClientColumnFilters(menus, debouncedFilters, accessors),
      sortBy,
      sortDir,
      accessors,
    ),
    [menus, debouncedFilters, accessors, sortBy, sortDir],
  );
  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim());
  const hasFiltersActive = isListFilterActive(hasColumnFilters);
  const clearAllFilters = () => {
    clearFilters();
    clearSort();
  };

  const loadMenus = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await backendApi.listMenuItems(false, 'all');
      setMenus(items.slice().sort((a, b) => {
        if (!a.parentKey && b.parentKey) return -1;
        if (a.parentKey && !b.parentKey) return 1;
        if (a.parentKey !== b.parentKey) return (a.parentKey ?? '').localeCompare(b.parentKey ?? '');
        return a.sortOrder - b.sortOrder;
      }));
    } catch (err) {
      addToast(toUiError(err, 'Failed to load menus.'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void loadMenus(); }, [loadMenus]);

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Menu Structure</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
          Application menu items defined in the database. Managed via DB scripts. Assign menus to admins through Admin Management.
        </p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>Loading…</div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <TableColumnHeaderRow
                columns={filterColumns}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <TableColumnFilterRow
                columns={filterColumns}
                values={filters}
                onChange={setFilter}
                onClear={clearAllFilters}
              />
            </thead>
            <tbody>
              {displayedRows.length === 0 ? (
                hasFiltersActive ? (
                  <TableNoResultsRow colSpan={6} title="No menu items match your filters" onClearFilters={clearAllFilters} />
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary-dark)' }}>
                      No menu items found.
                    </td>
                  </tr>
                )
              ) : displayedRows.map(item => (
                <tr key={item.id} style={{ opacity: item.active ? 1 : 0.55 }}>
                  <td style={{ fontWeight: item.parentKey ? 400 : 600, paddingLeft: item.parentKey ? '32px' : undefined }}>
                    {item.parentKey && <span style={{ color: 'var(--text-secondary-dark)', marginRight: '6px' }}>↳</span>}
                    {item.icon && <span style={{ marginRight: '6px' }}>{item.icon}</span>}
                    {item.label}
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8rem', background: 'var(--panel-soft-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                      {item.key}
                    </code>
                  </td>
                  <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>
                    {item.parentKey ?? '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.sortOrder}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${item.active ? 'badge-success' : 'badge-error'}`}>
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
