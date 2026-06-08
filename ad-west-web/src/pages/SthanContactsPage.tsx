import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { ContactEditModal } from '../components/common/ContactEditModal';
import { ContactUploadModal, STHAN_CONTACT_UPLOAD_DESCRIPTION } from '../components/common/ContactUploadModal';
import { TableRowActionsMenu } from '../components/common/TableRowActionsMenu';
import { TableLayoutModal } from '../components/common/TableLayoutModal';
import { PageHeader } from '../components/common/PageHeader';
import { PaginationBar } from '../components/common/PaginationBar';
import { buildContactEditFields, MASTER_CONTACT_COLUMN_LABELS, orderContactColumns } from '../constants/contactColumns';
import { backendApi, SthanContactRowApi } from '../utils/backendApi';
import { useTableLayout } from '../hooks/useTableLayout';

interface Props {
  locationId: string;
  locationName: string;
}

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

export const SthanContactsPage: React.FC<Props> = ({ locationId, locationName }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<SthanContactRowApi[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SthanContactRowApi | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const layout = useTableLayout('sthan-contacts');

  const colDefs = useMemo(
    () => columns.filter((k) => k !== 'name').map((k) => ({ key: k, label: MASTER_CONTACT_COLUMN_LABELS.get(k) ?? k })),
    [columns],
  );
  const visibleCols = layout.visibleKeys(colDefs);

  const load = useCallback((p: number) => {
    setIsLoading(true);
    backendApi.listSthanContacts(locationId, p, pageSize)
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        const colSet = new Set<string>();
        for (const r of res.items) Object.keys(r.data).forEach((k) => colSet.add(k));
        if (colSet.size > 0) {
          setColumns(orderContactColumns(colSet));
        }
        if (res.items.length > 0 && res.items[0].sourceFile) setSourceFile(res.items[0].sourceFile);
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load contacts.'), 'error'))
      .finally(() => setIsLoading(false));
  }, [locationId, pageSize, addToast]);

  useEffect(() => {
    setPage(1);
    setRows([]);
    setColumns([]);
    setTotal(0);
    setTotalPages(1);
    setSourceFile(null);
    load(1);
  }, [locationId, load]);

  const handleSaveEdit = async (data: Record<string, string | number | boolean | null>) => {
    if (!editTarget) return;
    setIsSavingEdit(true);
    try {
      const updated = await backendApi.updateSthanContact(locationId, editTarget.id, data);
      setRows((prev) => prev.map((r) => r.id !== editTarget.id ? r : { ...r, data: updated.data }));
      setEditTarget(null);
      addToast('Contact updated.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to update contact.'), 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleClear = async () => {
    const ok = await confirm({
      title: 'Clear Contact List',
      message: `Remove all contacts for ${locationName}? This cannot be undone.`,
      confirmLabel: 'Clear All',
      danger: true,
    });
    if (!ok) return;
    try {
      const result = await backendApi.clearSthanContacts(locationId);
      addToast(`Cleared ${result.deleted} contact${result.deleted !== 1 ? 's' : ''}.`, 'success');
      setRows([]); setColumns([]); setTotal(0); setTotalPages(1); setSourceFile(null);
    } catch (err) {
      addToast(toUiError(err, 'Failed to clear contacts.'), 'error');
    }
  };

  return (
    <div className="animate-slide-up">
      <ContactEditModal
        isOpen={editTarget !== null}
        title={editTarget?.data['name'] != null ? `Edit — ${String(editTarget.data['name'])}` : 'Edit Contact'}
        fields={editTarget ? buildContactEditFields(columns, editTarget.data) : []}
        data={editTarget?.data ?? {}}
        isSaving={isSavingEdit}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
      />

      <TableLayoutModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        tableTitle={`${locationName} Contacts`}
        allColumns={colDefs}
        layouts={layout.layouts}
        activeId={layout.activeId}
        onActivate={layout.activateLayout}
        onCreate={(name, cols) => layout.createLayout(name, cols)}
        onUpdate={(id, cols, nm) => layout.updateLayout(id, cols, nm)}
        onDelete={layout.deleteLayout}
      />
      <ContactUploadModal
        isOpen={showUploadModal}
        description={STHAN_CONTACT_UPLOAD_DESCRIPTION}
        onClose={() => setShowUploadModal(false)}
        onUpload={(file) => backendApi.uploadSthanContacts(locationId, file)}
        onUploaded={() => {
          setPage(1);
          load(1);
        }}
      />
      <PageHeader
        icon="📋"
        title={`${locationName} — Contacts`}
        subtitle={`Contact list for this sthan, uploaded from Excel.${sourceFile ? ` Source: ${sourceFile}` : ''}`}
        stats={[
          { label: 'contacts', value: total, variant: 'info' },
          ...(columns.length > 0 ? [{ label: 'columns', value: columns.length }] : []),
        ]}
        actions={
          <>
            {columns.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLayoutModal(true)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                Columns
                {layout.activeLayoutName && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px' }}>
                    {layout.activeLayoutName}
                  </span>
                )}
              </button>
            )}
            {total > 0 && (
              <button type="button" className="btn btn-danger-outline" onClick={handleClear}>
                Clear All
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowUploadModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
              </svg>
              Upload Contacts
            </button>
          </>
        }
      />

      {/* Empty state */}
      {!isLoading && total === 0 && (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No contacts yet</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Upload an Excel file (.xlsx or .xls) to populate this sthan's contact list.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            Upload Contacts
          </button>
        </div>
      )}

      {/* Table */}
      {(isLoading || total > 0) && (
        <>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                  {isLoading && columns.length === 0
                    ? <th>Loading…</th>
                    : <>
                        <th style={{ whiteSpace: 'nowrap' }}>Name</th>
                        {visibleCols.map((col) => (
                          <th key={col} style={{ whiteSpace: 'nowrap' }}>{MASTER_CONTACT_COLUMN_LABELS.get(col) ?? col}</th>
                        ))}
                        <th style={{ width: '56px' }} />
                      </>
                  }
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      {Array.from({ length: Math.max(visibleCols.length + 2, 4) }).map((__, j) => (
                        <td key={j}>
                          <div style={{ height: '12px', borderRadius: '4px', background: 'var(--border-dark)', width: '60%', animation: 'pulse 1.4s ease-in-out infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 3} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary-dark)' }}>
                      No contacts on this page.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>{row.rowIndex}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.data['name'] != null ? String(row.data['name']) : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.45 }}>—</span>}
                      </td>
                      {visibleCols.map((col) => {
                        const val = row.data[col];
                        return (
                          <td key={col} style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val !== null && val !== undefined ? String(val) : undefined}>
                            {val !== null && val !== undefined
                              ? <span>{String(val)}</span>
                              : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.45 }}>—</span>
                            }
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <TableRowActionsMenu
                          ariaLabel={`Actions for ${row.data['name'] != null ? String(row.data['name']) : 'contact'}`}
                          actions={[{ label: 'Edit', onClick: () => setEditTarget(row) }]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={(p) => { setPage(p); load(p); }}
          />
        </>
      )}

      <div className="glass-panel" style={{ padding: '14px 18px', marginTop: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>ℹ️</span>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', lineHeight: 1.6 }}>
          <strong>Sthan contact list:</strong> Upload an Excel file to populate this sthan's contact list.
          Column headers are auto-mapped. Uploading a new file replaces the existing contact list for this sthan.
        </div>
      </div>
    </div>
  );
};
