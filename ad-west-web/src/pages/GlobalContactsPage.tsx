import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import { TableLayoutModal } from '../components/common/TableLayoutModal';
import { useTableLayout } from '../hooks/useTableLayout';
import {
  backendApi,
  ContactSreniTagApi,
  GlobalContactUploadDuplicateApi,
  SreniContactRowApi,
  SreniDefinitionApi,
  SreniDivisionApi,
  SthanBasicApi,
} from '../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

const buildPageNums = (page: number, totalPages: number): (number | '…')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
  if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, '…', page - 1, page, page + 1, '…', totalPages];
};

// ── Assign Tags Modal ─────────────────────────────────────────────────────────

interface AssignTagsModalProps {
  isOpen: boolean;
  contact: SreniContactRowApi | null;
  existingTags: ContactSreniTagApi[];
  srenies: SreniDefinitionApi[];
  divisionsBySreni: Map<string, SreniDivisionApi[]>;
  sthans: SthanBasicApi[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (args: {
    sthanId: string | null;
    primaryDivisionId: string | null;
    sreniTags: Array<{ sreniId: string; divisionId: string | null }>;
  }) => void;
  onNeedDivisions: (sreniId: string) => void;
}

const AssignTagsModal: React.FC<AssignTagsModalProps> = ({
  isOpen, contact, existingTags, srenies, divisionsBySreni, sthans,
  isSaving, onClose, onSave, onNeedDivisions,
}) => {
  const [sthanId, setSthanId] = useState('');
  const [primaryDivisionId, setPrimaryDivisionId] = useState('');
  const [tagMap, setTagMap] = useState<Map<string, string>>(new Map()); // sreniId -> divisionId

  useEffect(() => {
    if (!contact) return;
    setSthanId(contact.sthanId ?? '');
    setPrimaryDivisionId(contact.divisionId ?? '');
    const m = new Map<string, string>();
    for (const tag of existingTags) m.set(tag.sreniId, tag.divisionId ?? '');
    setTagMap(m);
  }, [contact, existingTags]);

  const contactName = contact?.data['name'] != null ? String(contact.data['name']) : 'Contact';

  const toggleSreni = (sreniId: string, checked: boolean) => {
    setTagMap((prev) => {
      const next = new Map(prev);
      if (checked) {
        next.set(sreniId, '');
        onNeedDivisions(sreniId);
      } else {
        next.delete(sreniId);
      }
      return next;
    });
  };

  const setTagDivision = (sreniId: string, divisionId: string) => {
    setTagMap((prev) => new Map(prev).set(sreniId, divisionId));
  };

  const handleSave = () => {
    const sreniTags = Array.from(tagMap.entries()).map(([sreniId, divisionId]) => ({
      sreniId,
      divisionId: divisionId || null,
    }));
    onSave({
      sthanId: sthanId || null,
      primaryDivisionId: primaryDivisionId || null,
      sreniTags,
    });
  };

  const primarySreni = srenies.find((s) => s.id === contact?.sreniId);
  const primaryDivisions = contact ? (divisionsBySreni.get(contact.sreniId) ?? []) : [];
  const otherSrenies = srenies.filter((s) => s.id !== contact?.sreniId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign — ${contactName}`} maxWidth="520px">
      <div style={{ display: 'grid', gap: '20px' }}>

        {/* Primary sreni info */}
        {primarySreni && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', fontWeight: 600 }}>PRIMARY SRENI</span>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '4px', color: '#818cf8' }}>{primarySreni.name}</div>
          </div>
        )}

        {/* Division for primary sreni */}
        {primaryDivisions.length > 0 && (
          <div>
            <label className="form-label">Division (in {primarySreni?.name ?? 'primary sreni'})</label>
            <select className="form-input" value={primaryDivisionId} onChange={(e) => setPrimaryDivisionId(e.target.value)}>
              <option value="">— None —</option>
              {primaryDivisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        {/* Sthan */}
        <div>
          <label className="form-label">Sthan</label>
          <select className="form-input" value={sthanId} onChange={(e) => setSthanId(e.target.value)}>
            <option value="">— None —</option>
            {sthans.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ height: '1px', background: 'var(--border-dark)' }} />

        {/* Additional sreni tags */}
        <div>
          <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
            Additional Sreni Tags
            <span style={{ marginLeft: '8px', fontWeight: 400, fontSize: '0.76rem', color: 'var(--text-secondary-dark)' }}>
              Tag this contact to more srenies
            </span>
          </label>

          {otherSrenies.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>No other srenies available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {otherSrenies.map((sreni) => {
                const isChecked = tagMap.has(sreni.id);
                const tagDivisionId = tagMap.get(sreni.id) ?? '';
                const sreniDivisions = divisionsBySreni.get(sreni.id) ?? [];
                return (
                  <div key={sreni.id} style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${isChecked ? 'rgba(99,102,241,0.35)' : 'var(--border-dark)'}`, background: isChecked ? 'rgba(99,102,241,0.06)' : 'var(--surface-dark)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleSreni(sreni.id, e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sreni.name}</span>
                    </label>

                    {isChecked && (
                      <div style={{ marginTop: '8px', paddingLeft: '26px' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', display: 'block', marginBottom: '4px' }}>
                          Group / Division in {sreni.name}
                        </label>
                        <select
                          className="form-input"
                          style={{ fontSize: '0.84rem', padding: '6px 10px' }}
                          value={tagDivisionId}
                          onChange={(e) => setTagDivision(sreni.id, e.target.value)}
                        >
                          <option value="">— None —</option>
                          {sreniDivisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        {sreniDivisions.length === 0 && (
                          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary-dark)', marginTop: '4px' }}>
                            No divisions defined for this sreni.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Upload Modal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  isOpen: boolean;
  sreniById: Map<string, string>;
  onClose: () => void;
  onUploaded: (inserted: number) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, sreniById, onClose, onUploaded }) => {
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [duplicates, setDuplicates] = useState<GlobalContactUploadDuplicateApi[]>([]);
  const [uploadDone, setUploadDone] = useState(false);
  const [insertedCount, setInsertedCount] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setDuplicates([]);
      setUploadDone(false);
      setInsertedCount(0);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.files?.[0]?.name ?? '');
    setDuplicates([]);
    setUploadDone(false);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await backendApi.uploadGlobalContacts(file);
      setInsertedCount(result.inserted);
      setDuplicates(result.duplicates);
      setUploadDone(true);
      onUploaded(result.inserted);
      if (result.duplicates.length === 0) {
        addToast(`Uploaded ${result.inserted} contact${result.inserted !== 1 ? 's' : ''}.`, 'success');
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? (err.message.match(/^API error \(\d+\):\s*(.*)$/i)?.[1] ?? err.message) : 'Upload failed.';
      addToast(msg, 'error');
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Contacts" maxWidth="500px">
      {!uploadDone ? (
        <div style={{ display: 'grid', gap: '18px' }}>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary-dark)', margin: 0 }}>
            Upload an Excel file (.xlsx / .xls). Contacts with a matching <strong>Personal Number</strong> already in the system will be flagged as duplicates and skipped — new contacts will be added to the global list.
          </p>

          <div>
            <label className="form-label">Excel File</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.84rem', whiteSpace: 'nowrap' }}
                disabled={isUploading}
                onClick={() => fileRef.current?.click()}
              >
                Choose file
              </button>
              <span style={{ fontSize: '0.82rem', color: fileName ? 'var(--text-primary-dark)' : 'var(--text-secondary-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fileName || 'No file selected'}
              </span>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isUploading}>Cancel</button>
            <a href="/templates/master-sreni-contact-template.xlsx" download className="btn btn-secondary" style={{ fontSize: '0.84rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Template
            </a>
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              disabled={!fileName || isUploading}
              onClick={() => void handleUpload()}
            >
              {isUploading
                ? <><span style={{ display: 'inline-block', width: '13px', height: '13px', border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Uploading…</>
                : 'Upload'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Summary */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span className="badge badge-success" style={{ padding: '5px 12px', fontSize: '0.82rem' }}>
              {insertedCount} inserted
            </span>
            {duplicates.length > 0 && (
              <span className="badge badge-warning" style={{ padding: '5px 12px', fontSize: '0.82rem' }}>
                {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''} skipped
              </span>
            )}
          </div>

          {/* Duplicate list */}
          {duplicates.length > 0 && (
            <>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary-dark)', margin: 0 }}>
                The following rows were skipped because a contact with the same Personal Number already exists:
              </p>
              <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--border-dark)', borderRadius: '8px' }}>
                <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '48px' }}>Row</th>
                      <th>Name</th>
                      <th>Personal No.</th>
                      <th>Existing Sreni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.map((d) => (
                      <tr key={`${d.rowIndex}-${d.personalNumber}`}>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)' }}>{d.rowIndex}</td>
                        <td>{d.name ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                        <td style={{ fontFamily: 'monospace' }}>{d.personalNumber ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                        <td>
                          {d.existingSreniId
                            ? <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 7px', borderRadius: '4px' }}>
                                {sreniById.get(d.existingSreniId) ?? d.existingSreniId}
                              </span>
                            : <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

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

const MASTER_CONTACT_COLUMN_LABELS = new Map(MASTER_CONTACT_COLUMNS.map((c) => [c.key, c.label]));

export const GlobalContactsPage: React.FC = () => {
  const { addToast } = useToast();
  const confirm = useConfirm();

  // ── Table layout ──
  const layout = useTableLayout('global-contacts');
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  // ── Data state ──
  const [rows, setRows] = useState<SreniContactRowApi[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // ── Reference data ──
  const [srenies, setSrenies] = useState<SreniDefinitionApi[]>([]);
  const [sthans, setSthans] = useState<SthanBasicApi[]>([]);
  const [divisionsBySreni, setDivisionsBySreni] = useState<Map<string, SreniDivisionApi[]>>(new Map());

  // ── Filter state ──
  const [filterSreniId, setFilterSreniId] = useState('');
  const [filterSthanId, setFilterSthanId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // ── Assign modal state ──
  const [assignContact, setAssignContact] = useState<SreniContactRowApi | null>(null);
  const [existingTags, setExistingTags] = useState<ContactSreniTagApi[]>([]);
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const pageSize = 50;

  // Columns available to the layout modal (excludes 'name' which is always pinned)
  const colDefs = useMemo(
    () => columns.filter((k) => k !== 'name').map((k) => ({ key: k, label: MASTER_CONTACT_COLUMN_LABELS.get(k) ?? k })),
    [columns],
  );

  // Derive visible columns directly from the primitive layout state so the dep comparison
  // is always on plain values (string | null, and array reference), not on function closures.
  const visibleCols = useMemo(() => {
    if (!colDefs.length) return [];
    const activeLayout = layout.activeId
      ? layout.layouts.find((l) => l.id === layout.activeId)
      : null;
    // No active layout or layout saved with no columns → show everything (Default view)
    if (!activeLayout || !activeLayout.columns.length) return colDefs.map((c) => c.key);
    // Active layout: show ONLY the columns that are saved as visible
    const colDefKeys = new Set(colDefs.map((c) => c.key));
    return activeLayout.columns
      .filter((sc) => sc.visible && colDefKeys.has(sc.key))
      .map((sc) => sc.key);
  }, [layout.activeId, layout.layouts, colDefs]);

  const loadDivisions = useCallback((sreniId: string) => {
    if (divisionsBySreni.has(sreniId)) return;
    backendApi.listSreniDivisions(sreniId)
      .then((divs) => {
        setDivisionsBySreni((prev) => new Map(prev).set(sreniId, divs));
      })
      .catch(() => {/* non-critical */});
  }, [divisionsBySreni]);

  const load = useCallback((p: number, sreniId: string, sthanId: string, search: string) => {
    setIsLoading(true);
    const qs = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (sreniId) qs.set('sreniId', sreniId);
    if (sthanId) qs.set('sthanId', sthanId);
    if (search.trim()) qs.set('search', search.trim());

    backendApi.listAllContacts(p, pageSize)
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        // Discover columns from loaded rows
        const colSet = new Set<string>();
        for (const r of res.items) Object.keys(r.data).forEach((k) => colSet.add(k));
        if (colSet.size > 0) {
          const masterOrdered = MASTER_CONTACT_COLUMNS.map((c) => c.key).filter((k) => colSet.has(k));
          const extras = Array.from(colSet).filter((k) => !MASTER_CONTACT_COLUMN_LABELS.has(k)).sort((a, b) => a.localeCompare(b));
          setColumns([...masterOrdered, ...extras]);
        }
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load contacts.'), 'error'))
      .finally(() => setIsLoading(false));
  }, [addToast, pageSize]);

  useEffect(() => {
    backendApi.listSreniDefinitions()
      .then((items) => {
        setSrenies(items);
      })
      .catch(() => {});
    backendApi.listSthans()
      .then(setSthans)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load(1, filterSreniId, filterSthanId, appliedSearch);
    setPage(1);
  }, [filterSreniId, filterSthanId, appliedSearch, load]);

  const sthanById = useMemo(() => new Map(sthans.map((s) => [s.id, s.name])), [sthans]);
  const sreniById = useMemo(() => new Map(srenies.map((s) => [s.id, s.name])), [srenies]);

  const openAssign = async (contact: SreniContactRowApi) => {
    setAssignContact(contact);
    setExistingTags([]);
    setIsLoadingTags(true);
    loadDivisions(contact.sreniId);
    try {
      const tags = await backendApi.listContactSreniTags(contact.id);
      setExistingTags(tags);
      tags.forEach((t) => loadDivisions(t.sreniId));
    } catch {
      // non-critical — modal opens with empty tags
    } finally {
      setIsLoadingTags(false);
    }
  };

  const handleSaveAssign = async (args: {
    sthanId: string | null;
    primaryDivisionId: string | null;
    sreniTags: Array<{ sreniId: string; divisionId: string | null }>;
  }) => {
    if (!assignContact) return;
    setIsSavingAssign(true);
    try {
      await Promise.all([
        args.sthanId !== (assignContact.sthanId ?? null)
          ? backendApi.assignContactSthan(assignContact.sreniId, assignContact.id, args.sthanId)
          : Promise.resolve(),
        args.primaryDivisionId !== (assignContact.divisionId ?? null)
          ? backendApi.assignContactDivision(assignContact.sreniId, assignContact.id, args.primaryDivisionId)
          : Promise.resolve(),
        backendApi.setContactSreniTags(assignContact.id, args.sreniTags),
      ]);

      setRows((prev) => prev.map((r) => r.id !== assignContact.id ? r : {
        ...r,
        sthanId: args.sthanId ?? undefined,
        divisionId: args.primaryDivisionId ?? undefined,
      }));
      setAssignContact(null);
      addToast('Assignments saved.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to save assignments.'), 'error');
    } finally {
      setIsSavingAssign(false);
    }
  };

  const handleToggleActive = async (row: SreniContactRowApi) => {
    const activating = !row.active;
    const name = row.data['name'] != null ? String(row.data['name']) : 'this contact';
    const ok = await confirm({
      title: activating ? 'Reactivate Contact' : 'Deactivate Contact',
      message: activating
        ? `Reactivate "${name}"? They will appear as active again.`
        : `Deactivate "${name}"? They will be hidden from active lists but kept in the database.`,
      confirmLabel: activating ? 'Reactivate' : 'Deactivate',
      danger: !activating,
    });
    if (!ok) return;
    try {
      const updated = await backendApi.toggleContactActive(row.sreniId, row.id, activating);
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, active: updated.active } : r));
      addToast(`Contact ${activating ? 'reactivated' : 'deactivated'}.`, 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to update contact status.'), 'error');
    }
  };

  const handleDelete = async (row: SreniContactRowApi) => {
    const name = row.data['name'] != null ? String(row.data['name']) : 'this contact';
    const ok = await confirm({
      title: 'Delete Contact',
      message: `Permanently delete "${name}"? This cannot be undone and will remove all sreni tag assignments.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await backendApi.deleteContact(row.sreniId, row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setTotal((prev) => prev - 1);
      addToast('Contact deleted.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to delete contact.'), 'error');
    }
  };

  const displayedRows = showInactive ? rows : rows.filter((r) => r.active !== false);

  return (
    <div className="animate-slide-up">
      <TableLayoutModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        tableTitle="Global Contacts"
        allColumns={colDefs}
        layouts={layout.layouts}
        activeId={layout.activeId}
        onActivate={layout.activateLayout}
        onCreate={(name, cols) => layout.createLayout(name, cols)}
        onUpdate={(id, cols, nm) => layout.updateLayout(id, cols, nm)}
        onDelete={layout.deleteLayout}
      />

      <AssignTagsModal
        isOpen={assignContact !== null && !isLoadingTags}
        contact={assignContact}
        existingTags={existingTags}
        srenies={srenies}
        divisionsBySreni={divisionsBySreni}
        sthans={sthans}
        isSaving={isSavingAssign}
        onClose={() => setAssignContact(null)}
        onSave={handleSaveAssign}
        onNeedDivisions={loadDivisions}
      />

      <UploadModal
        isOpen={showUploadModal}
        sreniById={sreniById}
        onClose={() => setShowUploadModal(false)}
        onUploaded={(_inserted) => {
          setPage(1);
          load(1, filterSreniId, filterSthanId, appliedSearch);
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>📋 Contacts</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', margin: '6px 0 0' }}>
            All contacts across every Sreni. Tag each contact to multiple srenies, assign groups and sthans.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary-dark)', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }}
            />
            Show inactive
          </label>
          <span className="badge badge-info" style={{ padding: '5px 14px', fontSize: '0.82rem', fontWeight: 700 }}>
            {total} contacts
          </span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowUploadModal(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            Upload Contacts
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '14px 16px', marginBottom: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label className="form-label" style={{ marginBottom: '4px' }}>Search by name</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Type name…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch(searchText); }}
            />
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem' }} onClick={() => setAppliedSearch(searchText)}>Search</button>
            {appliedSearch && (
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem' }} onClick={() => { setSearchText(''); setAppliedSearch(''); }}>✕</button>
            )}
          </div>
        </div>

        <div style={{ flex: '1 1 160px' }}>
          <label className="form-label" style={{ marginBottom: '4px' }}>Filter by Sreni</label>
          <select className="form-input" value={filterSreniId} onChange={(e) => setFilterSreniId(e.target.value)}>
            <option value="">All Srenies</option>
            {srenies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ flex: '1 1 160px' }}>
          <label className="form-label" style={{ marginBottom: '4px' }}>Filter by Sthan</label>
          <select className="form-input" value={filterSthanId} onChange={(e) => setFilterSthanId(e.target.value)}>
            <option value="">All Sthans</option>
            {sthans.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Columns button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setShowLayoutModal(true)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Columns
          {layout.activeLayoutName && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px' }}>
              {layout.activeLayoutName}
            </span>
          )}
        </button>
      </div>

      {/* Table */}
      {(isLoading && rows.length === 0) || layout.loading ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
          Loading contacts…
        </div>
      ) : !isLoading && total === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No contacts found</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', margin: '0 auto', maxWidth: '380px' }}>
            Upload contacts from any Sreni's contact page, or adjust the filters above.
          </p>
        </div>
      ) : (
        <>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>#</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Name</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Primary Sreni</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Additional Srenis</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Division</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Sthan</th>
                  {visibleCols.map((k) => (
                    <th key={k} style={{ whiteSpace: 'nowrap' }}>{MASTER_CONTACT_COLUMN_LABELS.get(k) ?? k}</th>
                  ))}
                  <th style={{ width: '140px' }} />
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 + visibleCols.length }).map((__, j) => (
                          <td key={j}><div style={{ height: '12px', borderRadius: '4px', background: 'var(--border-dark)', width: `${50 + (j * 19) % 40}%`, animation: 'pulse 1.4s ease-in-out infinite' }} /></td>
                        ))}
                      </tr>
                    ))
                  : displayedRows.map((row, idx) => {
                      const sthanName = row.sthanId ? sthanById.get(row.sthanId) : null;
                      const sreniName = sreniById.get(row.sreniId) ?? row.sreniName ?? row.sreniId;
                      const divName = row.divisionId
                        ? divisionsBySreni.get(row.sreniId)?.find((d) => d.id === row.divisionId)?.name
                        : null;
                      const isInactive = row.active === false;

                      return (
                        <tr key={row.id} style={isInactive ? { opacity: 0.5 } : undefined}>
                          <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>
                            {(page - 1) * pageSize + idx + 1}
                          </td>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.data['name'] != null
                              ? <span style={isInactive ? { textDecoration: 'line-through' } : undefined}>{String(row.data['name'])}</span>
                              : <span style={{ opacity: 0.4 }}>—</span>}
                            {isInactive && <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: 'rgba(100,116,139,0.15)', color: 'var(--text-secondary-dark)', padding: '1px 6px', borderRadius: '4px' }}>inactive</span>}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(99,102,241,0.25)' }}>
                              {sreniName}
                            </span>
                          </td>
                          <td>
                            <AdditionalSreniTags contactId={row.id} sreniById={sreniById} />
                          </td>
                          <td>
                            {divName
                              ? <span style={{ fontSize: '0.78rem', fontWeight: 600, background: 'rgba(99,102,241,0.08)', color: '#a78bfa', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(167,139,250,0.25)' }}>{divName}</span>
                              : <span style={{ opacity: 0.35, fontSize: '0.84rem' }}>—</span>}
                          </td>
                          <td>
                            {sthanName
                              ? <span style={{ fontSize: '0.78rem', fontWeight: 600, background: 'rgba(20,184,166,0.1)', color: '#2dd4bf', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(20,184,166,0.25)' }}>{sthanName}</span>
                              : <span style={{ opacity: 0.35, fontSize: '0.84rem' }}>—</span>}
                          </td>
                          {visibleCols.map((k) => {
                            const val = row.data[k];
                            return (
                              <td key={k} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val != null ? String(val) : undefined}>
                                {val != null ? String(val) : <span style={{ opacity: 0.35, fontSize: '0.84rem' }}>—</span>}
                              </td>
                            );
                          })}
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 9px', fontSize: '0.78rem' }}
                                onClick={() => void openAssign(row)}
                              >
                                Assign
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 9px', fontSize: '0.78rem', color: isInactive ? 'var(--success)' : 'var(--warning)', borderColor: isInactive ? 'var(--success)' : 'var(--warning)' }}
                                onClick={() => void handleToggleActive(row)}
                                title={isInactive ? 'Reactivate' : 'Deactivate'}
                              >
                                {isInactive ? 'Activate' : 'Deactivate'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 9px', fontSize: '0.78rem', color: 'var(--error)', borderColor: 'var(--error)' }}
                                onClick={() => void handleDelete(row)}
                                title="Delete permanently"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (() => {
            const nums = buildPageNums(page, totalPages);
            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '20px 0', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p, filterSreniId, filterSthanId, appliedSearch); }}>← Prev</button>
                {nums.map((n, i) => n === '…'
                  ? <span key={`e-${i}`} style={{ padding: '6px 4px', color: 'var(--text-secondary-dark)' }}>…</span>
                  : <button key={n} className={`btn ${page === n ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.82rem', minWidth: '36px' }} onClick={() => { const p = n as number; setPage(p); load(p, filterSreniId, filterSthanId, appliedSearch); }}>{n}</button>
                )}
                <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p, filterSreniId, filterSthanId, appliedSearch); }}>Next →</button>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

// ── Additional sreni tags inline cell ─────────────────────────────────────────

const tagCache = new Map<string, ContactSreniTagApi[]>();

const AdditionalSreniTags: React.FC<{ contactId: string; sreniById: Map<string, string> }> = ({ contactId, sreniById }) => {
  const [tags, setTags] = useState<ContactSreniTagApi[] | null>(tagCache.get(contactId) ?? null);

  useEffect(() => {
    if (tags !== null) return;
    backendApi.listContactSreniTags(contactId)
      .then((t) => {
        tagCache.set(contactId, t);
        setTags(t);
      })
      .catch(() => setTags([]));
  }, [contactId, tags]);

  if (tags === null) return <span style={{ opacity: 0.35, fontSize: '0.8rem' }}>…</span>;
  if (tags.length === 0) return <span style={{ opacity: 0.35, fontSize: '0.84rem' }}>—</span>;

  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {tags.map((t) => (
        <span key={t.id} style={{ fontSize: '0.73rem', fontWeight: 600, background: 'rgba(249,115,22,0.1)', color: '#fb923c', padding: '2px 7px', borderRadius: '5px', border: '1px solid rgba(249,115,22,0.25)', whiteSpace: 'nowrap' }}>
          {sreniById.get(t.sreniId) ?? t.sreniId}
        </span>
      ))}
    </div>
  );
};
