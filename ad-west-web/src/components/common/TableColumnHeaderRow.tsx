import React from 'react';
import type { TableColumnFilterDef } from './TableColumnFilterRow';
import type { TableSortDirection } from '../../hooks/useTableSort';

interface Props {
  columns: TableColumnFilterDef[];
  sortBy?: string;
  sortDir?: TableSortDirection;
  onSort?: (key: string) => void;
}

const humanizeKey = (key: string) => key
  .replace(/^__|__$/g, '')
  .replace(/([A-Z])/g, ' $1')
  .replace(/_/g, ' ')
  .replace(/^\w/, (c) => c.toUpperCase())
  .trim();

const SortIcon: React.FC<{ active: boolean; direction?: TableSortDirection }> = ({ active, direction }) => (
  <span className={`table-column-sort-icon${active ? ' is-active' : ''}`} aria-hidden="true">
    <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
      <path
        className={`table-column-sort-icon__up${active && direction === 'asc' ? ' is-active' : ''}`}
        d="M5 0L9 5H1L5 0Z"
      />
      <path
        className={`table-column-sort-icon__down${active && direction === 'desc' ? ' is-active' : ''}`}
        d="M5 12L1 7H9L5 12Z"
      />
    </svg>
  </span>
);

export const TableColumnHeaderRow: React.FC<Props> = ({ columns, sortBy, sortDir, onSort }) => (
  <tr className="table-column-header-row">
    {columns.map((col) => {
      const cellStyle: React.CSSProperties = {
        ...(col.width ? { width: col.width } : {}),
        ...(col.align ? { textAlign: col.align } : {}),
      };
      const sortable = col.sortable ?? (col.filterable !== false && !col.key.startsWith('__'));
      const label = col.label ?? humanizeKey(col.key);

      if (!sortable || !onSort) {
        return (
          <th key={col.key} className="table-column-header-cell" style={cellStyle}>
            {col.key.startsWith('__') ? null : label}
          </th>
        );
      }

      const isActive = sortBy === col.key;
      return (
        <th key={col.key} className="table-column-header-cell" style={cellStyle}>
          <button
            type="button"
            className={`table-column-sort-btn${isActive ? ' is-active' : ''}`}
            onClick={() => onSort(col.key)}
            aria-label={`Sort by ${label}${isActive ? ` (${sortDir})` : ''}`}
          >
            <span>{label}</span>
            <SortIcon active={isActive} direction={isActive ? sortDir : undefined} />
          </button>
        </th>
      );
    })}
  </tr>
);
