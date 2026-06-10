import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { backendApi, DocumentFileApi } from '../utils/backendApi';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { TableRowActionsMenu } from '../components/common/TableRowActionsMenu';
import { useAuth } from '../context/auth-context';
import { TableColumnFilterRow, type TableColumnFilterDef } from '../components/common/TableColumnFilterRow';
import { TableColumnHeaderRow } from '../components/common/TableColumnHeaderRow';
import { TableNoResultsRow } from '../components/common/TableNoResultsRow';
import { isListFilterActive } from '../utils/tableListUtils';
import { useTableColumnFilters } from '../hooks/useTableColumnFilters';
import { useTableSort } from '../hooks/useTableSort';
import { applyClientColumnFilters, type ClientFilterAccessor } from '../utils/clientTableFilter';
import { applyClientColumnSort } from '../utils/clientTableSort';

interface Props {
  sreniId: string;
  sreniName: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const SreniDocumentsPage: React.FC<Props> = ({ sreniId, sreniName }) => {
  const { token } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [docs, setDocs] = useState<DocumentFileApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { filters, debouncedFilters, setFilter, clearFilters } = useTableColumnFilters();
  const { sortBy, sortDir, toggleSort, clearSort } = useTableSort();

  const filterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'fileName', label: 'File Name', filterable: true, placeholder: 'File name…' },
    { key: 'size', label: 'Size', filterable: true, placeholder: 'Size…' },
    { key: 'description', label: 'Description', filterable: true, placeholder: 'Description…' },
    { key: 'uploaded', label: 'Uploaded', filterable: true, placeholder: 'Uploaded…' },
    { key: '__actions__', label: 'Actions', filterable: false, sortable: false, align: 'right' },
  ], []);

  const accessors = useMemo<Record<string, ClientFilterAccessor<DocumentFileApi>>>(() => ({
    fileName: { getValue: (doc) => doc.fileName },
    size: { getValue: (doc) => (doc.fileSize ? formatBytes(doc.fileSize) : '') },
    description: { getValue: (doc) => doc.description ?? '' },
    uploaded: { getValue: (doc) => formatDate(doc.createdAt) },
  }), []);

  const displayedRows = useMemo(
    () => applyClientColumnSort(
      applyClientColumnFilters(docs, debouncedFilters, accessors),
      sortBy,
      sortDir,
      accessors,
    ),
    [docs, debouncedFilters, accessors, sortBy, sortDir],
  );
  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim());
  const hasFiltersActive = isListFilterActive(hasColumnFilters);
  const clearAllFilters = () => {
    clearFilters();
    clearSort();
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await backendApi.listDocumentFiles(sreniId);
      setDocs(result);
    } catch {
      addToast('Failed to load documents.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sreniId, addToast]);

  useEffect(() => { void load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      addToast(`File too large. Maximum allowed size is 2 MB (selected: ${formatBytes(file.size)}).`, 'error');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      await backendApi.uploadSreniDocument(sreniId, file, description.trim() || undefined);
      addToast(`"${file.name}" uploaded successfully.`, 'success');
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      void load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      await backendApi.deleteSreniDocument(docId);
      addToast('Document deleted.', 'success');
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeletePrompt = async (doc: DocumentFileApi) => {
    const ok = await confirm({
      title: 'Delete Document',
      message: `Delete "${doc.fileName}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) void handleDelete(doc.id);
  };

  const handleDownload = async (doc: DocumentFileApi) => {
    const url = backendApi.downloadSreniDocument(doc.id);
    const t = token ?? localStorage.getItem('adwest_token') ?? '';
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      addToast('Failed to download document.', 'error');
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="📁"
        title={`${sreniName} — Documents`}
        subtitle="Store and manage documents for this sreni. Max 2 MB per file."
        stats={[
          { label: docs.length === 1 ? 'Document' : 'Documents', value: docs.length, variant: 'info' },
        ]}
        actions={
          <>
            <input
              type="text"
              className="form-input"
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: '220px' }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload Document'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleUpload}
              disabled={uploading}
            />
          </>
        }
      />

      {/* Empty state */}
      {!isLoading && docs.length === 0 && !hasFiltersActive && (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📂</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No documents yet</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 24px' }}>
            Upload files to keep important documents accessible to administrators.
            Supports any file type up to 2 MB.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload First Document
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.9rem' }}>
          Loading documents…
        </div>
      )}

      {/* Document table */}
      {!isLoading && (docs.length > 0 || hasFiltersActive) && (
        <div className="table-container" style={{ overflowX: 'auto' }}>
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
                <TableNoResultsRow colSpan={5} title="No documents match your filters" onClearFilters={clearAllFilters} />
              ) : displayedRows.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>📄 {doc.fileName}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {doc.fileSize ? formatBytes(doc.fileSize) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>
                    {doc.description || '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {formatDate(doc.createdAt)}
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${doc.fileName}`}
                      actions={[
                        { label: 'Download', onClick: () => void handleDownload(doc) },
                        { label: deletingId === doc.id ? 'Deleting…' : 'Delete', tone: 'danger', onClick: () => void handleDeletePrompt(doc), disabled: deletingId === doc.id },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
