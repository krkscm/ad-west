import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { backendApi, EnumValueApi, LocationDefinitionApi } from '../../utils/backendApi';

type LocationLevel = LocationDefinitionApi['level'];

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

const LEVEL_META: Record<LocationLevel, { icon: string; label: string; badgeClass: string }> = {
  ZONE:     { icon: '🏢', label: 'Zone',     badgeClass: 'badge-info' },
  STHAN:    { icon: '📍', label: 'Sthan',    badgeClass: 'badge-warning' },
  DIVISION: { icon: '🗂️', label: 'Division', badgeClass: 'badge-success' },
};

const LevelBadge: React.FC<{ level: LocationLevel }> = ({ level }) => {
  const meta = LEVEL_META[level] ?? { icon: '📌', label: level, badgeClass: 'badge-info' };
  return (
    <span
      className={`badge ${meta.badgeClass}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid currentColor', background: 'transparent' }}
    >
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
};

export const LocationDefinitionPage: React.FC = () => {
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<LocationDefinitionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LocationLevel | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<LocationLevel>('ZONE');
  const [parentId, setParentId] = useState<string>('');
  const [allLocations, setAllLocations] = useState<LocationDefinitionApi[]>([]);
  const [roleLevels, setRoleLevels] = useState<EnumValueApi[]>([]);

  useEffect(() => {
    backendApi.listLocationDefinitions()
      .then((locs) => setAllLocations(locs))
      .catch(() => {});
    backendApi.listEnumValues('role_level', true)
      .then((vals) => setRoleLevels(vals))
      .catch(() => {});
  }, []);

  // Find the parent level value from the role_level hierarchy for the current level
  const currentLevelEnum = roleLevels.find((r) => r.value === level);
  const parentLevelValue = currentLevelEnum?.parentValue ?? null;
  const parentOptions = parentLevelValue
    ? allLocations.filter((l) => l.level === parentLevelValue && l.active)
    : [];

  const resetForm = () => {
    setEditingId(null);
    setCode(''); setName(''); setLevel('ZONE'); setParentId(''); setFormOpen(false);
  };

  const load = (p: number, ps: number, q: string, lv: string) => {
    setIsLoading(true);
    backendApi.listLocationDefinitionsPaginated({ page: p, pageSize: ps, search: q, level: lv || undefined })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load locations.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(page, pageSize, search, levelFilter); }, [page, pageSize, levelFilter]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); load(1, pageSize, q, levelFilter); }, 400);
  };

  const handleLevelFilter = (lv: LocationLevel | '') => {
    setLevelFilter(lv);
    setPage(1);
  };

  const handleToggleActive = async (loc: LocationDefinitionApi) => {
    try {
      await backendApi.updateLocationDefinition(loc.id, { level: loc.level, active: !loc.active });
      addToast(`Location ${loc.active ? 'deactivated' : 'activated'} successfully.`, 'success');
      load(page, pageSize, search, levelFilter);
    } catch (error) {
      addToast(toUiError(error, 'Failed to update location status.'), 'error');
    }
  };

  const handleDelete = async (loc: LocationDefinitionApi) => {
    const ok = await confirm({ title: 'Delete Location', message: `Delete "${loc.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deleteLocationDefinition(loc.id);
      addToast('Location deleted successfully.', 'success');
      if (editingId === loc.id) resetForm();
      const newPage = items.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      load(newPage, pageSize, search, levelFilter);
    } catch (error) {
      addToast(toUiError(error, 'Failed to delete location.'), 'error');
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanCode = code.trim().toUpperCase() || undefined;
    const cleanName = name.trim();
    if (!cleanName) { addToast('Name is required.', 'warning'); return; }
    setIsSaving(true);
    try {
      const cleanParentId = parentId || null;
      if (editingId) {
        await backendApi.updateLocationDefinition(editingId, { name: cleanName, code: cleanCode, level, parentId: cleanParentId });
        addToast('Location updated successfully.', 'success');
      } else {
        await backendApi.createLocationDefinition({ name: cleanName, code: cleanCode, level, parentId: cleanParentId });
        addToast('Location created successfully.', 'success');
      }
      resetForm();
      load(page, pageSize, search, levelFilter);
      backendApi.listLocationDefinitions().then((locs) => setAllLocations(locs)).catch(() => {});
    } catch (error) {
      addToast(toUiError(error, 'Failed to save location.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (loc: LocationDefinitionApi) => {
    setEditingId(loc.id);
    setCode(loc.code ?? ''); setName(loc.name); setLevel(loc.level); setParentId(loc.parentId ?? '');
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const zoneCount = items.filter((l) => l.level === 'ZONE').length;
  const sthanCount = items.filter((l) => l.level === 'STHAN').length;
  const divisionCount = items.filter((l) => l.level === 'DIVISION').length;

  const pageNums = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page - 1, page, page + 1, '…', totalPages];
  })();

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Location Definition</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px', margin: '4px 0 0' }}>
            Manage zones and sthans — the geographic hierarchy of your organisation.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            {[{ label: 'Total', count: total, className: 'badge-info' },
              { label: 'Zones (page)', count: zoneCount, className: 'badge-info' },
              { label: 'Sthans (page)', count: sthanCount, className: 'badge-warning' },
              { label: 'Divisions (page)', count: divisionCount, className: 'badge-success' }].map(({ label, count, className }) => (
              <span key={label} className={`badge ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid currentColor', background: 'transparent', fontSize: '0.8rem', fontWeight: 600 }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{count}</span> {label}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button" className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '16px', paddingRight: '16px' }}
          onClick={() => { if (formOpen && !editingId) setFormOpen(false); else { resetForm(); setFormOpen(true); } }}
        >
          {formOpen && !editingId ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          )}
          {formOpen && !editingId ? 'Close' : 'New Location'}
        </button>
      </div>

      {/* Form */}
      {formOpen && (
        <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '20px', borderLeft: '3px solid var(--primary)', animation: 'slideUp 0.22s ease' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingId ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Edit Location
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                New Location
              </>
            )}
          </h3>
          <form onSubmit={(e) => { void handleSave(e); }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>Code <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. NORTH" maxLength={40} autoFocus style={{ fontSize: '0.875rem' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>Name *</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. North Zone" maxLength={120} required style={{ fontSize: '0.875rem' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>Level *</label>
                <select className="form-input" value={level} onChange={(e) => { setLevel(e.target.value as LocationLevel); setParentId(''); }} style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                  <option value="ZONE">🏢 Zone</option>
                  <option value="STHAN">📍 Sthan</option>
                  <option value="DIVISION">🗂️ Division</option>
                </select>
              </div>
              {parentOptions.length > 0 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>
                    Parent {roleLevels.find((r) => r.value === parentLevelValue)?.label ?? parentLevelValue} <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <select className="form-input" value={parentId} onChange={(e) => setParentId(e.target.value)} style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                    <option value="">— None —</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>{p.code ? `${p.code} – ` : ''}{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm} style={{ flex: 1, fontSize: '0.875rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ flex: 2, fontSize: '0.875rem' }}>
                  {isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Toolbar */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: '1px solid var(--border-dark)' }}>
        <div style={{ flex: '1 1 240px', position: 'relative', maxWidth: '360px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary-dark)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input className="form-input" style={{ paddingLeft: '34px', marginBottom: 0, fontSize: '0.875rem' }} placeholder="Search by name or code…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--border-dark)' }} />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {([
            { val: '',         label: 'All' },
            { val: 'ZONE',     label: '🏢 Zones' },
            { val: 'STHAN',    label: '📍 Sthans' },
            { val: 'DIVISION', label: '🗂️ Divisions' },
          ] as { val: LocationLevel | ''; label: string }[]).map(({ val, label }) => (
            <button key={val} type="button" onClick={() => handleLevelFilter(val)}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid', borderColor: levelFilter === val ? 'var(--primary)' : 'var(--border-dark)', background: levelFilter === val ? 'rgba(99,102,241,0.1)' : 'transparent', color: levelFilter === val ? 'var(--primary)' : 'var(--text-secondary-dark)', fontWeight: levelFilter === val ? 700 : 400, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>Rows:</span>
          {[10, 20, 50].map((ps) => (
            <button key={ps} type="button" onClick={() => { setPageSize(ps); setPage(1); }}
              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid', borderColor: pageSize === ps ? 'var(--primary)' : 'var(--border-dark)', background: pageSize === ps ? 'var(--primary)' : 'transparent', color: pageSize === ps ? '#fff' : 'var(--text-secondary-dark)', fontSize: '0.78rem', fontWeight: pageSize === ps ? 700 : 400, cursor: 'pointer' }}>
              {ps}
            </button>
          ))}
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', marginLeft: '4px' }}>
            {isLoading ? 'Loading…' : `${total} location${total !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, boxShadow: 'none' }}>
        <table className="custom-table">
          <thead>
            <tr>
              {['Code', 'Name', 'Level', 'Parent', 'Status', 'Created', 'Actions'].map((col) => (
                <th key={col} style={{ textAlign: col === 'Actions' ? 'right' : 'left' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-dark)' }}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} style={{ padding: '14px 20px' }}>
                      <div style={{ height: '14px', borderRadius: '6px', background: 'var(--border-dark)', width: j === 6 ? '120px' : j === 4 ? '60px' : j === 2 ? '70px' : '100%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--text-secondary-dark)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🗺️</div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>No locations found</div>
                  <div style={{ fontSize: '0.83rem' }}>{search || levelFilter ? 'Try adjusting your search or filter.' : 'Click "New Location" to create the first zone.'}</div>
                </td>
              </tr>
            ) : (
              items.map((loc) => (
                <tr key={loc.id} style={{ opacity: loc.active ? 1 : 0.55 }}>
                  <td style={{ padding: '14px 20px' }}>
                    {loc.code ? (
                      <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, background: 'var(--chip-bg-soft)', color: 'var(--text-primary-dark)', padding: '3px 8px', borderRadius: '5px' }}>{loc.code}</code>
                    ) : (
                      <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.82rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>{loc.name}</td>
                  <td style={{ padding: '14px 20px' }}><LevelBadge level={loc.level} /></td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>
                    {loc.parentId
                      ? (() => { const p = allLocations.find((l) => l.id === loc.parentId); return p ? (p.code ? `${p.code} – ${p.name}` : p.name) : <span style={{ fontStyle: 'italic' }}>Unknown</span>; })()
                      : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.5 }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.8rem', 
                      fontWeight: 600,
                      color: loc.active ? 'var(--success)' : 'var(--error)' 
                    }}>
                      <span 
                        className="status-dot"
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: loc.active ? 'var(--success)' : 'var(--error)',
                          boxShadow: loc.active ? '0 0 8px var(--success)' : '0 0 8px var(--error)',
                          display: 'inline-block',
                          animation: loc.active ? 'pulse 2s infinite' : 'none'
                        }} 
                      />
                      {loc.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>{new Date(loc.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => startEdit(loc)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Edit
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ 
                        padding: '6px 12px', 
                        fontSize: '0.8rem', 
                        color: loc.active ? 'var(--error)' : 'var(--success)',
                        borderColor: loc.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        background: loc.active ? 'rgba(239, 68, 68, 0.02)' : 'rgba(16, 185, 129, 0.02)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }} onClick={() => void handleToggleActive(loc)}>
                        {loc.active ? (
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
                      }} onClick={() => void handleDelete(loc)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
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
