import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { backendApi, SthanContactRowApi } from '../utils/backendApi';

interface Props {
  locationId: string;
  locationName: string;
}

const MASTER_CONTACT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'personalNumber', label: 'Personal Number' },
  { key: 'updatesAsPerAug2024', label: 'Updates as per Aug2024' },
  { key: 'ss', label: 'SS' },
  { key: 'companyMobileNo2', label: 'Company Mobile No 2' },
  { key: 'bhag', label: 'Bhag' },
  { key: 'samithi', label: 'Samithi' },
  { key: 'samithiStatus', label: 'Samithi Status' },
  { key: 'balabarathi', label: 'Balabarathi' },
  { key: 'bbStatus', label: 'BB Status' },
  { key: 'yoga', label: 'Yoga' },
  { key: 'familyOrBachelor', label: 'Family / Bachelor' },
  { key: 'family', label: 'Family' },
  { key: 'bachelor', label: 'Bachelor' },
  { key: 'addressInUae', label: 'Address in UAE' },
  { key: 'company', label: 'Company' },
  { key: 'profession', label: 'Profession' },
  { key: 'wifeName', label: 'Wife Name' },
  { key: 'mobileNo4', label: 'Mobile No 4' },
  { key: 'landLine', label: 'Land Line' },
  { key: 'zoneOrLandmark', label: 'Zone / Land Mark' },
  { key: 'district', label: 'District' },
];

const MASTER_LABEL_MAP = new Map<string, string>(
  MASTER_CONTACT_COLUMNS.map((c) => [c.key, c.label]),
);

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

export const SthanContactsPage: React.FC<Props> = ({ locationId, locationName }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<SthanContactRowApi[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sourceFile, setSourceFile] = useState<string | null>(null);

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
          const masterOrdered = MASTER_CONTACT_COLUMNS.map((c) => c.key).filter((k) => colSet.has(k));
          const extras = Array.from(colSet).filter((k) => !MASTER_LABEL_MAP.has(k)).sort((a, b) => a.localeCompare(b));
          setColumns([...masterOrdered, ...extras]);
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploading(true);
    try {
      const result = await backendApi.uploadSthanContacts(locationId, file);
      addToast(`Uploaded ${result.inserted} contact${result.inserted !== 1 ? 's' : ''} from "${file.name}".`, 'success');
      setPage(1);
      load(1);
    } catch (err) {
      addToast(toUiError(err, 'Upload failed.'), 'error');
    } finally {
      setIsUploading(false);
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

  const pageNums = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page - 1, page, page + 1, '…', totalPages];
  })();

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📋 {locationName} — Contacts</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
            Contact list for this sthan, uploaded from Excel.{sourceFile && (
              <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>Source: {sourceFile}</span>
            )}
          </p>
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid currentColor', background: 'transparent', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{total}</span> Total Contacts
            </span>
            {columns.length > 0 && (
              <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid var(--border-dark)', background: 'transparent', fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
                {columns.length} columns
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {total > 0 && (
            <button type="button" className="btn btn-secondary" onClick={handleClear}
              style={{ fontSize: '0.875rem', color: 'var(--error)', borderColor: 'var(--error)' }}>
              Clear All
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Uploading…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
                </svg>
                {total > 0 ? 'Re-upload Excel' : 'Upload Excel'}
              </>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => void handleUpload(e)} />
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && total === 0 && (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No contacts yet</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Upload an Excel file (.xlsx or .xls) to populate this sthan's contact list.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            Upload Excel File
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
                    : columns.map((col) => (
                        <th key={col} style={{ whiteSpace: 'nowrap' }}>{MASTER_LABEL_MAP.get(col) ?? col}</th>
                      ))
                  }
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      {Array.from({ length: Math.max(columns.length, 3) }).map((__, j) => (
                        <td key={j}>
                          <div style={{ height: '12px', borderRadius: '4px', background: 'var(--border-dark)', width: '60%', animation: 'pulse 1.4s ease-in-out infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary-dark)' }}>
                      No contacts on this page.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>{row.rowIndex}</td>
                      {columns.map((col) => {
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '20px 0', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>← Prev</button>
              {pageNums.map((n, i) =>
                n === '…' ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '6px 4px', color: 'var(--text-secondary-dark)' }}>…</span>
                ) : (
                  <button key={n} className={`btn ${page === n ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.82rem', minWidth: '36px' }}
                    onClick={() => { setPage(n as number); load(n as number); }}>{n}</button>
                )
              )}
              <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} disabled={page >= totalPages} onClick={() => { setPage(page + 1); load(page + 1); }}>Next →</button>
            </div>
          )}
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
