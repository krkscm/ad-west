import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
import { EmptyState } from '../../components/common/EmptyState';
import { PaginationBar } from '../../components/common/PaginationBar';
import { useAdminDefinitions } from '../../context/admin-definitions-context';
import { backendApi, LocationDefinitionApi, PermissionApi, PermissionSetApi, SreniDefinitionApi } from '../../utils/backendApi';

const formatPermissionLabel = (
  p: PermissionApi | undefined,
  pid: string,
  locationById: Map<string, LocationDefinitionApi>,
  sreniById: Map<string, SreniDefinitionApi>,
): string => {
  if (!p) return `${pid.slice(0, 8)}…`;
  const loc = locationById.get(p.locationId);
  const sreni = sreniById.get(p.sreniId);
  if (loc && sreni) return `${loc.name} — ${sreni.name} Samyogak`;
  return p.name || p.code;
};
import { SwitchToggle } from '../../components/common/SwitchToggle';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

export const PermissionSetsPage: React.FC = () => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const { locationDefinitions, sreniDefinitions } = useAdminDefinitions();
  const permissionsLoaded = useRef(false);

  const [sets, setSets] = useState<PermissionSetApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [allPermissions, setAllPermissions] = useState<PermissionApi[]>([]);
  const [locations, setLocations] = useState<LocationDefinitionApi[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');

  const resetForm = () => {
    setEditingId(null); setFormName(''); setFormDescription('');
    setSelectedPermIds(new Set()); setPermSearch(''); setFormOpen(false);
  };

  const ensurePermissionsLoaded = () => {
    if (permissionsLoaded.current) return;
    permissionsLoaded.current = true;
    backendApi.listPermissions().then((perms) => setAllPermissions(perms)).catch(() => {
      permissionsLoaded.current = false;
    });
  };

  const loadSets = (p: number, ps: number, q: string) => {
    setIsLoading(true);
    backendApi.listPermissionSetsPaginated({ page: p, pageSize: ps, search: q })
      .then((res) => { setSets(res.items); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch((err) => addToast(toUiError(err, 'Failed to load permission sets.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { setLocations(locationDefinitions); }, [locationDefinitions]);

  useEffect(() => { ensurePermissionsLoaded(); }, []);

  useEffect(() => { loadSets(page, pageSize, search); }, [page, pageSize]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); loadSets(1, pageSize, q); }, 400);
  };

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
    loadSets(1, ps, search);
  };

  const permById = useMemo(() => {
    const m = new Map<string, PermissionApi>();
    allPermissions.forEach((p) => m.set(p.id, p));
    return m;
  }, [allPermissions]);

  const locationById = useMemo(() => {
    const m = new Map<string, LocationDefinitionApi>();
    locations.forEach((l) => m.set(l.id, l));
    return m;
  }, [locations]);

  const sreniById = useMemo(() => {
    const m = new Map<string, SreniDefinitionApi>();
    sreniDefinitions.forEach((s) => m.set(s.id, s));
    return m;
  }, [sreniDefinitions]);

  const filteredPerms = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    const active = allPermissions.filter((p) => p.active);
    if (!q) return active;
    return active.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  }, [allPermissions, permSearch]);

  const groupedPerms = useMemo(() => {
    const map = new Map<string, PermissionApi[]>();
    filteredPerms.forEach((p) => {
      const loc = locationById.get(p.locationId);
      const key = loc ? `${loc.name} (${loc.level})` : 'Other';
      map.set(key, [...(map.get(key) ?? []), p]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPerms, locationById]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) { addToast('Name is required.', 'warning'); return; }
    setIsSaving(true);
    try {
      if (editingId) {
        await backendApi.updatePermissionSet(editingId, { name: cleanName, description: formDescription.trim() || undefined });
        await backendApi.setPermissionSetItems(editingId, [...selectedPermIds]);
        addToast('Permission set updated.', 'success');
      } else {
        const created = await backendApi.createPermissionSet({ name: cleanName, description: formDescription.trim() || undefined, permissionIds: [...selectedPermIds] });
        if (selectedPermIds.size > 0) {
          await backendApi.setPermissionSetItems(created.id, [...selectedPermIds]);
        }
        addToast('Permission set created.', 'success');
      }
      resetForm();
      loadSets(page, pageSize, search);
    } catch (err) { addToast(toUiError(err, 'Failed to save.'), 'error'); }
    finally { setIsSaving(false); }
  };

  const handleToggleActive = async (s: PermissionSetApi) => {
    try {
      await backendApi.updatePermissionSet(s.id, { active: !s.active });
      addToast(`Permission set ${s.active ? 'deactivated' : 'activated'}.`, 'success');
      loadSets(page, pageSize, search);
    } catch (err) { addToast(toUiError(err, 'Failed to update.'), 'error'); }
  };

  const handleDelete = async (s: PermissionSetApi) => {
    const ok = await confirm({ title: 'Delete Permission Set', message: `Delete "${s.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deletePermissionSet(s.id);
      addToast('Permission set deleted.', 'success');
      if (editingId === s.id) resetForm();
      const newPage = sets.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      loadSets(newPage, pageSize, search);
    } catch (err) { addToast(toUiError(err, 'Failed to delete.'), 'error'); }
  };

  const startEdit = (s: PermissionSetApi) => {
    setEditingId(s.id); setFormName(s.name); setFormDescription(s.description ?? '');
    setSelectedPermIds(new Set(s.permissionIds)); setPermSearch('');
    setFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePerm = (id: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleFormOpen = () => {
    if (formOpen && !editingId) setFormOpen(false);
    else { resetForm(); setFormOpen(true); }
  };

  const hasTable = !isLoading && sets.length > 0;
  const activePermCount = allPermissions.filter((p) => p.active).length;

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="🗂️"
        title="Permission Sets"
        subtitle="Bundle atomic permissions into named sets that can be granted to roles or users."
        stats={[
          { label: 'Total', value: total, variant: 'info' },
          { label: 'Available Permissions', value: activePermCount, variant: 'warning' },
        ]}
        actions={
          <button type="button" className={`btn ${formOpen && !editingId ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleFormOpen}>
            <span style={{ fontSize: '1.15rem' }}>{formOpen && !editingId ? '✕' : '+'}</span>
            {formOpen && !editingId ? 'Close' : 'New Set'}
          </button>
        }
      />

      {formOpen && (
        <FormSection title={editingId ? 'Edit Permission Set' : 'New Permission Set'} accent="primary">
          <form onSubmit={(e) => void handleSave(e)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <input className="form-input" placeholder="e.g. Zone Admin Full Access" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" placeholder="What does this set grant?" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Permissions &nbsp;
                  <span style={{ fontWeight: 600, color: 'var(--text-primary-dark)', textTransform: 'none', letterSpacing: 0 }}>({selectedPermIds.size} selected)</span>
                </label>
                <input
                  className="form-input"
                  style={{ maxWidth: '240px', marginBottom: 0 }}
                  placeholder="Filter permissions…"
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                />
              </div>

              {selectedPermIds.size > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {[...selectedPermIds].map((pid) => {
                    const p = permById.get(pid);
                    return (
                      <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                        {formatPermissionLabel(p, pid, locationById, sreniById)}
                        <button type="button" onClick={() => togglePerm(pid)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#818cf8', fontSize: '0.85rem', padding: 0, lineHeight: 1 }}>✕</button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border-dark)', borderRadius: '8px' }}>
                {groupedPerms.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>No active permissions found.</div>
                ) : groupedPerms.map(([groupLabel, groupItems]) => (
                  <div key={groupLabel}>
                    <div style={{ padding: '6px 14px', background: 'var(--table-head-bg)', borderBottom: '1px solid var(--border-dark)', fontSize: '0.73rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>
                      {groupLabel}
                    </div>
                    {groupItems.map((p) => {
                      const checked = selectedPermIds.has(p.id);
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 14px', borderBottom: '1px solid var(--border-dark)', background: checked ? 'rgba(99,102,241,0.06)' : 'transparent', transition: 'background 0.15s' }}>
                          <SwitchToggle
                            variant="inline"
                            checked={checked}
                            onChange={() => togglePerm(p.id)}
                            ariaLabel={`Toggle permission ${p.name}`}
                          />
                          <span style={{ fontSize: '0.87rem', fontWeight: 600, flex: 1 }}>{formatPermissionLabel(p, p.id, locationById, sreniById)}</span>
                          {p.description && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.description}>{p.description}</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <FormActions>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? (editingId ? 'Updating…' : 'Creating…') : editingId ? 'Update' : 'Create'}</button>
            </FormActions>
          </form>
        </FormSection>
      )}

      <div className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`} style={{ marginBottom: hasTable ? 0 : '16px' }}>
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input className="form-input" placeholder="Search sets by name or description…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <div className="list-toolbar__meta">
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
            {isLoading ? 'Loading…' : `${total} set${total !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading permission sets…</div>
      ) : sets.length === 0 ? (
        <EmptyState
          icon="🔐"
          title={search ? 'No sets match your search' : 'No permission sets defined yet'}
          copy={search ? 'Try a different search term.' : 'Click "New Set" to create your first permission set.'}
          action={!search ? (
            <button type="button" className="btn btn-primary" onClick={toggleFormOpen}>New Set</button>
          ) : undefined}
        />
      ) : (
        <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                {['Name', 'Description', 'Permissions', 'Status', 'Actions'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.83rem' }}>{s.description ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {s.permissionIds.length === 0 ? (
                        <span style={{ opacity: 0.4, fontSize: '0.83rem' }}>None</span>
                      ) : s.permissionIds.slice(0, 4).map((pid) => {
                        const p = permById.get(pid);
                        return (
                          <span key={pid} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: 'var(--chip-bg-soft)', letterSpacing: '0.03em' }}>
                            {formatPermissionLabel(p, pid, locationById, sreniById)}
                          </span>
                        );
                      })}
                      {s.permissionIds.length > 4 && (
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                          +{s.permissionIds.length - 4} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ width: '90px' }}>
                    <span className={`badge ${s.active ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '0.8rem' }}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${s.name}`}
                      actions={[
                        { label: 'Edit', onClick: () => startEdit(s) },
                        { label: s.active ? 'Deactivate' : 'Activate', tone: s.active ? 'warning' : 'success', onClick: () => void handleToggleActive(s) },
                        { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(s) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
};
