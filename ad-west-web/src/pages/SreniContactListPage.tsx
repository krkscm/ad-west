import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import { TableLayoutModal } from '../components/common/TableLayoutModal';
import { backendApi, SreniContactRowApi, SreniDivisionApi, SthanBasicApi } from '../utils/backendApi';
import { useTableLayout } from '../hooks/useTableLayout';

interface Props {
  sreniId: string;
  sreniName: string;
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
  { key: 'company8', label: 'Company8' },
  { key: 'profession7', label: 'Profession7' },
  { key: 'yogaSecondary', label: 'Yoga (Secondary)' },
];

const MASTER_CONTACT_COLUMN_LABELS = new Map<string, string>(
  MASTER_CONTACT_COLUMNS.map((column) => [column.key, column.label]),
);

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

// ── Assign Division & Sthan Modal ─────────────────────────────────────────────

interface AssignModalProps {
  isOpen: boolean;
  contact: SreniContactRowApi | null;
  divisions: SreniDivisionApi[];
  sthans: SthanBasicApi[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (divisionId: string | null, sthanId: string | null) => void;
}

const AssignModal: React.FC<AssignModalProps> = ({ isOpen, contact, divisions, sthans, isSaving, onClose, onSave }) => {
  const [divisionId, setDivisionId] = useState<string>('');
  const [sthanId, setSthanId] = useState<string>('');

  useEffect(() => {
    if (contact) {
      setDivisionId(contact.divisionId ?? '');
      setSthanId(contact.sthanId ?? '');
    }
  }, [contact]);

  const contactName = contact?.data['name'] != null ? String(contact.data['name']) : 'Contact';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign — ${contactName}`} maxWidth="400px">
      <div style={{ display: 'grid', gap: '18px' }}>
        <div>
          <label className="form-label">Division</label>
          <select
            className="form-input"
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
          >
            <option value="">— None —</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {divisions.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '6px' }}>
              No divisions defined. Use "Manage Divisions" to add some.
            </p>
          )}
        </div>

        <div style={{ height: '1px', background: 'var(--border-dark)' }} />

        <div>
          <label className="form-label">Sthan</label>
          <select
            className="form-input"
            value={sthanId}
            onChange={(e) => setSthanId(e.target.value)}
          >
            <option value="">— None —</option>
            {sthans.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {sthans.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '6px' }}>
              No sthans found for this Sreni.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isSaving}
            onClick={() => onSave(divisionId || null, sthanId || null)}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Divisions Management Modal ────────────────────────────────────────────────

interface DivisionsModalProps {
  isOpen: boolean;
  sreniId: string;
  divisions: SreniDivisionApi[];
  onClose: () => void;
  onChanged: (divisions: SreniDivisionApi[]) => void;
}

const DivisionsModal: React.FC<DivisionsModalProps> = ({ isOpen, sreniId, divisions, onClose, onChanged }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<SreniDivisionApi[]>(divisions);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync if parent updates divisions (e.g. on reopen)
  useEffect(() => { setList(divisions); }, [divisions]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const created = await backendApi.createSreniDivision(sreniId, { name, displayOrder: list.length });
      const updated = [...list, created];
      setList(updated);
      onChanged(updated);
      setNewName('');
    } catch (err) {
      addToast(toUiError(err, 'Failed to create division.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const updated = await backendApi.updateSreniDivision(sreniId, id, { name });
      const updatedList = list.map((d) => (d.id === id ? updated : d));
      setList(updatedList);
      onChanged(updatedList);
      setEditingId(null);
    } catch (err) {
      addToast(toUiError(err, 'Failed to update division.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Division',
      message: `Delete division "${name}"? Contacts assigned to it will become unassigned.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await backendApi.deleteSreniDivision(sreniId, id);
      const updatedList = list.filter((d) => d.id !== id);
      setList(updatedList);
      onChanged(updatedList);
    } catch (err) {
      addToast(toUiError(err, 'Failed to delete division.'), 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Divisions" maxWidth="480px">
      {/* Add new division */}
      <div style={{ marginBottom: '20px' }}>
        <label className="form-label">New Division</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Enter division name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
            disabled={saving}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleAdd()}
            disabled={saving || !newName.trim()}
          >
            Add
          </button>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border-dark)', marginBottom: '16px' }} />

      {/* Division list */}
      {list.length === 0 ? (
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>
          No divisions defined yet. Add one above.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
          {list.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: '1px solid var(--border-dark)', borderRadius: '8px', background: 'var(--surface-dark)' }}>
              {editingId === d.id ? (
                <>
                  <input
                    className="form-input"
                    style={{ flex: 1, padding: '6px 10px' }}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveEdit(d.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    disabled={saving}
                  />
                  <button type="button" className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => void handleSaveEdit(d.id)} disabled={saving}>Save</button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary-dark)' }}>{d.name}</span>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => { setEditingId(d.id); setEditName(d.name); }}>Edit</button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px', color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => void handleDelete(d.id, d.name)}>Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '18px' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

// ── Pagination helper ─────────────────────────────────────────────────────────

const buildPageNums = (page: number, totalPages: number): (number | '…')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
  if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, '…', page - 1, page, page + 1, '…', totalPages];
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const SreniContactListPage: React.FC<Props> = ({ sreniId, sreniName }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'this-sreni' | 'all'>('this-sreni');
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  // ── Table layout hooks (per tab) ──
  const sreniLayout = useTableLayout('sreni-contacts');
  const allLayout = useTableLayout('all-contacts');

  // ── This Sreni tab state ──
  const [rows, setRows] = useState<SreniContactRowApi[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<SreniDivisionApi[]>([]);
  const [showDivisionsModal, setShowDivisionsModal] = useState(false);
  const [sthans, setSthans] = useState<SthanBasicApi[]>([]);
  // Assign modal state
  const [assignTarget, setAssignTarget] = useState<{ contact: SreniContactRowApi; tab: 'this-sreni' | 'all' } | null>(null);
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  // ── All Contacts tab state ──
  const [allRows, setAllRows] = useState<SreniContactRowApi[]>([]);
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [allTotal, setAllTotal] = useState(0);
  const [allTotalPages, setAllTotalPages] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Columns passed to layout hooks exclude 'name' (rendered as a fixed column)
  const sreniColDefs = useMemo(
    () => columns.filter((k) => k !== 'name').map((k) => ({ key: k, label: MASTER_CONTACT_COLUMN_LABELS.get(k) ?? k })),
    [columns],
  );
  const allColDefs = useMemo(
    () => allColumns.filter((k) => k !== 'name').map((k) => ({ key: k, label: MASTER_CONTACT_COLUMN_LABELS.get(k) ?? k })),
    [allColumns],
  );
  const visibleSreniCols = sreniLayout.visibleKeys(sreniColDefs);
  const visibleAllCols = allLayout.visibleKeys(allColDefs);

  const activeLayoutHook = activeTab === 'this-sreni' ? sreniLayout : allLayout;
  const activeColDefs = activeTab === 'this-sreni' ? sreniColDefs : allColDefs;

  const loadDivisions = useCallback(() => {
    backendApi.listSreniDivisions(sreniId)
      .then(setDivisions)
      .catch(() => {/* non-critical */});
    backendApi.listSthans()
      .then(setSthans)
      .catch(() => {/* non-critical */});
  }, [sreniId]);

  const load = useCallback((p: number) => {
    setIsLoading(true);
    backendApi.listSreniContacts(sreniId, p, pageSize)
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        const colSet = new Set<string>();
        for (const r of res.items) Object.keys(r.data).forEach((k) => colSet.add(k));
        if (colSet.size > 0) {
          const masterOrdered = MASTER_CONTACT_COLUMNS.map((c) => c.key).filter((k) => colSet.has(k));
          const extras = Array.from(colSet).filter((k) => !MASTER_CONTACT_COLUMN_LABELS.has(k)).sort((a, b) => a.localeCompare(b));
          setColumns([...masterOrdered, ...extras]);
        }
        if (res.items.length > 0 && res.items[0].sourceFile) setSourceFile(res.items[0].sourceFile);
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load contacts.'), 'error'))
      .finally(() => setIsLoading(false));
  }, [sreniId, pageSize, addToast]);

  const loadAll = useCallback((p: number) => {
    setIsLoadingAll(true);
    backendApi.listAllContacts(p, pageSize)
      .then((res) => {
        setAllRows(res.items);
        setAllTotal(res.total);
        setAllTotalPages(res.totalPages);
        const colSet = new Set<string>();
        for (const r of res.items) Object.keys(r.data).forEach((k) => colSet.add(k));
        if (colSet.size > 0) {
          const masterOrdered = MASTER_CONTACT_COLUMNS.map((c) => c.key).filter((k) => colSet.has(k));
          const extras = Array.from(colSet).filter((k) => !MASTER_CONTACT_COLUMN_LABELS.has(k)).sort((a, b) => a.localeCompare(b));
          setAllColumns([...masterOrdered, ...extras]);
        }
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load all contacts.'), 'error'))
      .finally(() => setIsLoadingAll(false));
  }, [pageSize, addToast]);

  useEffect(() => {
    setPage(1); setRows([]); setColumns([]); setTotal(0); setTotalPages(1); setSourceFile(null);
    setAllPage(1); setAllRows([]); setAllColumns([]); setAllTotal(0); setAllTotalPages(1);
    setSthans([]);
    load(1);
    loadAll(1);
    loadDivisions();
  }, [sreniId, load, loadAll, loadDivisions]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploading(true);
    try {
      const result = await backendApi.uploadSreniContacts(sreniId, file);
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
      message: `Remove all contacts for ${sreniName}? This cannot be undone. You can re-upload a new file after clearing.`,
      confirmLabel: 'Clear All',
      danger: true,
    });
    if (!ok) return;
    try {
      const result = await backendApi.clearSreniContacts(sreniId);
      addToast(`Cleared ${result.deleted} contact${result.deleted !== 1 ? 's' : ''}.`, 'success');
      setRows([]); setColumns([]); setTotal(0); setTotalPages(1); setSourceFile(null);
    } catch (err) {
      addToast(toUiError(err, 'Failed to clear contacts.'), 'error');
    }
  };

  const handleSaveAssign = async (divisionId: string | null, sthanId: string | null) => {
    if (!assignTarget) return;
    const { contact, tab } = assignTarget;
    setIsSavingAssign(true);
    try {
      const [updatedDiv, updatedSthan] = await Promise.all([
        divisionId !== (contact.divisionId ?? null)
          ? backendApi.assignContactDivision(contact.sreniId, contact.id, divisionId)
          : Promise.resolve(contact),
        sthanId !== (contact.sthanId ?? null)
          ? backendApi.assignContactSthan(contact.sreniId, contact.id, sthanId)
          : Promise.resolve(contact),
      ]);
      const merged: SreniContactRowApi = {
        ...contact,
        divisionId: updatedDiv.divisionId,
        sthanId: updatedSthan.sthanId,
      };
      if (tab === 'this-sreni') {
        setRows((prev) => prev.map((r) => (r.id === contact.id ? merged : r)));
      } else {
        setAllRows((prev) => prev.map((r) => (r.id === contact.id ? { ...merged, sreniName: r.sreniName } : r)));
      }
      setAssignTarget(null);
    } catch (err) {
      addToast(toUiError(err, 'Failed to save assignment.'), 'error');
    } finally {
      setIsSavingAssign(false);
    }
  };

  const renderPagination = (
    currentPage: number,
    currentTotalPages: number,
    onPageChange: (p: number) => void,
  ) => {
    if (currentTotalPages <= 1) return null;
    const nums = buildPageNums(currentPage, currentTotalPages);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '20px 0', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>← Prev</button>
        {nums.map((n, i) => n === '…'
          ? <span key={`e-${i}`} style={{ padding: '6px 4px', color: 'var(--text-secondary-dark)' }}>…</span>
          : <button key={n} className={`btn ${currentPage === n ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.82rem', minWidth: '36px' }} onClick={() => onPageChange(n as number)}>{n}</button>
        )}
        <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} disabled={currentPage >= currentTotalPages} onClick={() => onPageChange(currentPage + 1)}>Next →</button>
      </div>
    );
  };

  return (
    <div className="animate-slide-up">
      <TableLayoutModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        tableTitle={activeTab === 'this-sreni' ? `${sreniName} Contacts` : 'All Contacts'}
        allColumns={activeColDefs}
        layouts={activeLayoutHook.layouts}
        activeId={activeLayoutHook.activeId}
        onActivate={activeLayoutHook.activateLayout}
        onCreate={(name, cols) => activeLayoutHook.createLayout(name, cols)}
        onUpdate={(id, cols, nm) => activeLayoutHook.updateLayout(id, cols, nm)}
        onDelete={activeLayoutHook.deleteLayout}
      />
      <DivisionsModal
        isOpen={showDivisionsModal}
        sreniId={sreniId}
        divisions={divisions}
        onClose={() => setShowDivisionsModal(false)}
        onChanged={(updated) => { setDivisions(updated); }}
      />
      <AssignModal
        isOpen={assignTarget !== null}
        contact={assignTarget?.contact ?? null}
        divisions={divisions}
        sthans={sthans}
        isSaving={isSavingAssign}
        onClose={() => setAssignTarget(null)}
        onSave={handleSaveAssign}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📋 {sreniName} — Contacts</h2>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid currentColor', background: 'transparent', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ fontWeight: 800 }}>{total}</span> This Sreni
            </span>
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid var(--border-dark)', background: 'transparent', fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
              <span style={{ fontWeight: 700 }}>{allTotal}</span> All Contacts
            </span>
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid var(--border-dark)', background: 'transparent', fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
              {divisions.length} division{divisions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Actions — only on This Sreni tab */}
        {activeTab === 'this-sreni' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.875rem' }} onClick={() => setShowDivisionsModal(true)}>
              Manage Divisions
            </button>
            <a href="/templates/master-sreni-contact-template.xlsx" download className="btn btn-secondary" style={{ fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Download Template
            </a>
            {total > 0 && (
              <button type="button" className="btn btn-secondary" onClick={handleClear} style={{ fontSize: '0.875rem', color: 'var(--error)', borderColor: 'var(--error)' }}>
                Clear All
              </button>
            )}
            <button type="button" className="btn btn-primary" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? (
                <><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Uploading…</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path></svg>{total > 0 ? 'Re-upload Excel' : 'Upload Excel'}</>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => void handleUpload(e)} />
          </div>
        )}
      </div>

      {/* Customize Columns button (always visible, per active tab) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setShowLayoutModal(true)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Columns
          {activeLayoutHook.activeLayoutName && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px' }}>
              {activeLayoutHook.activeLayoutName}
            </span>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['this-sreni', 'all'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === 'this-sreni' ? `This Sreni (${total})` : `All Contacts (${allTotal})`;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-dark)'}`,
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary-dark)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── This Sreni Tab ── */}
      {activeTab === 'this-sreni' && (
        <>
          {!isLoading && total === 0 && (
            <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
              <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No contacts yet</h3>
              <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', margin: '0 auto 24px', maxWidth: '400px' }}>
                Upload the master contact Excel template to populate this Sreni's contact list.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>Upload Excel File</button>
            </div>
          )}

          {(isLoading || total > 0) && (
            <>
              {sourceFile && <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem', marginBottom: '12px', fontStyle: 'italic' }}>Source: {sourceFile}</p>}
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Name</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Division</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Sthan</th>
                      {isLoading && columns.length === 0 ? <th>Loading…</th> : visibleSreniCols.map((col) => (
                        <th key={col} style={{ whiteSpace: 'nowrap' }}>{MASTER_CONTACT_COLUMN_LABELS.get(col) ?? col}</th>
                      ))}
                      <th style={{ width: '80px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          {Array.from({ length: Math.max(visibleSreniCols.length + 3, 5) }).map((__, j) => (
                            <td key={j}><div style={{ height: '12px', borderRadius: '4px', background: 'var(--border-dark)', width: `${50 + (j * 17) % 40}%`, animation: 'pulse 1.4s ease-in-out infinite' }} /></td>
                          ))}
                        </tr>
                      ))
                    ) : rows.map((row) => {
                      const divName = row.divisionId ? divisions.find((d) => d.id === row.divisionId)?.name : null;
                      const sthanName = row.sthanId ? sthans.find((s) => s.id === row.sthanId)?.name : null;
                      return (
                        <tr key={row.id}>
                          <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>{row.rowIndex}</td>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.data['name'] != null ? String(row.data['name']) : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.45 }}>—</span>}
                          </td>
                          <td>
                            {divName
                              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(99,102,241,0.25)' }}>{divName}</span>
                              : <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>}
                          </td>
                          <td>
                            {sthanName
                              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(20,184,166,0.1)', color: '#2dd4bf', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(20,184,166,0.25)' }}>{sthanName}</span>
                              : <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>}
                          </td>
                          {visibleSreniCols.map((col) => {
                            const val = row.data[col];
                            return (
                              <td key={col} style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val != null ? String(val) : undefined}>
                                {val != null ? String(val) : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.45 }}>—</span>}
                              </td>
                            );
                          })}
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                              onClick={() => setAssignTarget({ contact: row, tab: 'this-sreni' })}
                            >
                              Assign
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {renderPagination(page, totalPages, (p) => { setPage(p); load(p); })}
            </>
          )}
        </>
      )}

      {/* ── All Contacts Tab ── */}
      {activeTab === 'all' && (
        <>
          {isLoadingAll && allRows.length === 0 && (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>Loading all contacts…</div>
          )}

          {(!isLoadingAll && allTotal === 0) && (
            <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
              <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No contacts in the system yet</h3>
              <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>Upload contacts from any Sreni's contact page to see them here.</p>
            </div>
          )}

          {(isLoadingAll || allTotal > 0) && (
            <>
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Name</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Sthan</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Sreni</th>
                      {isLoadingAll && allColumns.length === 0 ? <th>Loading…</th> : visibleAllCols.map((col) => (
                        <th key={col} style={{ whiteSpace: 'nowrap' }}>{MASTER_CONTACT_COLUMN_LABELS.get(col) ?? col}</th>
                      ))}
                      <th style={{ width: '80px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingAll ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          {Array.from({ length: Math.max(visibleAllCols.length + 4, 6) }).map((__, j) => (
                            <td key={j}><div style={{ height: '12px', borderRadius: '4px', background: 'var(--border-dark)', width: `${50 + (j * 17) % 40}%`, animation: 'pulse 1.4s ease-in-out infinite' }} /></td>
                          ))}
                        </tr>
                      ))
                    ) : allRows.map((row, idx) => {
                      const sthanName = row.sthanId ? sthans.find((s) => s.id === row.sthanId)?.name : null;
                      return (
                        <tr key={row.id}>
                          <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>{(allPage - 1) * pageSize + idx + 1}</td>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.data['name'] != null ? String(row.data['name']) : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.45 }}>—</span>}
                          </td>
                          <td>
                            {sthanName
                              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(20,184,166,0.1)', color: '#2dd4bf', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(20,184,166,0.25)' }}>{sthanName}</span>
                              : <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600,
                              background: row.sreniId === sreniId ? 'rgba(99,102,241,0.1)' : 'transparent',
                              color: row.sreniId === sreniId ? '#818cf8' : 'var(--text-secondary-dark)',
                              padding: '2px 8px', borderRadius: '5px',
                              border: `1px solid ${row.sreniId === sreniId ? 'rgba(99,102,241,0.25)' : 'var(--border-dark)'}`,
                            }}>
                              {row.sreniName ?? row.sreniId}
                            </span>
                          </td>
                          {visibleAllCols.map((col) => {
                            const val = row.data[col];
                            return (
                              <td key={col} style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val != null ? String(val) : undefined}>
                                {val != null ? String(val) : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.45 }}>—</span>}
                              </td>
                            );
                          })}
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                              onClick={() => setAssignTarget({ contact: row, tab: 'all' })}
                            >
                              Assign
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {renderPagination(allPage, allTotalPages, (p) => { setAllPage(p); loadAll(p); })}
            </>
          )}

          <div className="glass-panel" style={{ padding: '12px 16px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>ℹ️</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
              Read-only view. Contacts highlighted in purple belong to <strong>{sreniName}</strong>. To upload or manage contacts, switch to the <strong>This Sreni</strong> tab.
            </span>
          </div>
        </>
      )}
    </div>
  );
};
