import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
import { useAdminDefinitions } from '../../context/admin-definitions-context';
import { backendApi, LocationDefinitionApi, PermissionApi, SreniDefinitionApi } from '../../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

interface PermissionDefinitionFormPageProps {
  editingPermission: PermissionApi | null;
  onBack: () => void;
  onSaved: () => void;
}

export const PermissionDefinitionFormPage: React.FC<PermissionDefinitionFormPageProps> = ({
  editingPermission,
  onBack,
  onSaved,
}) => {
  const { addToast } = useToast();
  const { sreniDefinitions, locationDefinitions } = useAdminDefinitions();

  const [isSaving, setIsSaving] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [sreniId, setSreniId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [locations, setLocations] = useState<LocationDefinitionApi[]>([]);
  const [sreniDefs, setSreniDefs] = useState<SreniDefinitionApi[]>([]);

  useEffect(() => {
    setLocations(locationDefinitions);
    setSreniDefs(sreniDefinitions);
  }, [locationDefinitions, sreniDefinitions]);

  useEffect(() => {
    setLocationId(editingPermission?.locationId ?? '');
    setSreniId(editingPermission?.sreniId ?? '');
    setCode(editingPermission?.code ?? '');
    setName(editingPermission?.name ?? '');
    setDescription(editingPermission?.description ?? '');
  }, [editingPermission]);

  const activeLocations = useMemo(() => locations.filter((l) => l.active), [locations]);
  const activeSreniDefs = useMemo(() => sreniDefs.filter((s) => s.active), [sreniDefs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_');
    const cleanName = name.trim();
    if (!locationId) { addToast('Location is required.', 'warning'); return; }
    if (!sreniId) { addToast('Sreni is required.', 'warning'); return; }
    if (!cleanCode || !cleanName) { addToast('Code and Name are required.', 'warning'); return; }
    setIsSaving(true);
    try {
      if (editingPermission) {
        await backendApi.updatePermission(editingPermission.id, {
          code: cleanCode,
          name: cleanName,
          description: description.trim() || undefined,
        });
        addToast('Permission updated.', 'success');
      } else {
        await backendApi.createPermission({
          locationId,
          sreniId,
          code: cleanCode,
          name: cleanName,
          description: description.trim() || undefined,
        });
        addToast('Permission created.', 'success');
      }
      onSaved();
    } catch (err) {
      addToast(toUiError(err, 'Failed to save permission.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="🔒"
        title={editingPermission ? 'Edit Permission' : 'New Permission'}
        subtitle={editingPermission ? editingPermission.name : 'Map a location and sreni to define an operational scope.'}
        actions={<button type="button" className="btn btn-secondary" onClick={onBack}>Back to List</button>}
      />

      <form onSubmit={(e) => void handleSave(e)} className="animate-stagger">
        <FormSection title="Scope" accent="primary" flatHover>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Location <span style={{ color: 'var(--error)' }}>*</span></label>
              <select
                className="form-input"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={!!editingPermission}
                required
                style={{ cursor: 'pointer' }}
              >
                <option value="">Select a location…</option>
                {activeLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.level}){l.code ? ` — ${l.code}` : ''}
                  </option>
                ))}
              </select>
              {editingPermission && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginTop: '4px' }}>
                  Location cannot be changed after creation.
                </p>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sreni <span style={{ color: 'var(--error)' }}>*</span></label>
              <select
                className="form-input"
                value={sreniId}
                onChange={(e) => setSreniId(e.target.value)}
                disabled={!!editingPermission}
                required
                style={{ cursor: 'pointer' }}
              >
                <option value="">Select a sreni…</option>
                {activeSreniDefs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.code ? ` (${s.code})` : ''}
                  </option>
                ))}
              </select>
              {editingPermission && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginTop: '4px' }}>
                  Sreni cannot be changed after creation.
                </p>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection title="Details" accent="violet" flatHover>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Code <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                placeholder="e.g. MZD_YOG"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary-dark)', marginTop: '4px' }}>
                Uppercase letters, numbers and underscores
              </p>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Name <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                placeholder="e.g. Madinat Zayed Yoga Sikshak"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <input
              className="form-input"
              placeholder="What does this permission govern?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </FormSection>

        <FormActions>
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ minWidth: '100px' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ minWidth: '140px' }}>
            {isSaving ? (editingPermission ? 'Updating…' : 'Creating…') : editingPermission ? 'Update' : 'Create'}
          </button>
        </FormActions>
      </form>
    </div>
  );
};
