import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { ContactEditModal } from '../components/common/ContactEditModal';
import { ContactUploadModal, STHAN_CONTACT_UPLOAD_DESCRIPTION } from '../components/common/ContactUploadModal';
import { TableRowActionsMenu } from '../components/common/TableRowActionsMenu';
import { TableLayoutModal } from '../components/common/TableLayoutModal';
import { PageHeader } from '../components/common/PageHeader';
import { PAGE_SIZE_OPTIONS, PaginationBar } from '../components/common/PaginationBar';
import { buildContactEditFieldSections, MASTER_CONTACT_COLUMN_LABELS, orderContactColumns } from '../constants/contactColumns';
import { useAdminDefinitions } from '../context/admin-definitions-context';
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
  const { uploadSrenies, locationNames } = useAdminDefinitions();
  const [rows, setRows] = useState<SthanContactRowApi[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SthanContactRowApi | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [layoutEnabled, setLayoutEnabled] = useState(false);

  const layout = useTableLayout('sthan-contacts', { enabled: layoutEnabled });

  const colDefs = useMemo(
    () => columns.filter((k) => k !== 'name').map((k) => ({ key: k, label: MASTER_CONTACT_COLUMN_LABELS.get(k) ?? k })),
    [columns],
  );
  const visibleCols = layout.visibleKeys(colDefs);

  const load = useCallback((p: number, ps?: number) => {
    setIsLoading(true);
    const size = ps ?? pageSize;
    backendApi.listSthanContacts(locationId, p, size)
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

  useEffect(() => {
    if (!isLoading && (rows.length > 0 || total > 0)) {
      setLayoutEnabled(true);
    }
  }, [isLoading, rows.length, total]);

  const editFieldOptions = useMemo(() => ({
    uploadSrenies,
    sthanNames: locationNames.filter((l) => l.level === 'STHAN').map((l) => l.name),
    zoneNames: locationNames.filter((l) => l.level === 'ZONE').map((l) => l.name),
  }), [uploadSrenies, locationNames]);

  const editSections = useMemo(
    () => (editTarget ? buildContactEditFieldSections(columns, editTarget.data, editFieldOptions) : []),
    [editTarget, columns, editFieldOptions],
  );

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
      await backendApi.clearSthanContacts(locationId);
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setPage(1);
      setColumns([]);
      setSourceFile(null);
      addToast('Contact list cleared.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to clear contacts.'), 'error');
    }
  };

  return (
    <div className="animate-slide-up">
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

      <ContactEditModal
        isOpen={editTarget !== null}
        title={editTarget?.data['name'] != null ? `Edit — ${String(editTarget.data['name'])}` : 'Edit Contact'}
        sections={editSections}
        data={editTarget?.data ?? {}}
        isSaving={isSavingEdit}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
      />

      <ContactUploadModal
        isOpen={showUploadModal}
        description={STHAN_CONTACT_UPLOAD_DESCRIPTION}
        onClose={() => setShowUploadModal(false)}
        previewUpload={(file) => backendApi.previewMemberContactUpload(file, { locationId })}
        onUploaded={() => {
          setPage(1);
          load(1);
        }}
      />

      <PageHeader
        icon="📋"
        title={`${locationName} Contacts`}
        subtitle="Manage contacts assigned to this Sthan."
        stats={[{ label: 'contacts', value: total, variant: 'info' }]}
        actions={
          <>
            {sourceFile && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
                Source: {sourceFile}
              </span>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => void handleClear()}>
              Clear List
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
              Upload Contacts
            </button>
          </>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => { setLayoutEnabled(true); setShowLayoutModal(true); }}
        >
          Columns
          {layout.activeLayoutName && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px' }}>
              {layout.activeLayoutName}
            </span>
          )}
        </button>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="glass-panel loading-state">Loading contacts…</div>
      ) : !isLoading && total === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
          No contacts yet. Upload a contact list to get started.
        </div>
      ) : (
        <>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>#</th>
                  <th>Name</th>
                  {visibleCols.map((k) => (
                    <th key={k}>{MASTER_CONTACT_COLUMN_LABELS.get(k) ?? k}</th>
                  ))}
                  <th style={{ width: '56px' }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {row.data['name'] != null ? String(row.data['name']) : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    {visibleCols.map((k) => {
                      const val = row.data[k];
                      return (
                        <td key={k} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {val != null ? String(val) : <span style={{ opacity: 0.35 }}>—</span>}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'right' }}>
                      <TableRowActionsMenu
                        ariaLabel={`Actions for ${row.data['name'] != null ? String(row.data['name']) : 'contact'}`}
                        actions={[
                          { label: 'Edit', onClick: () => setEditTarget(row) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(p) => { setPage(p); load(p); }}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setPage(1);
              load(1, ps);
            }}
          />
        </>
      )}
    </div>
  );
};
