import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
import { useAdminDefinitions } from '../../context/admin-definitions-context';
import { backendApi, EnumValueApi, LocationDefinitionApi } from '../../utils/backendApi';
import { LocationLevelBadge } from '../../components/settings/LocationLevelBadge';

type LocationLevel = LocationDefinitionApi['level'];

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

interface LocationDefinitionFormPageProps {
  editingLocation: LocationDefinitionApi | null;
  onBack: () => void;
  onSaved: () => void;
}

export const LocationDefinitionFormPage: React.FC<LocationDefinitionFormPageProps> = ({
  editingLocation,
  onBack,
  onSaved,
}) => {
  const { addToast } = useToast();
  const { locationDefinitions, refreshDefinitions } = useAdminDefinitions();

  const [isSaving, setIsSaving] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<LocationLevel>('ZONE');
  const [parentId, setParentId] = useState('');
  const [roleLevels, setRoleLevels] = useState<EnumValueApi[]>([]);

  const allLocations = locationDefinitions;

  useEffect(() => {
    backendApi.listEnumValues('role_level', true)
      .then(setRoleLevels)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setCode(editingLocation?.code ?? '');
    setName(editingLocation?.name ?? '');
    setLevel(editingLocation?.level ?? 'ZONE');
    setParentId(editingLocation?.parentId ?? '');
  }, [editingLocation]);

  const currentLevelEnum = roleLevels.find((r) => r.value === level);
  const parentLevelValue = currentLevelEnum?.parentValue ?? null;
  const parentOptions = useMemo(
    () => (parentLevelValue ? allLocations.filter((l) => l.level === parentLevelValue && l.active) : []),
    [allLocations, parentLevelValue],
  );

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanCode = code.trim().toUpperCase() || undefined;
    const cleanName = name.trim();
    if (!cleanName) {
      addToast('Name is required.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const cleanParentId = parentId || null;
      if (editingLocation) {
        await backendApi.updateLocationDefinition(editingLocation.id, {
          name: cleanName,
          code: cleanCode,
          level,
          parentId: cleanParentId,
        });
        addToast('Location updated successfully.', 'success');
      } else {
        await backendApi.createLocationDefinition({
          name: cleanName,
          code: cleanCode,
          level,
          parentId: cleanParentId,
        });
        addToast('Location created successfully.', 'success');
      }
      await refreshDefinitions();
      onSaved();
    } catch (error) {
      addToast(toUiError(error, 'Failed to save location.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="📍"
        title={editingLocation ? 'Edit Location' : 'New Location'}
        subtitle={editingLocation ? editingLocation.name : 'Add a zone, sthan, or division to the geographic hierarchy.'}
        actions={<button type="button" className="btn btn-secondary" onClick={onBack}>Back to List</button>}
      />

      <form onSubmit={(e) => void handleSave(e)} className="animate-stagger">
        <FormSection title="Location" accent="primary" flatHover>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Code <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. MZD" maxLength={40} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Name <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Madinat Zayed" maxLength={120} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Level <span style={{ color: 'var(--error)' }}>*</span></label>
              <select
                className="form-input"
                value={level}
                onChange={(e) => { setLevel(e.target.value as LocationLevel); setParentId(''); }}
                style={{ cursor: 'pointer' }}
              >
                <option value="ZONE">🏢 Zone</option>
                <option value="STHAN">📍 Sthan</option>
                <option value="DIVISION">🗂️ Division</option>
              </select>
              <div style={{ marginTop: '8px' }}>
                <LocationLevelBadge level={level} />
              </div>
            </div>
            {parentOptions.length > 0 && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Parent {roleLevels.find((r) => r.value === parentLevelValue)?.label ?? parentLevelValue}
                  <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}> (optional)</span>
                </label>
                <select className="form-input" value={parentId} onChange={(e) => setParentId(e.target.value)} style={{ cursor: 'pointer' }}>
                  <option value="">— None —</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.code ? `${p.code} – ` : ''}{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </FormSection>

        <FormActions>
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ minWidth: '100px' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ minWidth: '140px' }}>
            {isSaving ? (editingLocation ? 'Updating…' : 'Creating…') : editingLocation ? 'Update' : 'Create'}
          </button>
        </FormActions>
      </form>
    </div>
  );
};
