import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
import { EmptyState } from '../../components/common/EmptyState';
import { PaginationBar } from '../../components/common/PaginationBar';
import { backendApi, EnumValueApi, SreniDefinitionApi } from '../../utils/backendApi';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

interface SreniDefinitionPageProps {
  onSreniChange?: () => void;
}

export const SreniDefinitionPage: React.FC<SreniDefinitionPageProps> = ({ onSreniChange }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<SreniDefinitionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinUsVisible, setJoinUsVisible] = useState(false);
  const [enrollmentScope, setEnrollmentScope] = useState('');
  const [primaryContactStrategy, setPrimaryContactStrategy] = useState('');
  const [enrollmentScopeOptions, setEnrollmentScopeOptions] = useState<EnumValueApi[]>([]);
  const [strategyOptions, setStrategyOptions] = useState<EnumValueApi[]>([]);

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setDescription('');
    setJoinUsVisible(false);
    setEnrollmentScope(enrollmentScopeOptions[0]?.value ?? '');
    setPrimaryContactStrategy(strategyOptions[0]?.value ?? '');
    setFormOpen(false);
  };

  const load = (p: number, ps: number, q: string) => {
    setIsLoading(true);
    backendApi.listSreniDefinitionsPaginated({ page: p, pageSize: ps, search: q })
      .then((res) => { setItems(res.items); setTotal(res.total); setTotalPages(res.totalPages); })
      .catch((err) => addToast(toUiError(err, 'Failed to load srenies.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(page, pageSize, search); }, [page, pageSize]);

  useEffect(() => {
    Promise.all([
      backendApi.listEnumValues('enrollment_scope', true),
      backendApi.listEnumValues('primary_contact_strategy', true),
    ])
      .then(([scopes, strategies]) => {
        setEnrollmentScopeOptions(scopes);
        setStrategyOptions(strategies);
        if (!enrollmentScope && scopes[0]) setEnrollmentScope(scopes[0].value);
        if (!primaryContactStrategy && strategies[0]) setPrimaryContactStrategy(strategies[0].value);
      })
      .catch(() => {/* non-critical */});
  }, []);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); load(1, pageSize, q); }, 400);
  };

  const handleToggleActive = async (sreni: SreniDefinitionApi) => {
    try {
      await backendApi.updateSreniDefinition(sreni.id, { active: !sreni.active });
      addToast(`Sreni ${sreni.active ? 'deactivated' : 'activated'} successfully.`, 'success');
      onSreniChange?.();
      load(page, pageSize, search);
    } catch (error) {
      addToast(toUiError(error, 'Failed to update sreni status.'), 'error');
    }
  };

  const handleToggleJoinUsVisibility = async (sreni: SreniDefinitionApi) => {
    try {
      await backendApi.updateSreniDefinition(sreni.id, { joinUsVisible: !sreni.joinUsVisible });
      addToast(`Join Us visibility ${sreni.joinUsVisible ? 'disabled' : 'enabled'} for ${sreni.name}.`, 'success');
      onSreniChange?.();
      load(page, pageSize, search);
    } catch (error) {
      addToast(toUiError(error, 'Failed to update Join Us visibility.'), 'error');
    }
  };

  const handleDelete = async (sreni: SreniDefinitionApi) => {
    const ok = await confirm({ title: 'Delete Sreni', message: `Delete "${sreni.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deleteSreniDefinition(sreni.id);
      addToast('Sreni deleted successfully.', 'success');
      onSreniChange?.();
      if (editingId === sreni.id) resetForm();
      const newPage = items.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      load(newPage, pageSize, search);
    } catch (error) {
      addToast(toUiError(error, 'Failed to delete sreni.'), 'error');
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanCode = code.trim().toUpperCase() || undefined;
    const cleanName = name.trim();
    const cleanDescription = description.trim() || undefined;
    if (!cleanName) { addToast('Name is required.', 'warning'); return; }
    setIsSaving(true);
    try {
      if (editingId) {
        await backendApi.updateSreniDefinition(editingId, {
          name: cleanName,
          code: cleanCode,
          description: cleanDescription,
          joinUsVisible,
          enrollmentScope: enrollmentScope || undefined,
          primaryContactStrategy: primaryContactStrategy || undefined,
        });
        addToast('Sreni updated successfully.', 'success');
      } else {
        await backendApi.createSreniDefinition({
          name: cleanName,
          code: cleanCode,
          description: cleanDescription,
          joinUsVisible,
          enrollmentScope: enrollmentScope || undefined,
          primaryContactStrategy: primaryContactStrategy || undefined,
        });
        addToast('Sreni created successfully.', 'success');
      }
      resetForm();
      onSreniChange?.();
      load(page, pageSize, search);
    } catch (error) {
      addToast(toUiError(error, 'Failed to save sreni.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (sreni: SreniDefinitionApi) => {
    setEditingId(sreni.id);
    setCode(sreni.code ?? '');
    setName(sreni.name);
    setDescription(sreni.description ?? '');
    setJoinUsVisible(sreni.joinUsVisible);
    setEnrollmentScope(sreni.enrollmentScope ?? enrollmentScopeOptions[0]?.value ?? '');
    setPrimaryContactStrategy(sreni.primaryContactStrategy ?? strategyOptions[0]?.value ?? '');
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const labelForEnum = (options: EnumValueApi[], value?: string) =>
    options.find((o) => o.value === value)?.label ?? value ?? '—';

  const toggleFormOpen = () => {
    if (formOpen && !editingId) setFormOpen(false);
    else { resetForm(); setFormOpen(true); }
  };

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps);
    setPage(1);
    load(1, ps, search);
  };

  const hasTable = !isLoading && items.length > 0;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column' }}>

      <PageHeader
        icon="🏘️"
        title="Sreni Definition"
        subtitle="Define and manage srenies — the organisational units of your association."
        stats={[{ label: 'Total', value: total, variant: 'info' }]}
        actions={
          <button type="button" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={toggleFormOpen}>
            {formOpen && !editingId ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            )}
            {formOpen && !editingId ? 'Close' : 'New Sreni'}
          </button>
        }
      />

      {formOpen && (
        <FormSection title={editingId ? 'Edit Sreni' : 'New Sreni'} accent="primary">
          <form onSubmit={(e) => void handleSave(e)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Code</label>
                <input className="form-input" placeholder="e.g. SRN-001" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={20} />
              </div>
              <div className="form-group">
                <label className="form-label">Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <input className="form-input" placeholder="Sreni name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Enrollment Scope</label>
                <select className="form-input" value={enrollmentScope} onChange={(e) => setEnrollmentScope(e.target.value)}>
                  {enrollmentScopeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Participant Strategy</label>
                <select className="form-input" value={primaryContactStrategy} onChange={(e) => setPrimaryContactStrategy(e.target.value)}>
                  {strategyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} placeholder="Brief description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </div>
            <div className="form-group">
              <label className="form-label">Join Us Visibility</label>
              <button
                type="button"
                aria-pressed={joinUsVisible}
                onClick={() => setJoinUsVisible((prev) => !prev)}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  padding: '0 12px',
                  border: `1px solid ${joinUsVisible ? 'rgba(16,185,129,0.35)' : 'var(--border-dark)'}`,
                  background: joinUsVisible ? 'rgba(16,185,129,0.08)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: joinUsVisible ? '#10b981' : 'var(--text-secondary-dark)' }}>
                  {joinUsVisible ? 'Visible in Join Us form' : 'Hidden from Join Us form'}
                </span>
                <span style={{
                  position: 'relative', width: '36px', height: '20px', borderRadius: '999px', flexShrink: 0,
                  background: joinUsVisible ? 'var(--success)' : 'rgba(148,163,184,0.45)',
                  transition: 'background 0.2s',
                }}>
                  <span style={{
                    position: 'absolute', top: '2px', left: joinUsVisible ? '16px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.22)',
                    transition: 'left 0.2s',
                  }} />
                </span>
              </button>
            </div>
            <FormActions>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Sreni'}</button>
            </FormActions>
          </form>
        </FormSection>
      )}

      <div className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`} style={{ marginBottom: hasTable ? 0 : '16px' }}>
        <div className="list-toolbar__search">
          <span className="list-toolbar__search-icon" aria-hidden="true">🔍</span>
          <input className="form-input" placeholder="Search by name, code or description…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <div className="list-toolbar__meta">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>Rows:</span>
          {PAGE_SIZE_OPTIONS.map((ps) => (
            <button key={ps} type="button" className={`page-size-pill${pageSize === ps ? ' is-active' : ''}`} onClick={() => handlePageSizeChange(ps)}>
              {ps}
            </button>
          ))}
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', marginLeft: '4px' }}>
            {isLoading ? 'Loading…' : `${total} sreni${total !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading srenies…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🏘️"
          title={search ? 'No srenies match your search' : 'No srenies defined yet'}
          copy={search ? 'Try a different search term.' : 'Click "New Sreni" to add your first sreni.'}
          action={!search ? (
            <button type="button" className="btn btn-primary" onClick={toggleFormOpen}>New Sreni</button>
          ) : undefined}
        />
      ) : (
        <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                {['Code', 'Name', 'Description', 'Enrollment', 'Strategy', 'Join Us', 'Status', 'Created By', 'Actions'].map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((sreni) => (
                <tr key={sreni.id} style={{ opacity: sreni.active ? 1 : 0.55 }}>
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    {sreni.code ? (
                      <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, background: 'var(--chip-bg-soft)', color: 'var(--text-primary-dark)', padding: '3px 8px', borderRadius: '5px' }}>{sreni.code}</code>
                    ) : (
                      <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>{sreni.name}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary-dark)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sreni.description}>
                    {sreni.description ?? <span style={{ opacity: 0.45 }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>
                    {labelForEnum(enrollmentScopeOptions, sreni.enrollmentScope)}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: 'var(--text-secondary-dark)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={labelForEnum(strategyOptions, sreni.primaryContactStrategy)}>
                    {labelForEnum(strategyOptions, sreni.primaryContactStrategy)}
                  </td>
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: sreni.joinUsVisible ? 'var(--success)' : 'var(--text-secondary-dark)'
                    }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: sreni.joinUsVisible ? 'var(--success)' : 'var(--text-secondary-dark)',
                          boxShadow: sreni.joinUsVisible ? '0 0 8px var(--success)' : 'none',
                          display: 'inline-block',
                        }}
                      />
                      {sreni.joinUsVisible ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.8rem', 
                      fontWeight: 600,
                      color: sreni.active ? 'var(--success)' : 'var(--error)' 
                    }}>
                      <span 
                        className="status-dot"
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: sreni.active ? 'var(--success)' : 'var(--error)',
                          boxShadow: sreni.active ? '0 0 8px var(--success)' : '0 0 8px var(--error)',
                          display: 'inline-block',
                          animation: sreni.active ? 'pulse 2s infinite' : 'none'
                        }} 
                      />
                      {sreni.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>
                    {sreni.createdBy ?? <span style={{ opacity: 0.45 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => startEdit(sreni)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Edit
                      </button>
                      <button type="button" className="btn btn-secondary" style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        color: sreni.joinUsVisible ? 'var(--error)' : 'var(--success)',
                        borderColor: sreni.joinUsVisible ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        background: sreni.joinUsVisible ? 'rgba(239, 68, 68, 0.02)' : 'rgba(16, 185, 129, 0.02)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }} onClick={() => void handleToggleJoinUsVisibility(sreni)}>
                        {sreni.joinUsVisible ? 'Hide from Join Us' : 'Show in Join Us'}
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ 
                        padding: '6px 12px', 
                        fontSize: '0.8rem', 
                        color: sreni.active ? 'var(--error)' : 'var(--success)',
                        borderColor: sreni.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        background: sreni.active ? 'rgba(239, 68, 68, 0.02)' : 'rgba(16, 185, 129, 0.02)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }} onClick={() => void handleToggleActive(sreni)}>
                        {sreni.active ? (
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
                      }} onClick={() => void handleDelete(sreni)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
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
