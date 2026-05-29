import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { backendApi, LocationDefinitionApi, PermissionApi, PermissionSetApi } from '../../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '8px',
  border: '1px solid var(--border-dark)', background: 'var(--surface-dark-elevated)',
  color: 'var(--text-primary-dark)', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em',
  textTransform: 'uppercase', color: 'var(--text-secondary-dark)', marginBottom: '6px',
};

export const PermissionSetsPage: React.FC = () => {
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [sets, setSets] = useState<PermissionSetApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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

  const loadSupport = () => {
    backendApi.listPermissions().then((perms) => setAllPermissions(perms)).catch(() => {});
    backendApi.listLocationDefinitions().then((locs) => setLocations(locs)).catch(() => {});
  };

  const loadSets = (p: number, ps: number, q: string) => {
    setIsLoading(true);
    backendApi.listPermissionSetsPaginated({ page: p, pageSize: ps, search: q })
      .then((res) => { setSets(res.items); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch((err) => addToast(toUiError(err, 'Failed to load permission sets.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadSupport(); }, []);
  useEffect(() => { loadSets(page, pageSize, search); }, [page, pageSize]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); loadSets(1, pageSize, q); }, 400);
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
      const key = loc ? `${loc.name} (${loc.level})` : p.locationId;
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

  const pageNums = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page - 1, page, page + 1, '…', totalPages];
  })();

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Permission Sets</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>
            Bundle atomic permissions into named sets that can be granted to roles or users.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[{ label: 'Total', count: total, color: '#818cf8', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' },
              { label: 'Available Permissions', count: allPermissions.filter((p) => p.active).length, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' }].map(({ label, count, color, bg, border }) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: bg, color, border: `1px solid ${border}` }}>
                <span style={{ fontWeight: 800 }}>{count}</span>{label}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => { if (formOpen && !editingId) setFormOpen(false); else { resetForm(); setFormOpen(true); } }}>
          <span style={{ fontSize: '1.15rem' }}>{formOpen && !editingId ? '✕' : '+'}</span>
          {formOpen && !editingId ? 'Close' : 'New Set'}
        </button>
      </div>

      {/* Form */}
      {formOpen && (
        <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '20px', borderLeft: '3px solid var(--primary)', animation: 'slideUp 0.22s ease' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 18px' }}>{editingId ? 'Edit Permission Set' : 'New Permission Set'}</h3>
          <form onSubmit={(e) => void handleSave(e)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <input style={inputStyle} placeholder="e.g. Zone Admin Full Access" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} placeholder="What does this set grant?" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
            </div>

            {/* Permission picker */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Permissions &nbsp;
                  <span style={{ fontWeight: 600, color: 'var(--text-primary-dark)', textTransform: 'none', letterSpacing: 0 }}>({selectedPermIds.size} selected)</span>
                </label>
                <input style={{ ...inputStyle, maxWidth: '240px', padding: '6px 12px', fontSize: '0.83rem' }}
                  placeholder="Filter permissions…" value={permSearch} onChange={(e) => setPermSearch(e.target.value)} />
              </div>

              {selectedPermIds.size > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {[...selectedPermIds].map((pid) => {
                    const p = permById.get(pid);
                    return (
                      <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                        {p ? p.code : pid}
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
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-dark)', background: checked ? 'rgba(99,102,241,0.06)' : 'transparent', transition: 'background 0.15s' }}>
                          <input type="checkbox" checked={checked} onChange={() => togglePerm(p.id)} style={{ accentColor: '#818cf8', width: '15px', height: '15px', flexShrink: 0 }} />
                          <code style={{ fontSize: '0.76rem', fontWeight: 700, background: 'var(--chip-bg-soft)', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.03em', flexShrink: 0 }}>{p.code}</code>
                          <span style={{ fontSize: '0.87rem', fontWeight: 600, flex: 1 }}>{p.name}</span>
                          {p.description && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</span>}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Set'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Toolbar */}
      <div className="glass-panel" style={{ padding: '12px 16px', marginBottom: '0', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
        <div style={{ flex: '1 1 200px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary-dark)', pointerEvents: 'none', fontSize: '0.9rem' }}>🔍</span>
          <input className="form-input" style={{ paddingLeft: '32px', marginBottom: 0 }} placeholder="Search sets by name or description…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>Rows:</span>
          {[10, 20, 50].map((ps) => (
            <button key={ps} type="button" onClick={() => { setPageSize(ps); setPage(1); }}
              style={{ padding: '3px 9px', borderRadius: '5px', border: '1px solid', borderColor: pageSize === ps ? 'var(--accent-primary, #6366f1)' : 'var(--border-subtle, rgba(255,255,255,0.12))', background: pageSize === ps ? 'rgba(99,102,241,0.15)' : 'transparent', color: pageSize === ps ? '#818cf8' : 'var(--text-secondary-dark)', fontSize: '0.78rem', fontWeight: pageSize === ps ? 700 : 400, cursor: 'pointer' }}>
              {ps}
            </button>
          ))}
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', marginLeft: '4px' }}>
            {isLoading ? 'Loading…' : `${total} set${total !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>Loading…</div>
        ) : sets.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
            {search ? 'No sets match your search.' : 'No permission sets defined yet.'}
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--table-head-bg)', borderBottom: '1px solid var(--border-dark)' }}>
                  {['Name', 'Description', 'Permissions', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary-dark)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sets.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-dark)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--table-row-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 18px', fontWeight: 700 }}>{s.name}</td>
                    <td style={{ padding: '12px 18px', color: 'var(--text-secondary-dark)', fontSize: '0.83rem' }}>{s.description ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {s.permissionIds.length === 0 ? (
                          <span style={{ opacity: 0.4, fontSize: '0.83rem' }}>None</span>
                        ) : s.permissionIds.slice(0, 4).map((pid) => {
                          const p = permById.get(pid);
                          return (
                            <span key={pid} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: 'var(--chip-bg-soft)', letterSpacing: '0.03em' }}>
                              {p?.code ?? pid.slice(0, 8)}
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
                    <td style={{ padding: '12px 18px', width: '90px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, color: s.active ? '#10b981' : '#94a3b8' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.active ? '#10b981' : '#94a3b8' }} />
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', width: '240px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => startEdit(s)}>✎ Edit</button>
                        <button type="button" style={{ background: 'transparent', border: `1px solid ${s.active ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', color: s.active ? '#f87171' : '#34d399' }}
                          onClick={() => void handleToggleActive(s)}>{s.active ? '⊘ Deactivate' : '✓ Activate'}</button>
                        <button type="button" style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '6px', padding: '4px 9px', cursor: 'pointer', fontSize: '0.85rem', color: '#f87171' }}
                          onClick={() => void handleDelete(s)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '14px 18px', borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))', background: 'transparent', color: page === 1 ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: '0.82rem' }}>
                  ← Prev
                </button>
                {pageNums.map((n, i) => (
                  <button key={i} type="button" onClick={() => typeof n === 'number' && setPage(n)} disabled={n === '…'}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid', minWidth: '34px', borderColor: n === page ? 'var(--accent-primary, #6366f1)' : 'var(--border-subtle, rgba(255,255,255,0.12))', background: n === page ? 'rgba(99,102,241,0.18)' : 'transparent', color: n === page ? '#818cf8' : 'var(--text-primary-dark)', fontWeight: n === page ? 700 : 400, cursor: n === '…' ? 'default' : 'pointer', fontSize: '0.82rem' }}>
                    {n}
                  </button>
                ))}
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))', background: 'transparent', color: page === totalPages ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: '0.82rem' }}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
