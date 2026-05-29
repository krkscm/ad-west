import React, { useCallback, useEffect, useRef, useState } from 'react';
import { backendApi, DocumentFileApi } from '../utils/backendApi';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/auth-context';

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

  const [docs, setDocs] = useState<DocumentFileApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setConfirmDeleteId(null);
    }
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
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>📁 {sreniName} — Documents</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px', marginBottom: 0 }}>
            Store and manage documents for this sreni. Max 2 MB per file.
          </p>
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid currentColor', background: 'transparent', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{docs.length}</span>
              {docs.length === 1 ? 'Document' : 'Documents'}
            </span>
          </div>
        </div>

        {/* Upload controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ width: '220px', fontSize: '0.875rem' }}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Uploading…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
                Upload Document
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleUpload}
            disabled={uploading}
          />
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && docs.length === 0 && (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📂</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No documents yet</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 24px' }}>
            Upload files to keep important documents accessible to administrators.
            Supports any file type up to 2 MB.
          </p>
          <button
            type="button"
            className="btn btn-primary"
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
      {!isLoading && docs.length > 0 && (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th style={{ whiteSpace: 'nowrap' }}>Size</th>
                <th>Description</th>
                <th style={{ whiteSpace: 'nowrap' }}>Uploaded</th>
                <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
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
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                        onClick={() => void handleDownload(doc)}
                      >
                        ↓ Download
                      </button>
                      {confirmDeleteId === doc.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                            onClick={() => void handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                          >
                            {deletingId === doc.id ? 'Deleting…' : 'Confirm Delete'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                          onClick={() => setConfirmDeleteId(doc.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
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
