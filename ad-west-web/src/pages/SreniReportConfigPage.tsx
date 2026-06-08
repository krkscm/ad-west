import React, { useCallback, useEffect, useState } from 'react';
import { backendApi, SreniReportParameterApi } from '../utils/backendApi';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { useEnumOptions } from '../hooks/useEnumOptions';
import { TableRowActionsMenu } from '../components/common/TableRowActionsMenu';

interface Props {
  sreniId: string;
  sreniName: string;
}

type SubmissionType = string;

const TYPE_ICONS: Record<string, string> = {
  monthly: '📅',
  half_yearly: '📆',
  yearly: '🗓️',
};

interface FormState {
  name: string;
  description: string;
  unit: string;
  inputType: 'number' | 'text';
  isRequired: boolean;
  sortOrder: string;
}

const emptyForm = (): FormState => ({
  name: '', description: '', unit: '', inputType: 'number', isRequired: false, sortOrder: '0',
});

const toUiError = (err: unknown, fallback: string) => {
  if (!(err instanceof Error)) return fallback;
  const m = err.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return m?.[1] ?? err.message ?? fallback;
};

export const SreniReportConfigPage: React.FC<Props> = ({ sreniId, sreniName }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const { options: submissionTypeOptions, labelByValue: submissionTypeLabel } = useEnumOptions('report_submission_type');
  const { options: inputTypeOptions, labelByValue: inputTypeLabel } = useEnumOptions('report_metric_input_type');

  const [activeType, setActiveType] = useState<SubmissionType>('monthly');
  const [paramsByType, setParamsByType] = useState<Record<SubmissionType, SreniReportParameterApi[]>>({
    monthly: [], half_yearly: [], yearly: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await backendApi.listSreniReportParameters(sreniId);
      const byType: Record<SubmissionType, SreniReportParameterApi[]> = { monthly: [], half_yearly: [], yearly: [] };
      all.forEach((p) => { byType[p.submissionType].push(p); });
      setParamsByType(byType);
    } catch {
      addToast('Failed to load report configuration.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sreniId, addToast]);

  useEffect(() => { void load(); }, [load]);

  const params = paramsByType[activeType];

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setIsAdding(true); };
  const openEdit = (p: SreniReportParameterApi) => {
    setForm({ name: p.name, description: p.description ?? '', unit: p.unit ?? '', inputType: p.inputType, isRequired: p.isRequired, sortOrder: String(p.sortOrder) });
    setEditingId(p.id);
    setIsAdding(false);
  };
  const closeForm = () => { setIsAdding(false); setEditingId(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast('Name is required.', 'warning'); return; }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        unit: form.unit.trim() || undefined,
        inputType: form.inputType,
        isRequired: form.isRequired,
        sortOrder: parseInt(form.sortOrder) || 0,
      };
      if (editingId) {
        await backendApi.updateSreniReportParameter(sreniId, editingId, payload);
        addToast('Parameter updated.', 'success');
      } else {
        await backendApi.createSreniReportParameter(sreniId, activeType, payload);
        addToast('Parameter added.', 'success');
      }
      closeForm();
      void load();
    } catch (err) {
      addToast(toUiError(err, 'Failed to save parameter.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (p: SreniReportParameterApi) => {
    try {
      await backendApi.updateSreniReportParameter(sreniId, p.id, { active: !p.active });
      void load();
    } catch (err) {
      addToast(toUiError(err, 'Failed to update parameter.'), 'error');
    }
  };

  const handleDelete = async (p: SreniReportParameterApi) => {
    const ok = await confirm({ title: 'Delete Parameter', message: `Delete "${p.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deleteSreniReportParameter(sreniId, p.id);
      addToast('Parameter deleted.', 'success');
      setParamsByType((prev) => ({ ...prev, [activeType]: prev[activeType].filter((x) => x.id !== p.id) }));
    } catch (err) {
      addToast(toUiError(err, 'Failed to delete parameter.'), 'error');
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="⚙️"
        title={`${sreniName} — Report Config`}
        subtitle="Configure report parameters for each submission type. These fields will appear when submitting a report."
      />

      {/* Submission type tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {submissionTypeOptions.map((typeOpt) => {
          const type = typeOpt.value;
          const count = paramsByType[type].filter((p) => p.active).length;
          const isActive = activeType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => { setActiveType(type); closeForm(); }}
              style={{
                padding: '8px 18px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-dark)'}`,
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary-dark)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {TYPE_ICONS[type] ?? '📋'} {submissionTypeLabel(type)}
              {count > 0 && (
                <span style={{ background: isActive ? 'var(--primary)' : 'rgba(148,163,184,0.3)', color: isActive ? '#fff' : 'var(--text-secondary-dark)', borderRadius: '999px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active type panel */}
      <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--primary)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{TYPE_ICONS[activeType] ?? '📋'} {submissionTypeLabel(activeType)} Reports</div>
            <div style={{ color: 'var(--text-secondary-dark)', fontSize: '0.82rem', marginTop: '2px' }}>
              {params.filter((p) => p.active).length} active parameter{params.filter((p) => p.active).length !== 1 ? 's' : ''}
            </div>
          </div>
          {!isAdding && !editingId && (
            <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>
              + Add Parameter
            </button>
          )}
        </div>

        {/* Inline form */}
        {(isAdding || editingId) && (
          <div style={{ padding: '20px', marginBottom: '20px', borderRadius: '10px', border: '1px solid var(--border-dark)', background: 'var(--surface-dark-elevated)' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700 }}>
              {editingId ? 'Edit Parameter' : 'Add Parameter'}
            </h4>
            <form onSubmit={(e) => void handleSave(e)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Name <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input className="form-input" placeholder="e.g. Members Present" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label">Unit <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
                  <input className="form-input" placeholder="e.g. count, %" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Description <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" placeholder="What this parameter captures" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 100px 1fr', gap: '14px', marginBottom: '18px', alignItems: 'start' }}>
                <div>
                  <label className="form-label">Input Type</label>
                  <select className="form-input" value={form.inputType} onChange={(e) => setForm((f) => ({ ...f, inputType: e.target.value as 'number' | 'text' }))} style={{ cursor: 'pointer' }}>
                    {inputTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Sort Order</label>
                  <input className="form-input" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} min="0" />
                </div>
                <div>
                  <label className="form-label">Required</label>
                  <button
                    type="button"
                    aria-pressed={form.isRequired}
                    onClick={() => setForm((f) => ({ ...f, isRequired: !f.isRequired }))}
                    style={{
                      width: '100%', height: '40px', borderRadius: '8px', padding: '0 12px',
                      border: `1px solid ${form.isRequired ? 'rgba(16,185,129,0.35)' : 'var(--border-dark)'}`,
                      background: form.isRequired ? 'rgba(16,185,129,0.08)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: form.isRequired ? '#10b981' : 'var(--text-secondary-dark)' }}>
                      {form.isRequired ? 'Required' : 'Optional'}
                    </span>
                    <span style={{
                      position: 'relative', width: '36px', height: '20px', borderRadius: '999px', flexShrink: 0,
                      background: form.isRequired ? 'var(--success)' : 'rgba(148,163,184,0.45)',
                      transition: 'background 0.2s',
                    }}>
                      <span style={{
                        position: 'absolute', top: '2px', left: form.isRequired ? '16px' : '2px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.22)',
                        transition: 'left 0.2s',
                      }} />
                    </span>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-md" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-md" disabled={isSaving}>
                  {isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Parameter'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && params.length === 0 && !isAdding && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>No parameters yet</div>
            <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', maxWidth: '360px', margin: '0 auto 16px' }}>
              Add parameters that will appear in the {submissionTypeLabel(activeType).toLowerCase()} report submission form.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={openAdd}>Add First Parameter</button>
          </div>
        )}

        {/* Parameters table */}
        {!isLoading && params.length > 0 && (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>Parameter Name</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>Required</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {params.map((p, idx) => (
                  <tr key={p.id} style={{ opacity: p.active ? 1 : 0.55 }}>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.82rem' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '2px' }}>{p.description}</div>}
                    </td>
                    <td>
                      <span style={{ background: p.inputType === 'number' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)', color: p.inputType === 'number' ? '#6366f1' : '#10b981', padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                        {inputTypeLabel(p.inputType)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>{p.unit || '—'}</td>
                    <td>
                      {p.isRequired
                        ? <span className="badge badge-error" style={{ padding: '3px 10px', fontSize: '0.78rem' }}>Required</span>
                        : <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>Optional</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(p)}
                        style={{
                          padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          border: `1px solid ${p.active ? 'rgba(16,185,129,0.35)' : 'rgba(148,163,184,0.4)'}`,
                          background: p.active ? 'rgba(16,185,129,0.1)' : 'transparent',
                          color: p.active ? '#10b981' : 'var(--text-secondary-dark)',
                        }}
                      >
                        {p.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                      <TableRowActionsMenu
                        ariaLabel={`Actions for ${p.name}`}
                        actions={[
                          { label: 'Edit', onClick: () => openEdit(p) },
                          { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(p) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isLoading && (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.9rem' }}>
            Loading…
          </div>
        )}
      </div>
    </div>
  );
};
