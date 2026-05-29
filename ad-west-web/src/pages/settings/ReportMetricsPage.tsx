import React, { useCallback, useEffect, useState } from 'react';
import { backendApi, ReportMetricDefinitionApi } from '../../utils/backendApi';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
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

export const ReportMetricsPage: React.FC = () => {
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [metrics, setMetrics] = useState<ReportMetricDefinitionApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setMetrics(await backendApi.listReportMetricDefinitions());
    } catch {
      addToast('Failed to load report metrics.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setIsAdding(true); };
  const openEdit = (m: ReportMetricDefinitionApi) => {
    setForm({ name: m.name, description: m.description ?? '', unit: m.unit ?? '', inputType: m.inputType, isRequired: m.isRequired, sortOrder: String(m.sortOrder) });
    setEditingId(m.id);
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
        await backendApi.updateReportMetricDefinition(editingId, payload);
        addToast('Metric updated.', 'success');
      } else {
        await backendApi.createReportMetricDefinition(payload);
        addToast('Metric added.', 'success');
      }
      closeForm();
      void load();
    } catch (err) {
      addToast(toUiError(err, 'Failed to save metric.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (m: ReportMetricDefinitionApi) => {
    try {
      await backendApi.updateReportMetricDefinition(m.id, { active: !m.active });
      void load();
    } catch (err) {
      addToast(toUiError(err, 'Failed to update metric.'), 'error');
    }
  };

  const handleDelete = async (m: ReportMetricDefinitionApi) => {
    const ok = await confirm({ title: 'Delete Metric', message: `Delete "${m.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await backendApi.deleteReportMetricDefinition(m.id);
      addToast('Metric deleted.', 'success');
      setMetrics(prev => prev.filter(x => x.id !== m.id));
    } catch (err) {
      addToast(toUiError(err, 'Failed to delete metric.'), 'error');
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>📋 Report Metrics</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px', marginBottom: 0 }}>
            Define the fields that appear in each sreni's monthly report submission.
          </p>
          <div style={{ marginTop: '12px' }}>
            <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid currentColor', background: 'transparent', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{metrics.filter(m => m.active).length}</span> Active metrics
            </span>
          </div>
        </div>
        <button type="button" className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={openAdd}>
          + Add Metric
        </button>
      </div>

      {/* Inline form */}
      {(isAdding || editingId) && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px', borderLeft: '3px solid var(--primary)' }}>
          <h4 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700 }}>
            {editingId ? 'Edit Metric' : 'Add New Metric'}
          </h4>
          <form onSubmit={(e) => void handleSave(e)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Metric Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <input className="form-input" placeholder="e.g. Members Present" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Unit <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" placeholder="e.g. count, %, hrs" value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Description <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" placeholder="Explain what this metric captures" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 120px 1fr', gap: '16px', marginBottom: '20px', alignItems: 'end' }}>
              <div>
                <label className="form-label">Input Type</label>
                <select className="form-input" value={form.inputType} onChange={(e) => setForm(f => ({ ...f, inputType: e.target.value as 'number' | 'text' }))} style={{ cursor: 'pointer' }}>
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div>
                <label className="form-label">Sort Order</label>
                <input className="form-input" type="number" value={form.sortOrder} onChange={(e) => setForm(f => ({ ...f, sortOrder: e.target.value }))} min="0" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '2px' }}>
                <input
                  id="metric-required"
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(e) => setForm(f => ({ ...f, isRequired: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="metric-required" style={{ fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
                  Required field
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Metric'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && metrics.length === 0 && !isAdding && (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No metrics defined</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 24px' }}>
            Add metrics that srenies will fill in when submitting their monthly reports.
          </p>
          <button type="button" className="btn btn-primary" onClick={openAdd}>Add First Metric</button>
        </div>
      )}

      {/* Metrics table */}
      {!isLoading && metrics.length > 0 && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                <th>Metric Name</th>
                <th>Type</th>
                <th>Unit</th>
                <th>Required</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, idx) => (
                <tr key={m.id} style={{ opacity: m.active ? 1 : 0.55 }}>
                  <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.82rem' }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    {m.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '2px' }}>{m.description}</div>}
                  </td>
                  <td>
                    <span className="badge" style={{ background: m.inputType === 'number' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)', color: m.inputType === 'number' ? '#6366f1' : '#10b981', padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                      {m.inputType === 'number' ? '123 Number' : 'Abc Text'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>{m.unit || '—'}</td>
                  <td>
                    {m.isRequired
                      ? <span className="badge badge-error" style={{ padding: '3px 10px', fontSize: '0.78rem' }}>Required</span>
                      : <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>Optional</span>}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(m)}
                      style={{
                        padding: '3px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${m.active ? 'rgba(16,185,129,0.35)' : 'rgba(148,163,184,0.4)'}`,
                        background: m.active ? 'rgba(16,185,129,0.1)' : 'transparent',
                        color: m.active ? '#10b981' : 'var(--text-secondary-dark)',
                      }}
                    >
                      {m.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => openEdit(m)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => void handleDelete(m)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isLoading && (
        <div className="glass-panel" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.9rem' }}>
          Loading…
        </div>
      )}
    </div>
  );
};
