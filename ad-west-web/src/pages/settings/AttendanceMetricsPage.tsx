import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import { PageHeader } from '../../components/common/PageHeader';
import { AttendanceMetricApi, backendApi, SreniDefinitionApi } from '../../utils/backendApi';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';

interface AttendanceMetricFormState {
  name: string;
  description: string;
  keys: string[];
  keyDraft: string;
  active: boolean;
}

interface AttendanceMetricFormErrors {
  name?: string;
  keys?: string;
}

const DEFAULT_KEYS = ['male', 'female', 'children', 'total'];

const emptyForm = (): AttendanceMetricFormState => ({
  name: '',
  description: '',
  keys: DEFAULT_KEYS,
  keyDraft: '',
  active: true,
});

const normalizeKey = (value: string): string => value.trim().replace(/\s+/g, '_');

const buildUniqueKeys = (keys: string[]): string[] =>
  Array.from(new Set(keys.map(normalizeKey).filter(Boolean)));

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

export const AttendanceMetricsPage: React.FC = () => {
  const confirm = useConfirm();
  const { addToast } = useToast();

  const [metrics, setMetrics] = useState<AttendanceMetricApi[]>([]);
  const [srenies, setSrenies] = useState<SreniDefinitionApi[]>([]);
  const [selectedSreniId, setSelectedSreniId] = useState('');

  const [isLoadingSrenies, setIsLoadingSrenies] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<AttendanceMetricFormState>(emptyForm());
  const [initialForm, setInitialForm] = useState<AttendanceMetricFormState>(emptyForm());
  const [formErrors, setFormErrors] = useState<AttendanceMetricFormErrors>({});

  const selectedSreni = useMemo(
    () => srenies.find((sreni) => sreni.id === selectedSreniId),
    [selectedSreniId, srenies],
  );
  const activeCount = useMemo(() => metrics.filter((metric) => metric.active).length, [metrics]);
  const isFormOpen = isAdding || Boolean(editingId);
  const isFormDirty = useMemo(
    () => isFormOpen && JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm, isFormOpen],
  );

  const loadSrenies = useCallback(async () => {
    setIsLoadingSrenies(true);
    try {
      const response = await backendApi.listSreniDefinitionsPaginated({ page: 1, pageSize: 1000 });
      const activeSrenies = response.items.filter((item) => item.active);
      setSrenies(activeSrenies);
      setSelectedSreniId((prev) => prev || activeSrenies[0]?.id || '');
    } catch (error) {
      addToast(toUiError(error, 'Failed to load Sreni definitions.'), 'error');
    } finally {
      setIsLoadingSrenies(false);
    }
  }, [addToast]);

  const loadMetrics = useCallback(async () => {
    if (!selectedSreniId) {
      setMetrics([]);
      return;
    }

    setIsLoadingMetrics(true);
    try {
      const response = await backendApi.listAttendanceMetricsPaginated({
        page: 1,
        pageSize: 200,
        sreniId: selectedSreniId,
      });
      setMetrics(response.items);
    } catch (error) {
      addToast(toUiError(error, 'Failed to load attendance metrics.'), 'error');
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [addToast, selectedSreniId]);

  useEffect(() => {
    void loadSrenies();
  }, [loadSrenies]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isFormDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isFormDirty]);

  const validateForm = (): boolean => {
    const nextErrors: AttendanceMetricFormErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Metric name is required.';
    if (form.keys.length === 0) nextErrors.keys = 'Add at least one key.';
    if (normalizeKey(form.keyDraft)) nextErrors.keys = 'You have a pending key. Click Add Key first.';

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const addDraftKey = () => {
    const candidate = normalizeKey(form.keyDraft);
    if (!candidate) {
      setFormErrors((prev) => ({ ...prev, keys: 'Enter a key name before adding.' }));
      return;
    }

    if (form.keys.includes(candidate)) {
      setFormErrors((prev) => ({ ...prev, keys: 'This key is already added.' }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      keys: [...prev.keys, candidate],
      keyDraft: '',
    }));
    setFormErrors((prev) => ({ ...prev, keys: undefined }));
  };

  const removeKey = (keyToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      keys: prev.keys.filter((key) => key !== keyToRemove),
    }));
  };

  const requestDiscardIfDirty = async (): Promise<boolean> => {
    if (!isFormDirty) return true;
    return confirm({
      title: 'Discard Unsaved Changes',
      message: 'You have unsaved changes in attendance configuration. Discard them and continue?',
      confirmLabel: 'Discard Changes',
      cancelLabel: 'Keep Editing',
      danger: true,
    });
  };

  const closeForm = async () => {
    const ok = await requestDiscardIfDirty();
    if (!ok) return;
    setIsAdding(false);
    setEditingId(null);
    setForm(emptyForm());
    setInitialForm(emptyForm());
    setFormErrors({});
  };

  const openAdd = async () => {
    const ok = await requestDiscardIfDirty();
    if (!ok) return;
    const next = emptyForm();
    setForm(next);
    setInitialForm(next);
    setFormErrors({});
    setEditingId(null);
    setIsAdding(true);
  };

  const openEdit = async (metric: AttendanceMetricApi) => {
    const ok = await requestDiscardIfDirty();
    if (!ok) return;

    const next: AttendanceMetricFormState = {
      name: metric.name,
      description: metric.description ?? '',
      keys: buildUniqueKeys(metric.keys),
      keyDraft: '',
      active: metric.active,
    };

    setForm(next);
    setInitialForm(next);
    setFormErrors({});
    setEditingId(metric.id);
    setIsAdding(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSreniId) {
      addToast('Select a Sreni first.', 'warning');
      return;
    }

    if (!validateForm()) {
      addToast('Please fix the highlighted fields before saving.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        keys: form.keys,
        active: form.active,
      };

      if (editingId) {
        await backendApi.updateAttendanceMetric(editingId, payload);
        addToast('Attendance metric updated.', 'success');
      } else {
        await backendApi.createAttendanceMetric({
          sreniId: selectedSreniId,
          ...payload,
        });
        addToast('Attendance metric added.', 'success');
      }

      await closeForm();
      await loadMetrics();
    } catch (error) {
      addToast(toUiError(error, 'Failed to save attendance metric.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (metric: AttendanceMetricApi) => {
    try {
      await backendApi.updateAttendanceMetric(metric.id, { active: !metric.active });
      await loadMetrics();
    } catch (error) {
      addToast(toUiError(error, 'Failed to update attendance metric.'), 'error');
    }
  };

  const handleDelete = async (metric: AttendanceMetricApi) => {
    const ok = await confirm({
      title: 'Delete Metric',
      message: `Delete "${metric.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      await backendApi.deleteAttendanceMetric(metric.id);
      addToast('Attendance metric deleted.', 'success');
      setMetrics((prev) => prev.filter((row) => row.id !== metric.id));
      if (editingId === metric.id) {
        setIsAdding(false);
        setEditingId(null);
        setForm(emptyForm());
        setInitialForm(emptyForm());
        setFormErrors({});
      }
    } catch (error) {
      addToast(toUiError(error, 'Failed to delete attendance metric.'), 'error');
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="📏"
        title="Attendance Config"
        subtitle="Configure attendance metrics per Sreni using the same settings workflow as report configuration."
      />

      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <label style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Select Sreni:</label>
        {isLoadingSrenies ? (
          <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>Loading...</span>
        ) : srenies.length === 0 ? (
          <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>No active srenies found.</span>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {srenies.map((sreni) => {
              const isSelected = selectedSreniId === sreni.id;
              return (
                <button
                  key={sreni.id}
                  type="button"
                  onClick={() => setSelectedSreniId(sreni.id)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-dark)'}`,
                    background: isSelected ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: isSelected ? 'var(--primary)' : 'var(--text-secondary-dark)',
                  }}
                >
                  Sreni: {sreni.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedSreni && (
        <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--primary)', marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedSreni.name} Attendance Metrics</div>
              <div style={{ color: 'var(--text-secondary-dark)', fontSize: '0.82rem', marginTop: '2px' }}>
                {activeCount} active metric{activeCount !== 1 ? 's' : ''}
              </div>
            </div>
            {!isFormOpen && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void openAdd()}>
                + Add Metric
              </button>
            )}
          </div>

          {isFormOpen && (
            <div style={{ padding: '20px', marginBottom: '20px', borderRadius: '10px', border: '1px solid var(--border-dark)', background: 'var(--surface-dark-elevated)' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700 }}>
                {editingId ? 'Edit Metric' : 'Add Metric'}
              </h4>
              <form onSubmit={(event) => void handleSave(event)}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label className="form-label">Metric Name <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      className="form-input"
                      placeholder="e.g. Members Present"
                      value={form.name}
                      onChange={(event) => {
                        setForm((prev) => ({ ...prev, name: event.target.value }));
                        setFormErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      required
                      aria-invalid={Boolean(formErrors.name)}
                      style={formErrors.name ? { borderColor: 'var(--error)' } : undefined}
                    />
                    {formErrors.name && (
                      <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--error)' }}>{formErrors.name}</div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Description <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
                    <input
                      className="form-input"
                      placeholder="What this metric captures"
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className="form-label">Metric Keys <span style={{ color: 'var(--error)' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      className="form-input"
                      placeholder="e.g. male, female, children"
                      value={form.keyDraft}
                      onChange={(event) => {
                        setForm((prev) => ({ ...prev, keyDraft: event.target.value }));
                        setFormErrors((prev) => ({ ...prev, keys: undefined }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addDraftKey();
                        }
                      }}
                      aria-invalid={Boolean(formErrors.keys)}
                      style={formErrors.keys ? { borderColor: 'var(--error)' } : undefined}
                    />
                    <button type="button" className="btn btn-secondary btn-md" onClick={addDraftKey}>Add Key</button>
                  </div>

                  {form.keys.length > 0 ? (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {form.keys.map((key) => (
                        <span
                          key={key}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-dark)',
                            background: 'var(--surface-dark-elevated)',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary-dark)',
                          }}
                        >
                          {key}
                          <button
                            type="button"
                            onClick={() => removeKey(key)}
                            aria-label={`Remove key ${key}`}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text-secondary-dark)',
                              cursor: 'pointer',
                              padding: 0,
                              lineHeight: 1,
                              fontSize: '0.9rem',
                            }}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>No keys added yet.</div>
                  )}

                  {formErrors.keys && (
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--error)' }}>{formErrors.keys}</div>
                  )}
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label className="form-label">Status</label>
                  <button
                    type="button"
                    aria-pressed={form.active}
                    onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
                    style={{
                      width: '100%',
                      height: '40px',
                      borderRadius: '8px',
                      padding: '0 12px',
                      border: `1px solid ${form.active ? 'rgba(16,185,129,0.35)' : 'var(--border-dark)'}`,
                      background: form.active ? 'rgba(16,185,129,0.08)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: form.active ? '#10b981' : 'var(--text-secondary-dark)' }}>
                      {form.active ? 'Active' : 'Inactive'}
                    </span>
                    <span
                      style={{
                        position: 'relative',
                        width: '36px',
                        height: '20px',
                        borderRadius: '999px',
                        flexShrink: 0,
                        background: form.active ? 'var(--success)' : 'rgba(148,163,184,0.45)',
                        transition: 'background 0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: form.active ? '16px' : '2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#fff',
                          boxShadow: '0 1px 3px rgba(15,23,42,0.22)',
                          transition: 'left 0.2s',
                        }}
                      />
                    </span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-md" onClick={() => void closeForm()}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-md" disabled={isSaving}>
                    {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Metric'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!isLoadingMetrics && metrics.length === 0 && !isFormOpen && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>No attendance metrics yet</div>
              <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', maxWidth: '360px', margin: '0 auto 16px' }}>
                Add attendance metrics that users will fill during event attendance capture.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void openAdd()}>
                Add First Metric
              </button>
            </div>
          )}

          {!isLoadingMetrics && metrics.length > 0 && (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th>Metric Name</th>
                    <th>Keys</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, idx) => (
                    <tr key={metric.id} style={{ opacity: metric.active ? 1 : 0.55 }}>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.82rem' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{metric.name}</div>
                        {metric.description && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '2px' }}>
                            {metric.description}
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>{metric.keys.join(', ')}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(metric)}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: `1px solid ${metric.active ? 'rgba(16,185,129,0.35)' : 'rgba(148,163,184,0.4)'}`,
                            background: metric.active ? 'rgba(16,185,129,0.1)' : 'transparent',
                            color: metric.active ? '#10b981' : 'var(--text-secondary-dark)',
                          }}
                        >
                          {metric.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                        <TableRowActionsMenu
                          ariaLabel={`Actions for ${metric.name}`}
                          actions={[
                            { label: 'Edit', onClick: () => void openEdit(metric) },
                            { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(metric) },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isLoadingMetrics && (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.9rem' }}>
              Loading...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
