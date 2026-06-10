import React from 'react';

export type TableColumnFilterDef = {
  key: string;
  label?: string;
  filterable?: boolean;
  sortable?: boolean;
  filterType?: 'text' | 'select';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
};

interface Props {
  columns: TableColumnFilterDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear?: () => void;
}

export const TableColumnFilterRow: React.FC<Props> = ({ columns, values, onChange, onClear }) => {
  const hasActive = Object.values(values).some((v) => v.trim());

  return (
    <tr className={`table-column-filter-row${hasActive ? ' table-column-filter-row--active' : ''}`}>
      {columns.map((col) => {
        const cellStyle: React.CSSProperties = {
          ...(col.width ? { width: col.width } : {}),
          ...(col.align ? { textAlign: col.align } : {}),
        };

        if (!col.filterable) {
          return (
            <th key={col.key} className="table-column-filter-cell" style={cellStyle}>
              {col.key === '__actions__' && hasActive && onClear ? (
                <button type="button" className="table-column-filter-clear" onClick={onClear}>
                  Clear filters
                </button>
              ) : null}
            </th>
          );
        }

        const value = values[col.key] ?? '';
        const inputClass = `table-column-filter-input${value.trim() ? ' has-value' : ''}`;

        if (col.filterType === 'select') {
          return (
            <th key={col.key} className="table-column-filter-cell" style={cellStyle}>
              <div className="table-column-filter-field table-column-filter-field--select">
                <select
                  className={inputClass}
                  value={value}
                  onChange={(e) => onChange(col.key, e.target.value)}
                  aria-label={`Filter ${col.key}`}
                >
                  <option value="">{col.placeholder ?? 'All'}</option>
                  {(col.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </th>
          );
        }

        return (
          <th key={col.key} className="table-column-filter-cell" style={cellStyle}>
            <div className="table-column-filter-field">
              <span className="table-column-filter-field__icon" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                className={inputClass}
                type="text"
                value={value}
                onChange={(e) => onChange(col.key, e.target.value)}
                placeholder={col.placeholder ?? 'Filter…'}
                aria-label={`Filter ${col.key}`}
              />
            </div>
          </th>
        );
      })}
    </tr>
  );
};
