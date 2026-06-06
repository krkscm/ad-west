import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { backendApi, LocationDefinitionApi, PermissionApi, SreniDefinitionApi } from '../../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

export const PermissionDefinitionsPage: React.FC = () => {
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<PermissionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [locations, setLocations] = useState<LocationDefinitionApi[]>([]);
  const [sreniDefs, setSreniDefs] = useState<SreniDefinitionApi[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState('');
  const [sreniId, setSreniId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setEditingId(null); setLocationId(''); setSreniId('');
    setCode(''); setName(''); setDescription(''); setFormOpen(false);
  };

  const loadSupport = () => {
    backendApi.listLocationDefinitions().then((loc) => setLocations(loc)).catch(() => {});
    backendApi.listSreniDefinitions().then((sd) => setSreniDefs(sd)).catch(() => {});
  };

  const loadPerms = (p: number, ps: number, q: string, locId: string) => {
    setIsLoading(true);
    backendApi.listPermissionsPaginated({ page: p, pageSize: ps, search: q, locationId: locId || undefined })
      .then((res) => { setItems(res.items); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch((err) => addToast(toUiError(err, 'Failed to load permissions.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadSupport(); }, []);
  useEffect(() => { loadPerms(page, pageSize, search, locationFilter); }, [page, pageSize, locationFilter]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); loadPerms(1, pageSize, q, locationFilter); }, 400);
  };

  const handleLocationFilter = (locId: string) => {
    setLocationFilter(locId);
    setPage(1);
  };

  const activeLocations = useMemo(() => locations.filter((l) => l.active), [locations]);
  const activeSreniDefs = useMemo(() => sreniDefs.filter((s) => s.active), [sreniDefs]);
  const locationById = useMemo(() => { const m = new Map<string, LocationDefinitionApi>(); locations.forEach((l) => m.set(l.id, l)); return m; }, [locations]);
  const sreniById = useMemo(() => { const m = new Map<string, SreniDefinitionApi>(); sreniDefs.forEach((s) => m.set(s.id, s)); return m; }, [sreniDefs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_');
    const cleanName = name.trim();
    if (!locationId) { addToast('Location is required.', 'warning'); return; }
    if (!sreniId) { addToast('Sreni is required.', 'warning'); return; }
    if (!cleanCode || !cleanName) { addToast('Code and Name are required.', 'warning'); return; }
    setIsSaving(true);
    try {
      if (editingId) {
        await backendApi.updatePermission(editingId, { code: cleanCode, name: cleanName, description: description.trim() || undefined });
        addToast('Permission updated.', 'success');
      } else {
        await backendApi.createPermission({ locationId, sreniId, code: cleanCode, name: cleanName, description: description.trim() || undefined });
        addToast('Permission created.', 'success');
      }
      resetForm();
      loadPerms(page, pageSize, search, locationFilter);
    } catch (err) { addToast(toUiError(err, 'Failed to save permission.'), 'error'); }
    finally { setIsSaving(false); }
  };

  const handleToggleActive = async (p: PermissionApi) => {
    try {
      await backendApi.updatePermission(p.id, { active: !p.active });
      addToast(`Permission ${p.active ? 'deactivated' : 'activated'}.`, 'success');
      loadPerms(page, pageSize, search, locationFilter);
    } catch (err) { addToast(toUiError(err, 'Failed to update.'), 'error'); }
  };

  const handleDelete = async (p: PermissionApi) => {
    const ok = await confirm({ title: 'Delete Permission', message: `Delete "${p.name}" (${p.code})? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deletePermission(p.id);
      addToast('Permission deleted.', 'success');
      if (editingId === p.id) resetForm();
      const newPage = items.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      loadPerms(newPage, pageSize, search, locationFilter);
    } catch (err) { addToast(toUiError(err, 'Failed to delete.'), 'error'); }
  };

  const startEdit = (p: PermissionApi) => {
    setEditingId(p.id); setLocationId(p.locationId); setSreniId(p.sreniId);
    setCode(p.code); setName(p.name); setDescription(p.description ?? '');
    setFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageNums = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page - 1, page, page + 1, '…', totalPages];
  })();

  const hasTable = !isLoading && items.length > 0;

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="🔒"
        title="Permission Definitions"
        subtitle="Each permission maps a Location to a Sreni and defines an operational scope."
        stats={[{ label: 'Total', value: total, variant: 'info' }]}
        actions={
          <button type="button" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '16px', paddingRight: '16px' }}
            onClick={() => { if (formOpen && !editingId) setFormOpen(false); else { resetForm(); setFormOpen(true); } }}>
            {formOpen && !editingId ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            )}
            {formOpen && !editingId ? 'Close' : 'New Permission'}
          </button>
        }
      />

      {/* Form */}
      {formOpen && (
        <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '20px', borderLeft: '3px solid var(--primary)', animation: 'slideUp 0.22s ease' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingId ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Edit Permission
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                New Permission
              </>
            )}
          </h3>
          <form onSubmit={(e) => void handleSave(e)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)', marginBottom: '6px' }}>Location <span style={{ color: 'var(--error)' }}>*</span></label>
                <select className="form-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!!editingId} required style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                  <option value="">Select a location…</option>
                  {activeLocations.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.level}){l.code ? ` — ${l.code}` : ''}</option>)}
                </select>
                {editingId && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginTop: '4px' }}>Location cannot be changed after creation.</p>}
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)', marginBottom: '6px' }}>Sreni <span style={{ color: 'var(--error)' }}>*</span></label>
                <select className="form-input" value={sreniId} onChange={(e) => setSreniId(e.target.value)} disabled={!!editingId} required style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                  <option value="">Select a sreni…</option>
                  {activeSreniDefs.map((s) => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
                </select>
                {editingId && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginTop: '4px' }}>Sreni cannot be changed after creation.</p>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)', marginBottom: '6px' }}>Code *</label>
                <input className="form-input" placeholder="e.g. Z1_MEMBERSHIP" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} required style={{ fontSize: '0.875rem' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginTop: '4px' }}>Uppercase letters, numbers and underscores</p>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)', marginBottom: '6px' }}>Name *</label>
                <input className="form-input" placeholder="e.g. Zone 1 Membership Operations" value={name} onChange={(e) => setName(e.target.value)} required style={{ fontSize: '0.875rem' }} />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)', marginBottom: '6px' }}>Description</label>
              <input className="form-input" placeholder="What does this permission govern?" value={description} onChange={(e) => setDescription(e.target.value)} style={{ fontSize: '0.875rem' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm} style={{ fontSize: '0.875rem' }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ fontSize: '0.875rem' }}>{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Permission'}</button>
            </div>
          </form>
        </div>
      )}

      <div className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`} style={{ marginBottom: hasTable ? 0 : '16px' }}>
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input className="form-input" placeholder="Search code or name…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <select className="form-input" style={{ maxWidth: '200px', marginBottom: 0, fontSize: '0.875rem', cursor: 'pointer' }} value={locationFilter} onChange={(e) => handleLocationFilter(e.target.value)}>
          <option value="">All locations</option>
          {activeLocations.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.level})</option>)}
        </select>
        {(search || locationFilter) && (
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => { setSearch(''); handleLocationFilter(''); }}>Clear Filters</button>
        )}
        <div className="list-toolbar__meta">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>Rows:</span>
          {[10, 20, 50].map((ps) => (
            <button key={ps} type="button" className={`page-size-pill${pageSize === ps ? ' is-active' : ''}`} onClick={() => { setPageSize(ps); setPage(1); }}>
              {ps}
            </button>
          ))}
          {!isLoading && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
              {total} permission{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading permissions…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title={search || locationFilter ? 'No permissions match your search' : 'No permissions defined yet'}
          copy={search || locationFilter ? 'Try adjusting your filters.' : 'Click "New Permission" to add one.'}
        />
      ) : (
      <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, boxShadow: 'none' }}>
        <table className="custom-table">
          <thead>
            <tr>
              {['Code', 'Name', 'Location', 'Sreni', 'Description', 'Status', 'Actions'].map((col) => (
                <th key={col} style={{ textAlign: 'left' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
                const loc = locationById.get(p.locationId);
                const sreni = sreniById.get(p.sreniId);
                const locLevel = loc?.level ?? '';
                const locColorClass = locLevel === 'ZONE' ? 'badge-info' : 'badge-warning';
                
                return (
                  <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, background: 'var(--chip-bg-soft)', color: 'var(--text-primary-dark)', padding: '3px 8px', borderRadius: '5px' }}>{p.code}</code>
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      {loc ? (
                        <span className={`badge ${locColorClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid currentColor', background: 'transparent', padding: '3px 8px' }}>
                          <span>{loc.level === 'ZONE' ? '🏢' : '📍'}</span>
                          <span>{loc.name}</span>
                        </span>
                      ) : <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>{p.locationId.slice(0, 8)}…</span>}
                    </td>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      {sreni ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid currentColor', background: 'transparent', padding: '3px 8px' }}>
                          <span>📦</span>
                          <span>{sreni.name}</span>
                        </span>
                      ) : <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>{p.sreniId.slice(0, 8)}…</span>}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-secondary-dark)', fontSize: '0.83rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.description}>
                      {p.description ?? <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.8rem', 
                        fontWeight: 600,
                        color: p.active ? 'var(--success)' : 'var(--error)' 
                      }}>
                        <span 
                          className="status-dot"
                          style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: p.active ? 'var(--success)' : 'var(--error)',
                            boxShadow: p.active ? '0 0 8px var(--success)' : '0 0 8px var(--error)',
                            display: 'inline-block',
                            animation: p.active ? 'pulse 2s infinite' : 'none'
                          }} 
                        />
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => startEdit(p)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          Edit
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ 
                          padding: '6px 12px', 
                          fontSize: '0.8rem', 
                          color: p.active ? 'var(--error)' : 'var(--success)',
                          borderColor: p.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          background: p.active ? 'rgba(239, 68, 68, 0.02)' : 'rgba(16, 185, 129, 0.02)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }} onClick={() => void handleToggleActive(p)}>
                          {p.active ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                              Deactivate
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                              Activate
                            </>
                          )}
                        </button>
                        <button type="button" className="btn btn-secondary" style={{
                          padding: '6px 10px',
                          color: 'var(--error)',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                          background: 'rgba(239, 68, 68, 0.02)',
                        }} onClick={() => void handleDelete(p)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      )}

      {/* Pagination */}
      {hasTable && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '14px 18px', borderTop: '1px solid var(--border-dark)' }}>
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-dark)', background: 'transparent', color: page === 1 ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: '0.82rem' }}>
            ← Prev
          </button>
          {pageNums.map((n, i) => (
            <button key={i} type="button" onClick={() => typeof n === 'number' && setPage(n)} disabled={n === '…'}
              style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid', minWidth: '34px', borderColor: n === page ? 'var(--primary)' : 'var(--border-dark)', background: n === page ? 'var(--primary)' : 'transparent', color: n === page ? '#fff' : 'var(--text-primary-dark)', fontWeight: n === page ? 700 : 400, cursor: n === '…' ? 'default' : 'pointer', fontSize: '0.82rem' }}>
              {n}
            </button>
          ))}
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-dark)', background: 'transparent', color: page === totalPages ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: '0.82rem' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
