import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';
import { PaginationBar } from '../../components/common/PaginationBar';
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

  const hasTable = !isLoading && items.length > 0;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column' }}>

      <PageHeader
        icon="📍"
        title="Location Definition"
        subtitle="Manage zones and sthans — the geographic hierarchy of your organisation."
        stats={[
          { label: 'Total', value: total, variant: 'info' },
          { label: 'Zones (page)', value: zoneCount, variant: 'info' },
          { label: 'Sthans (page)', value: sthanCount, variant: 'warning' },
          { label: 'Divisions (page)', value: divisionCount, variant: 'success' },
        ]}
        actions={
          <button
            type="button"
            className={`btn ${formOpen && !editingId ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => { if (formOpen && !editingId) setFormOpen(false); else { resetForm(); setFormOpen(true); } }}
          >
            {formOpen && !editingId ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            )}
            {formOpen && !editingId ? 'Close' : 'New Location'}
          </button>
        }
      />

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
                <button type="button" className="btn btn-secondary btn-md" onClick={resetForm} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-md" disabled={isSaving} style={{ flex: 2 }}>
                  {isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`} style={{ marginBottom: hasTable ? 0 : '16px' }}>
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input className="form-input" placeholder="Search by name or code…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
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
        <div className="list-toolbar__meta">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>Rows:</span>
          {[10, 20, 50].map((ps) => (
            <button key={ps} type="button" className={`page-size-pill${pageSize === ps ? ' is-active' : ''}`} onClick={() => { setPageSize(ps); setPage(1); }}>
              {ps}
            </button>
          ))}
          {!isLoading && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
              {total} location{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading locations…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🗺️"
          title="No locations found"
          copy={search || levelFilter ? 'Try adjusting your search or filter.' : 'Click "New Location" to create the first zone.'}
        />
      ) : (
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
            {items.map((loc) => (
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
                  <td style={{ padding: '10px 20px', textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${loc.name}`}
                      actions={[
                        { label: 'Edit', onClick: () => startEdit(loc) },
                        { label: loc.active ? 'Deactivate' : 'Activate', tone: loc.active ? 'warning' : 'success', onClick: () => void handleToggleActive(loc) },
                        { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(loc) },
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
        />
      </div>
      )}
    </div>
  );
};
