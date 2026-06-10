import React from 'react';

interface Props {
  colSpan: number;
  title?: string;
  copy?: string;
  onClearFilters?: () => void;
  clearLabel?: string;
}

export const TableNoResultsRow: React.FC<Props> = ({
  colSpan,
  title = 'No matches found',
  copy = 'Try adjusting your search or column filters.',
  onClearFilters,
  clearLabel = 'Clear filters',
}) => (
  <tr className="table-no-results-row">
    <td colSpan={colSpan}>
      <div className="table-no-results">
        <p className="table-no-results__title">{title}</p>
        <p className="table-no-results__copy">{copy}</p>
        {onClearFilters ? (
          <button type="button" className="table-no-results__clear" onClick={onClearFilters}>
            {clearLabel}
          </button>
        ) : null}
      </div>
    </td>
  </tr>
);
