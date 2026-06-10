import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { TableColumnFilterRow, type TableColumnFilterDef } from './TableColumnFilterRow';
import { TableColumnHeaderRow } from './TableColumnHeaderRow';
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters';
import { useTableSort } from '../../hooks/useTableSort';
import { applyClientColumnFilters, type ClientFilterAccessor } from '../../utils/clientTableFilter';
import { applyClientColumnSort } from '../../utils/clientTableSort';
import type {
  MemberContactCommitDecisionApi,
  MemberContactDuplicateMatchApi,
  MemberContactParsedRowApi,
  MemberContactUploadActionApi,
} from '../../utils/backendApi';

export interface ContactUploadReviewState {
  rows: MemberContactParsedRowApi[];
  duplicates: MemberContactDuplicateMatchApi[];
  withinFileDuplicates: Array<{ rowIndexA: number; rowIndexB: number; matchKey: string }>;
  sourceFile: string;
}

interface ContactUploadReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: ContactUploadReviewState | null;
  committing: boolean;
  onCommit: (decisions: MemberContactCommitDecisionApi[]) => Promise<void>;
}

type RowDecision = {
  action: MemberContactUploadActionApi;
};

function defaultAction(
  row: MemberContactParsedRowApi,
  duplicates: MemberContactDuplicateMatchApi[],
  withinFileDup: boolean,
): MemberContactUploadActionApi {
  if (row.errors.length) return 'skip';
  if (withinFileDup) return 'skip';
  const dup = duplicates.find((d) => d.rowIndex === row.rowIndex && d.kind === 'household');
  return dup ? 'update' : 'insert';
}

function getRowStatusText(
  row: MemberContactParsedRowApi,
  duplicates: MemberContactDuplicateMatchApi[],
  withinFileSet: Set<number>,
  childDupsByRow: Map<number, MemberContactDuplicateMatchApi[]>,
): string {
  if (row.errors.length) return row.errors.join('; ');
  const householdDup = duplicates.find((d) => d.rowIndex === row.rowIndex && d.kind === 'household');
  const childDups = childDupsByRow.get(row.rowIndex) ?? [];
  if (householdDup) return 'Matches existing family contact';
  if (childDups.length > 0) return `New family contact; ${childDups.length} child match(es) need Update after insert`;
  if (withinFileSet.has(row.rowIndex)) return 'Duplicate within file';
  return 'OK';
}

export const ContactUploadReviewModal: React.FC<ContactUploadReviewModalProps> = ({
  isOpen,
  onClose,
  review,
  committing,
  onCommit,
}) => {
  const [decisions, setDecisions] = useState<Record<number, RowDecision>>({});
  const { filters, debouncedFilters, setFilter, clearFilters } = useTableColumnFilters();
  const { sortBy, sortDir, toggleSort, clearSort } = useTableSort();

  const withinFileSet = useMemo(() => {
    const set = new Set<number>();
    review?.withinFileDuplicates.forEach((d) => {
      set.add(d.rowIndexA);
      set.add(d.rowIndexB);
    });
    return set;
  }, [review]);

  const childDupsByRow = useMemo(() => {
    const map = new Map<number, MemberContactDuplicateMatchApi[]>();
    review?.duplicates.forEach((dup) => {
      if (dup.kind !== 'child') return;
      const list = map.get(dup.rowIndex) ?? [];
      list.push(dup);
      map.set(dup.rowIndex, list);
    });
    return map;
  }, [review?.duplicates]);

  useEffect(() => {
    if (!review) {
      setDecisions({});
      return;
    }
    const initial: Record<number, RowDecision> = {};
    for (const row of review.rows) {
      initial[row.rowIndex] = {
        action: defaultAction(row, review.duplicates, withinFileSet.has(row.rowIndex)),
      };
    }
    setDecisions(initial);
  }, [review, withinFileSet]);

  const filterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'row', label: 'Row', filterable: true, placeholder: 'Row…' },
    { key: 'name', label: 'Name', filterable: true, placeholder: 'Name…' },
    { key: 'mobile', label: 'Mobile', filterable: true, placeholder: 'Mobile…' },
    { key: 'status', label: 'Status', filterable: true, placeholder: 'Status…' },
    { key: 'action', label: 'Action', filterable: false, sortable: false },
  ], []);

  const accessors = useMemo<Record<string, ClientFilterAccessor<MemberContactParsedRowApi>>>(() => ({
    row: { getValue: (row) => String(row.rowIndex), match: 'exact' },
    name: { getValue: (row) => String(row.data.name ?? '') },
    mobile: { getValue: (row) => String(row.data.mobileNo ?? '') },
    status: {
      getValue: (row) => getRowStatusText(row, review?.duplicates ?? [], withinFileSet, childDupsByRow),
    },
  }), [review?.duplicates, withinFileSet, childDupsByRow]);

  const displayedRows = useMemo(
    () => (review
      ? applyClientColumnSort(
        applyClientColumnFilters(review.rows, debouncedFilters, accessors),
        sortBy,
        sortDir,
        accessors,
      )
      : []),
    [review, debouncedFilters, accessors, sortBy, sortDir],
  );
  const clearAllFilters = () => {
    clearFilters();
    clearSort();
  };

  if (!review) return null;

  const setAction = (rowIndex: number, action: MemberContactUploadActionApi) => {
    setDecisions((prev) => ({ ...prev, [rowIndex]: { action } }));
  };

  const handleCommit = async () => {
    const payload: MemberContactCommitDecisionApi[] = review.rows.map((row) => ({
      rowIndex: row.rowIndex,
      action: decisions[row.rowIndex]?.action ?? 'skip',
      data: row.data,
    }));
    await onCommit(payload);
  };

  const errorCount = review.rows.filter((r) => r.errors.length).length;
  const householdDupCount = review.duplicates.filter((d) => d.kind === 'household').length;
  const childDupCount = review.duplicates.filter((d) => d.kind === 'child').length;
  const readyCount = review.rows.filter((r) => {
    const action = decisions[r.rowIndex]?.action;
    return action && action !== 'skip' && !r.errors.length;
  }).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Upload" maxWidth="960px">
      <div className="contact-upload-modal">
        <p className="contact-upload-modal__description">
          Review parsed rows from <strong>{review.sourceFile}</strong>. Choose <strong>Update</strong> to merge with an
          existing family contact (Mobile + Name match), <strong>Insert</strong> for a new row, or <strong>Skip</strong>.
          Bala Bharathi child matches are shown under each family row and refresh when you choose Update.
        </p>

        <div className="contact-upload-modal__summary">
          <span className="badge badge-success contact-upload-modal__badge">{readyCount} to import</span>
          {householdDupCount > 0 && (
            <span className="badge badge-warning contact-upload-modal__badge">
              {householdDupCount} family contact duplicate(s)
            </span>
          )}
          {childDupCount > 0 && (
            <span className="badge badge-warning contact-upload-modal__badge">
              {childDupCount} child duplicate(s)
            </span>
          )}
          {errorCount > 0 && (
            <span className="badge badge-danger contact-upload-modal__badge">{errorCount} with errors</span>
          )}
        </div>

        <div className="contact-upload-modal__duplicate-table-wrap" style={{ maxHeight: '420px', overflow: 'auto' }}>
          <table className="custom-table contact-upload-modal__duplicate-table">
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
              {displayedRows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary-dark)' }}>
                    No rows match the current filters.
                  </td>
                </tr>
              )}
              {displayedRows.map((row) => {
                const householdDup = review.duplicates.find(
                  (d) => d.rowIndex === row.rowIndex && d.kind === 'household',
                );
                const childDups = childDupsByRow.get(row.rowIndex) ?? [];
                const isWithinFile = withinFileSet.has(row.rowIndex);
                const action = decisions[row.rowIndex]?.action ?? 'skip';
                const childUpdatesOnCommit = childDups.length > 0 && action === 'update';

                return (
                  <React.Fragment key={row.rowIndex}>
                    <tr>
                      <td style={{ textAlign: 'center' }}>{row.rowIndex}</td>
                      <td>{String(row.data.name ?? '—')}</td>
                      <td style={{ fontFamily: 'monospace' }}>{String(row.data.mobileNo ?? '—')}</td>
                      <td>
                        {row.errors.length > 0 && (
                          <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{row.errors.join('; ')}</span>
                        )}
                        {!row.errors.length && householdDup && (
                          <span style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>Matches existing family contact</span>
                        )}
                        {!row.errors.length && !householdDup && childDups.length > 0 && (
                          <span style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>
                            New family contact; {childDups.length} child match(es) need Update after insert
                          </span>
                        )}
                        {!row.errors.length && isWithinFile && (
                          <span style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>Duplicate within file</span>
                        )}
                        {!row.errors.length && !householdDup && !isWithinFile && childDups.length === 0 && (
                          <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>OK</span>
                        )}
                      </td>
                      <td>
                        <select
                          className="form-input"
                          style={{ minWidth: '110px', padding: '4px 8px', fontSize: '0.85rem' }}
                          value={action}
                          disabled={row.errors.length > 0}
                          onChange={(e) => setAction(row.rowIndex, e.target.value as MemberContactUploadActionApi)}
                        >
                          <option value="insert">Insert</option>
                          <option value="update">Update</option>
                          <option value="skip">Skip</option>
                        </select>
                      </td>
                    </tr>
                    {childDups.map((childDup) => (
                      <tr key={`${row.rowIndex}-child-${childDup.childSlot}-${childDup.matchKey}`}>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>
                          ↳ {row.rowIndex}
                        </td>
                        <td colSpan={2} style={{ fontSize: '0.85rem', paddingLeft: '1.25rem' }}>
                          <strong>{childDup.childName ?? 'Child'}</strong>
                          {childDup.childDob ? ` · DOB ${childDup.childDob}` : ''}
                          {childDup.sreniName ? ` · ${childDup.sreniName}` : ''}
                          {childDup.childSlot ? ` · slot ${childDup.childSlot}` : ''}
                        </td>
                        <td>
                          <span style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>
                            Matches existing child
                            {childUpdatesOnCommit ? ' (will update)' : householdDup ? ' (updates with family contact Update)' : ''}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>—</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="contact-upload-modal__actions contact-upload-modal__actions--end">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={committing}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary contact-upload-modal__upload-btn"
            disabled={committing || readyCount === 0}
            onClick={() => void handleCommit()}
          >
            {committing ? 'Importing…' : `Import ${readyCount} row(s)`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
