import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { backendApi, ReportMetricDefinitionApi } from '../../utils/backendApi';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { SwitchToggle } from '../../components/common/SwitchToggle';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';
import { EmptyState } from '../../components/common/EmptyState';
import { TableColumnFilterRow, type TableColumnFilterDef } from '../../components/common/TableColumnFilterRow';
import { TableColumnHeaderRow } from '../../components/common/TableColumnHeaderRow';
import { TableNoResultsRow } from '../../components/common/TableNoResultsRow';
import { isListFilterActive } from '../../utils/tableListUtils';
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters';
import { useTableSort } from '../../hooks/useTableSort';
import { applyClientColumnFilters, type ClientFilterAccessor } from '../../utils/clientTableFilter';
import { applyClientColumnSort } from '../../utils/clientTableSort';

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
  target: string;
}

const emptyForm = (): FormState => ({
  name: '', description: '', unit: '', inputType: 'number', isRequired: false, sortOrder: '0', target: '',
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
  const { filters, debouncedFilters, setFilter, clearFilters } = useTableColumnFilters();
  const { sortBy, sortDir, toggleSort, clearSort } = useTableSort();

  const filterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: '__index__', label: '#', filterable: false, sortable: false, width: '48px', align: 'center' },
    { key: 'name', label: 'Metric Name', filterable: true, placeholder: 'Name…' },
    {
      key: 'inputType',
      label: 'Type',
      filterable: true,
      filterType: 'select',
      placeholder: 'All types',
      options: [{ value: 'number', label: 'Number' }, { value: 'text', label: 'Text' }],
    },
    { key: 'unit', label: 'Unit', filterable: true, placeholder: 'Unit…' },
    { key: 'target', label: 'Target', filterable: true, placeholder: 'Target…' },
    {
      key: 'isRequired',
      label: 'Required',
      filterable: true,
      filterType: 'select',
      placeholder: 'All',
      options: [{ value: 'required', label: 'Required' }, { value: 'optional', label: 'Optional' }],
    },
    {
      key: 'active',
      label: 'Status',
      filterable: true,
      filterType: 'select',
      placeholder: 'All',
      options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }],
    },
    { key: '__actions__', label: 'Actions', filterable: false, sortable: false, align: 'right' },
  ], []);

  const accessors = useMemo<Record<string, ClientFilterAccessor<ReportMetricDefinitionApi>>>(() => ({
    name: { getValue: (m) => m.name },
    inputType: { getValue: (m) => m.inputType, match: 'exact' },
    unit: { getValue: (m) => m.unit ?? '' },
    target: {
      getValue: (m) => (m.target != null && m.inputType === 'number' ? String(m.target) : ''),
    },
    isRequired: { getValue: (m) => (m.isRequired ? 'required' : 'optional'), match: 'exact' },
    active: { getValue: (m) => (m.active ? 'active' : 'inactive'), match: 'exact' },
  }), []);

  const displayedRows = useMemo(
    () => applyClientColumnSort(
      applyClientColumnFilters(metrics, debouncedFilters, accessors),
      sortBy,
      sortDir,
      accessors,
    ),
    [metrics, debouncedFilters, accessors, sortBy, sortDir],
  );
  const hasColumnFilters = Object.values(debouncedFilters).some((v) => v.trim());
  const hasFiltersActive = isListFilterActive(hasColumnFilters);
  const clearAllFilters = () => {
    clearFilters();
    clearSort();
  };

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
    setForm({ name: m.name, description: m.description ?? '', unit: m.unit ?? '', inputType: m.inputType, isRequired: m.isRequired, sortOrder: String(m.sortOrder), target: m.target != null ? String(m.target) : '' });
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
        target: form.inputType === 'number' && form.target.trim() !== '' ? parseFloat(form.target) : undefined,
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
      <PageHeader
        icon="📋"
        title="Report Metrics"
        subtitle="Define the fields that appear in each sreni's monthly report submission."
        stats={[{ label: 'Active metrics', value: metrics.filter(m => m.active).length, variant: 'info' }]}
        actions={
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            + Add Metric
          </button>
        }
      />

      {(isAdding || editingId) && (
        <FormSection title={editingId ? 'Edit Metric' : 'Add New Metric'} accent="primary">
          <form onSubmit={(e) => void handleSave(e)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Metric Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <input className="form-input" placeholder="e.g. Members Present" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Unit <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-input" placeholder="e.g. count, %, AED" value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Monthly Target Per Sreni
                  {form.inputType !== 'number' && <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}> (number metrics only)</span>}
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder={form.inputType === 'number' ? 'e.g. 50 per sreni' : '—'}
                  value={form.target}
                  onChange={(e) => setForm(f => ({ ...f, target: e.target.value }))}
                  disabled={form.inputType !== 'number'}
                  style={{ opacity: form.inputType !== 'number' ? 0.4 : 1 }}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" placeholder="Explain what this metric captures" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 120px 1fr', gap: '16px', alignItems: 'end' }}>
              <div className="form-group">
                <label className="form-label">Input Type</label>
                <select className="form-input" value={form.inputType} onChange={(e) => setForm(f => ({ ...f, inputType: e.target.value as 'number' | 'text' }))} style={{ cursor: 'pointer' }}>
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sort Order</label>
                <input className="form-input" type="number" value={form.sortOrder} onChange={(e) => setForm(f => ({ ...f, sortOrder: e.target.value }))} min="0" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Required field</label>
                <SwitchToggle
                  checked={form.isRequired}
                  onChange={(isRequired) => setForm((f) => ({ ...f, isRequired }))}
                  labelOn="Required"
                  labelOff="Optional"
                />
              </div>
            </div>
            <FormActions>
              <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? (editingId ? 'Updating…' : 'Creating…') : editingId ? 'Update' : 'Create'}
              </button>
            </FormActions>
          </form>
        </FormSection>
      )}

      {!isLoading && metrics.length === 0 && !isAdding && !hasFiltersActive && (
        <EmptyState
          icon="📋"
          title="No metrics defined"
          copy="Add metrics that srenies will fill in when submitting their monthly reports."
          action={<button type="button" className="btn btn-primary" onClick={openAdd}>Add First Metric</button>}
        />
      )}

      {/* Metrics table */}
      {!isLoading && (metrics.length > 0 || hasFiltersActive) && (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <TableColumnHeaderRow
                columns={filterColumns}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <TableColumnFilterRow
                columns={filterColumns}
                values={filters}
                onChange={setFilter}
                onClear={clearAllFilters}
              />
            </thead>
            <tbody>
              {displayedRows.length === 0 ? (
                <TableNoResultsRow colSpan={8} title="No metrics match your filters" onClearFilters={clearAllFilters} />
              ) : displayedRows.map((m, idx) => (
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
                    {m.target != null && m.inputType === 'number'
                      ? <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem' }}>{m.target.toLocaleString()}{m.unit ? ` ${m.unit}` : ''}</span>
                      : <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>—</span>}
                  </td>
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
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${m.name}`}
                      actions={[
                        { label: 'Edit', onClick: () => openEdit(m) },
                        { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(m) },
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
        <div className="loading-state">Loading…</div>
      )}
    </div>
  );
};
