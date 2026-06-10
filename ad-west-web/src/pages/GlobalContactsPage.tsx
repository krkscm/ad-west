import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import { ContactEditModal } from '../components/common/ContactEditModal';
import { ContactUploadModal, GLOBAL_CONTACT_UPLOAD_DESCRIPTION } from '../components/common/ContactUploadModal';
import { buildContactEditFieldSections, MASTER_CONTACT_COLUMN_LABELS, orderContactColumns } from '../constants/contactColumns';
import { TableLayoutModal } from '../components/common/TableLayoutModal';
import { SwitchToggle } from '../components/common/SwitchToggle';
import { PageHeader } from '../components/common/PageHeader';
import { PAGE_SIZE_OPTIONS, PaginationBar } from '../components/common/PaginationBar';
import { EmptyState } from '../components/common/EmptyState';
import { TableRowActionsMenu } from '../components/common/TableRowActionsMenu';
import { useTableLayout } from '../hooks/useTableLayout';
import { TableColumnFilterRow, type TableColumnFilterDef } from '../components/common/TableColumnFilterRow';
import { TableColumnHeaderRow } from '../components/common/TableColumnHeaderRow';
import { TableNoResultsRow } from '../components/common/TableNoResultsRow';
import { useTableColumnFilters } from '../hooks/useTableColumnFilters';
import { useTableSort } from '../hooks/useTableSort';
import { isListFilterActive } from '../utils/tableListUtils';
import type { ListSortParams } from '../utils/backendApi';
import { useAdminDefinitions } from '../context/admin-definitions-context';
import {
  backendApi,
  ContactSreniTagApi,
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{sreni.name}</span>
                      <SwitchToggle
                        variant="inline"
                        checked={isChecked}
                        onChange={(checked) => toggleSreni(sreni.id, checked)}
                        ariaLabel={`Tag contact to ${sreni.name}`}
                      />
                    </div>

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
            {isSaving ? 'Updating…' : 'Update'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const GlobalContactsPage: React.FC = () => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const {
    sreniDefinitions,
    locationDefinitions,
    uploadSrenies: contextUploadSrenies,
    locationNames: contextLocationNames,
    ensureSthansLoaded: contextEnsureSthansLoaded,
    sthans: contextSthans,
  } = useAdminDefinitions();

  // ── Table layout (deferred until contacts load or Columns is opened) ──
  const [layoutEnabled, setLayoutEnabled] = useState(false);
  const layout = useTableLayout('global-contacts', { enabled: layoutEnabled });
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  // ── Data state ──
  const [rows, setRows] = useState<SreniContactRowApi[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // ── Reference data (from admin shell; extra locations lazy-loaded for edit) ──
  const [srenies, setSrenies] = useState<SreniDefinitionApi[]>(sreniDefinitions);
  const [sthans, setSthans] = useState<SthanBasicApi[]>(contextSthans);
  const [locationNames, setLocationNames] = useState(contextLocationNames);
  const [divisionsBySreni, setDivisionsBySreni] = useState<Map<string, SreniDivisionApi[]>>(new Map());
  const locationsLoaded = useRef(locationDefinitions.length > 0);

  // ── Batch-loaded additional sreni tags for current page ──
  const [tagsByContactId, setTagsByContactId] = useState<Record<string, ContactSreniTagApi[]>>({});
  const [tagsLoading, setTagsLoading] = useState(false);

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
  const [editTarget, setEditTarget] = useState<SreniContactRowApi | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const { filters, debouncedFilters, setFilter, clearFilters, filtersQuery } = useTableColumnFilters();
  const { sortBy, sortDir, toggleSort, clearSort, sortQuery } = useTableSort();

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

  const load = useCallback((p: number, sreniId: string, sthanId: string, search: string, ps?: number, colFilters = filtersQuery, sort: ListSortParams | undefined = sortQuery) => {
    setIsLoading(true);
    const size = ps ?? pageSize;

    backendApi.listAllContacts(p, size, {
      sreniId: sreniId || undefined,
      sthanId: sthanId || undefined,
      search: search || undefined,
      filters: colFilters,
      ...sort,
    })
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        // Discover columns from loaded rows
        const colSet = new Set<string>();
        for (const r of res.items) Object.keys(r.data).forEach((k) => colSet.add(k));
        if (colSet.size > 0) {
          setColumns(orderContactColumns(colSet));
        }
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load contacts.'), 'error'))
      .finally(() => setIsLoading(false));
  }, [addToast, pageSize, filtersQuery, sortQuery]);

  useEffect(() => {
    setSrenies(sreniDefinitions);
  }, [sreniDefinitions]);

  useEffect(() => {
    setLocationNames(contextLocationNames);
    if (contextLocationNames.length > 0) locationsLoaded.current = true;
  }, [contextLocationNames]);

  useEffect(() => {
    setSthans(contextSthans);
  }, [contextSthans]);

  const ensureSthansLoaded = useCallback(() => {
    contextEnsureSthansLoaded();
  }, [contextEnsureSthansLoaded]);

  const ensureLocationsLoaded = useCallback(() => {
    if (locationsLoaded.current) return;
    if (locationDefinitions.length > 0) {
      setLocationNames(contextLocationNames);
      locationsLoaded.current = true;
      return;
    }
    locationsLoaded.current = true;
    backendApi.listLocationDefinitions()
      .then((items) => setLocationNames(items.map((l) => ({ name: l.name, level: l.level }))))
      .catch(() => { locationsLoaded.current = false; });
  }, [locationDefinitions.length, contextLocationNames]);

  useEffect(() => {
    if (!isLoading && (rows.length > 0 || total > 0)) {
      setLayoutEnabled(true);
    }
  }, [isLoading, rows.length, total]);

  useEffect(() => {
    const contactIds = rows.map((row) => row.id);
    if (!contactIds.length) {
      setTagsByContactId({});
      setTagsLoading(false);
      return;
    }

    let cancelled = false;
    setTagsLoading(true);
    backendApi.listContactSreniTagsBatch(contactIds)
      .then((byContactId) => {
        if (!cancelled) setTagsByContactId(byContactId);
      })
      .catch(() => {
        if (!cancelled) setTagsByContactId({});
      })
      .finally(() => {
        if (!cancelled) setTagsLoading(false);
      });

    return () => { cancelled = true; };
  }, [rows]);

  useEffect(() => {
    if (rows.some((row) => row.sthanId)) {
      ensureSthansLoaded();
    }
  }, [rows, ensureSthansLoaded]);

  const editFieldOptions = useMemo(() => ({
    uploadSrenies: contextUploadSrenies.length > 0
      ? contextUploadSrenies
      : srenies.filter((s) => s.showInUploadExcel).map((s) => ({ id: s.id, name: s.name })),
    sthanNames: locationNames.filter((l) => l.level === 'STHAN').map((l) => l.name),
    zoneNames: locationNames.filter((l) => l.level === 'ZONE').map((l) => l.name),
  }), [contextUploadSrenies, srenies, locationNames]);

  const editSections = useMemo(
    () => (editTarget ? buildContactEditFieldSections(columns, editTarget.data, editFieldOptions) : []),
    [editTarget, columns, editFieldOptions],
  );

  useEffect(() => {
    load(1, filterSreniId, filterSthanId, appliedSearch);
    setPage(1);
  }, [filterSreniId, filterSthanId, appliedSearch, load]);

  useEffect(() => {
    if (filterSreniId) loadDivisions(filterSreniId);
  }, [filterSreniId, loadDivisions]);

  useEffect(() => {
    setPage(1);
    load(1, filterSreniId, filterSthanId, appliedSearch, undefined, filtersQuery);
  }, [debouncedFilters]);

  useEffect(() => {
    setPage(1);
    load(1, filterSreniId, filterSthanId, appliedSearch, undefined, filtersQuery, sortQuery);
  }, [sortBy, sortDir]);

  const sthanById = useMemo(() => new Map(sthans.map((s) => [s.id, s.name])), [sthans]);
  const sreniById = useMemo(() => new Map(srenies.map((s) => [s.id, s.name])), [srenies]);

  const contactFilterColumns = useMemo<TableColumnFilterDef[]>(() => {
    const divisionOptions = filterSreniId
      ? (divisionsBySreni.get(filterSreniId) ?? []).map((d) => ({ value: d.id, label: d.name }))
      : [];
    return [
      { key: '__index__', label: '#', filterable: false, sortable: false, align: 'center', width: '44px' },
      { key: 'name', label: 'Name', filterable: true, placeholder: 'Name…' },
      { key: '__primary_sreni__', label: 'Primary Sreni', filterable: false, sortable: false },
      { key: '__additional_srenis__', label: 'Additional Srenis', filterable: false, sortable: false },
      ...(divisionOptions.length
        ? [{ key: 'divisionId', label: 'Division', filterable: true as const, filterType: 'select' as const, placeholder: 'All divisions', options: divisionOptions }]
        : [{ key: '__division__', label: 'Division', filterable: false, sortable: false }]),
      {
        key: 'sthanId',
        label: 'Sthan',
        filterable: true,
        filterType: 'select',
        placeholder: 'All sthans',
        options: sthans.map((s) => ({ value: s.id, label: s.name })),
      },
      ...visibleCols.map((col) => ({
        key: col,
        label: MASTER_CONTACT_COLUMN_LABELS.get(col) ?? col,
        filterable: true,
        placeholder: MASTER_CONTACT_COLUMN_LABELS.get(col) ?? col,
      })),
      { key: '__actions__', filterable: false, sortable: false, width: '56px' },
    ];
  }, [filterSreniId, divisionsBySreni, sthans, visibleCols]);

  const openEdit = useCallback((row: SreniContactRowApi) => {
    ensureLocationsLoaded();
    setEditTarget(row);
  }, [ensureLocationsLoaded]);

  const openAssign = async (contact: SreniContactRowApi) => {
    ensureSthansLoaded();
    setAssignContact(contact);
    loadDivisions(contact.sreniId);

    const cachedTags = tagsByContactId[contact.id];
    if (cachedTags !== undefined) {
      setExistingTags(cachedTags);
      setIsLoadingTags(false);
      cachedTags.forEach((t) => loadDivisions(t.sreniId));
      return;
    }

    setExistingTags([]);
    setIsLoadingTags(true);
    try {
      const tags = await backendApi.listContactSreniTags(contact.id);
      setExistingTags(tags);
      setTagsByContactId((prev) => ({ ...prev, [contact.id]: tags }));
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
    const assignmentSreniId = assignContact.sreniId
      ?? args.sreniTags[0]?.sreniId
      ?? existingTags[0]?.sreniId
      ?? '';
    if (!assignmentSreniId) {
      addToast('Cannot assign: no Sreni context for this contact.', 'error');
      return;
    }
    setIsSavingAssign(true);
    try {
      await Promise.all([
        args.sthanId !== (assignContact.sthanId ?? null)
          ? backendApi.assignContactSthan(assignmentSreniId, assignContact.id, args.sthanId)
          : Promise.resolve(),
        args.primaryDivisionId !== (assignContact.divisionId ?? null)
          ? backendApi.assignContactDivision(assignmentSreniId, assignContact.id, args.primaryDivisionId)
          : Promise.resolve(),
        backendApi.setContactSreniTags(assignContact.id, args.sreniTags),
      ]);

      setRows((prev) => prev.map((r) => r.id !== assignContact.id ? r : {
        ...r,
        sthanId: args.sthanId ?? undefined,
        divisionId: args.primaryDivisionId ?? undefined,
      }));
      const refreshedTags = await backendApi.listContactSreniTags(assignContact.id);
      setTagsByContactId((prev) => ({ ...prev, [assignContact.id]: refreshedTags }));
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

  const handleSaveEdit = async (data: Record<string, string | number | boolean | null>) => {
    if (!editTarget) return;
    setIsSavingEdit(true);
    try {
      const updated = await backendApi.updateHouseholdContact(editTarget.id, data);
      setRows((prev) => prev.map((r) => r.id !== editTarget.id ? r : { ...r, data: updated.data }));
      setEditTarget(null);
      addToast('Contact updated.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to update contact.'), 'error');
    } finally {
      setIsSavingEdit(false);
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
  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim());
  const hasFiltersActive = isListFilterActive(appliedSearch, hasColumnFilters, filterSreniId, filterSthanId);
  const showEmptyState = !isLoading && total === 0 && !hasFiltersActive;
  const tableColSpan = 7 + visibleCols.length;

  const clearAllFilters = () => {
    clearFilters();
    clearSort();
    setAppliedSearch('');
    setSearchText('');
    setFilterSreniId('');
    setFilterSthanId('');
    setPage(1);
    load(1, '', '', '', undefined, undefined, undefined);
  };

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
        description={GLOBAL_CONTACT_UPLOAD_DESCRIPTION}
        onClose={() => setShowUploadModal(false)}
        previewUpload={(file) => backendApi.previewMemberContactUpload(file)}
        onUploaded={() => {
          setPage(1);
          load(1, filterSreniId, filterSthanId, appliedSearch);
        }}
      />

      <PageHeader
        icon="📋"
        title="Contacts"
        subtitle="All contacts across every Sreni. Tag each contact to multiple srenies, assign groups and sthans."
        stats={[{ label: 'contacts', value: total, variant: 'info' }]}
        actions={
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: 'var(--text-secondary-dark)', userSelect: 'none' }}>
              <span>Show inactive</span>
              <SwitchToggle
                variant="inline"
                checked={showInactive}
                onChange={setShowInactive}
                ariaLabel="Show inactive contacts"
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowUploadModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
              Upload Contacts
            </button>
          </>
        }
      />

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
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAppliedSearch(searchText)}>Search</button>
            {appliedSearch && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearchText(''); setAppliedSearch(''); }}>✕</button>
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
          <select
            className="form-input"
            value={filterSthanId}
            onFocus={ensureSthansLoaded}
            onChange={(e) => setFilterSthanId(e.target.value)}
          >
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
          onClick={() => { setLayoutEnabled(true); setShowLayoutModal(true); }}
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
      {isLoading && rows.length === 0 ? (
        <div className="glass-panel loading-state">Loading contacts…</div>
      ) : showEmptyState ? (
        <EmptyState
          icon="📋"
          title="No contacts found"
          copy="Upload contacts from any Sreni's contact page, or adjust the filters above."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
              Upload Contacts
            </button>
          }
        />
      ) : (
        <>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <TableColumnHeaderRow
                  columns={contactFilterColumns}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
                <TableColumnFilterRow
                  columns={contactFilterColumns}
                  values={filters}
                  onChange={setFilter}
                  onClear={clearAllFilters}
                />
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
                  : displayedRows.length === 0 ? (
                      <TableNoResultsRow colSpan={tableColSpan} title="No contacts match your filters" onClearFilters={clearAllFilters} />
                    ) : displayedRows.map((row, idx) => {
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
                            {tagsLoading && tagsByContactId[row.id] === undefined ? (
                              <span style={{ opacity: 0.35, fontSize: '0.8rem' }}>…</span>
                            ) : (tagsByContactId[row.id] ?? []).length === 0 ? (
                              <span style={{ opacity: 0.35, fontSize: '0.84rem' }}>—</span>
                            ) : (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {(tagsByContactId[row.id] ?? []).map((t) => (
                                  <span
                                    key={t.id}
                                    style={{
                                      fontSize: '0.73rem',
                                      fontWeight: 600,
                                      background: 'rgba(249,115,22,0.1)',
                                      color: '#fb923c',
                                      padding: '2px 7px',
                                      borderRadius: '5px',
                                      border: '1px solid rgba(249,115,22,0.25)',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {sreniById.get(t.sreniId) ?? t.sreniId}
                                  </span>
                                ))}
                              </div>
                            )}
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
                          <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                            <TableRowActionsMenu
                              ariaLabel={`Actions for ${row.data['name'] != null ? String(row.data['name']) : 'contact'}`}
                              actions={[
                                { label: 'Edit', onClick: () => openEdit(row) },
                                { label: 'Assign', onClick: () => void openAssign(row) },
                                {
                                  label: isInactive ? 'Activate' : 'Deactivate',
                                  tone: isInactive ? 'success' : 'warning',
                                  onClick: () => void handleToggleActive(row),
                                },
                                { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(row) },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(p) => { setPage(p); load(p, filterSreniId, filterSthanId, appliedSearch); }}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setPage(1);
              load(1, filterSreniId, filterSthanId, appliedSearch, ps);
            }}
          />
        </>
      )}
    </div>
  );
};
