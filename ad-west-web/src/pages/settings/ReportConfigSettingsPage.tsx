import React, { useEffect, useState } from 'react';
import { backendApi, ReportMetricDefinitionApi, SreniDefinitionApi } from '../../utils/backendApi';
import { SreniReportConfigPage } from '../SreniReportConfigPage';
import { useToast } from '../../components/common/Toast';
import { SwitchToggle } from '../../components/common/SwitchToggle';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
import { EmptyState } from '../../components/common/EmptyState';

type ConfigMode = 'sreni' | 'location';

const toUiError = (err: unknown, fallback: string) => {
  if (!(err instanceof Error)) return fallback;
  const m = err.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return m?.[1] ?? err.message ?? fallback;
};

const LocationReportMetricsPanel: React.FC = () => {
  const { addToast } = useToast();
  const [metrics, setMetrics] = useState<ReportMetricDefinitionApi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', unit: '', inputType: 'number' as 'number' | 'text', isRequired: false, sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    backendApi.listLocationReportMetrics()
      .then(setMetrics)
      .catch((err) => addToast(toUiError(err, 'Failed to load metrics.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '', unit: '', inputType: 'number', isRequired: false, sortOrder: metrics.length * 10 });
    setShowForm(true);
  };

  const openEdit = (m: ReportMetricDefinitionApi) => {
    setEditingId(m.id);
    setForm({ name: m.name, description: m.description ?? '', unit: m.unit ?? '', inputType: m.inputType, isRequired: m.isRequired, sortOrder: m.sortOrder });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast('Name is required.', 'warning'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await backendApi.updateLocationReportMetric(editingId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          unit: form.unit.trim() || undefined,
          inputType: form.inputType,
          isRequired: form.isRequired,
          sortOrder: form.sortOrder,
        });
        addToast('Metric updated.', 'success');
      } else {
        await backendApi.createLocationReportMetric({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          unit: form.unit.trim() || undefined,
          inputType: form.inputType,
          isRequired: form.isRequired,
          sortOrder: form.sortOrder,
        });
        addToast('Metric created.', 'success');
      }
      setShowForm(false);
      load();
    } catch (err) {
      addToast(toUiError(err, 'Failed to save metric.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Location Report Metrics</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px', marginBottom: 0 }}>
            These metrics apply to <strong>all sthans</strong> — define them once here.
            Metrics can be updated but not deleted or deactivated.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Add Metric
          </button>
        )}
      </div>

      {showForm && (
        <FormSection title={editingId ? 'Edit Metric' : 'New Location Metric'} accent="primary">
          <form onSubmit={(e) => void handleSave(e)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Unit <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="e.g. count, AED" />
              </div>
              <div className="form-group">
                <label className="form-label">Input Type</label>
                <select className="form-input" value={form.inputType} onChange={(e) => setForm((f) => ({ ...f, inputType: e.target.value as 'number' | 'text' }))}>
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sort Order</label>
                <input className="form-input" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Required field</label>
              <SwitchToggle
                checked={form.isRequired}
                onChange={(val) => setForm((f) => ({ ...f, isRequired: val }))}
                labelOn="Required"
                labelOff="Optional"
              />
            </div>
            <FormActions>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create'}
              </button>
            </FormActions>
          </form>
        </FormSection>
      )}

      {/* Metrics list */}
      {isLoading ? (
        <div className="loading-state">Loading location metrics…</div>
      ) : metrics.length === 0 && !showForm ? (
        <EmptyState
          icon="📏"
          title="No location metrics yet"
          copy="Add the fields that every sthan must fill in when submitting a monthly report."
          action={<button type="button" className="btn btn-primary" onClick={openCreate}>Add First Metric</button>}
        />
      ) : metrics.length > 0 ? (
        <div style={{ display: 'grid', gap: '8px' }}>
          {metrics.map((m) => (
            <div key={m.id} className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.name}</span>
                  {m.unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)' }}>({m.unit})</span>}
                  <span className={`badge ${m.inputType === 'number' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.7rem', padding: '2px 7px', border: '1px solid currentColor', background: 'transparent' }}>{m.inputType}</span>
                  {m.isRequired && <span className="badge badge-error" style={{ fontSize: '0.7rem', padding: '2px 7px', border: '1px solid currentColor', background: 'transparent' }}>required</span>}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary-dark)' }}>order: {m.sortOrder}</span>
                </div>
                {m.description && <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>{m.description}</p>}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }} onClick={() => openEdit(m)}>
                ✏️ Edit
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="glass-panel" style={{ padding: '12px 16px', marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>ℹ️</span>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary-dark)', lineHeight: 1.6 }}>
          Location metrics cannot be deleted or deactivated — they are part of the permanent reporting structure for all sthans.
          Changes here take effect for all sthans immediately.
        </p>
      </div>
    </div>
  );
};

export const ReportConfigSettingsPage: React.FC = () => {
  const [srenies, setSrenies] = useState<SreniDefinitionApi[]>([]);
  const [selectedSreniId, setSelectedSreniId] = useState<string>('');
  const [mode, setMode] = useState<ConfigMode>('sreni');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    backendApi.listSreniDefinitions()
      .then(list => {
        const active = list.filter(s => s.active);
        setSrenies(active);
        if (active.length > 0) setSelectedSreniId(active[0].id);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const selectedSreni = srenies.find(s => s.id === selectedSreniId);

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="📊"
        title="Report Config"
        subtitle="Define report parameters for Srenies and shared location metrics for all Sthans."
      />

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setMode('sreni')}
          style={{
            padding: '8px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${mode === 'sreni' ? 'var(--primary)' : 'var(--border-dark)'}`,
            background: mode === 'sreni' ? 'rgba(99,102,241,0.12)' : 'transparent',
            color: mode === 'sreni' ? 'var(--primary)' : 'var(--text-secondary-dark)',
          }}
        >
          🏘️ Sreni Reports
        </button>
        <button
          type="button"
          onClick={() => setMode('location')}
          style={{
            padding: '8px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${mode === 'location' ? 'var(--primary)' : 'var(--border-dark)'}`,
            background: mode === 'location' ? 'rgba(99,102,241,0.12)' : 'transparent',
            color: mode === 'location' ? 'var(--primary)' : 'var(--text-secondary-dark)',
          }}
        >
          📍 Location Reports
        </button>
      </div>

      {/* Sreni config */}
      {mode === 'sreni' && (
        <>
          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Select Sreni:</label>
            {isLoading ? (
              <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>Loading…</span>
            ) : srenies.length === 0 ? (
              <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>No active srenies found.</span>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {srenies.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSreniId(s.id)}
                    style={{
                      padding: '7px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${selectedSreniId === s.id ? 'var(--primary)' : 'var(--border-dark)'}`,
                      background: selectedSreniId === s.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                      color: selectedSreniId === s.id ? 'var(--primary)' : 'var(--text-secondary-dark)',
                    }}
                  >
                    🏘️ {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedSreni && <SreniReportConfigPage sreniId={selectedSreni.id} sreniName={selectedSreni.name} />}
        </>
      )}

      {/* Location (sthan) metrics config */}
      {mode === 'location' && <LocationReportMetricsPanel />}
    </div>
  );
};
