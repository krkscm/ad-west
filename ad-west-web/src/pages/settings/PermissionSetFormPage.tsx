import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { SwitchToggle } from '../../components/common/SwitchToggle';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
import { useAdminDefinitions } from '../../context/admin-definitions-context';
import {
  backendApi,
  LocationDefinitionApi,
  PermissionApi,
  PermissionSetApi,
  SreniDefinitionApi,
} from '../../utils/backendApi';
import { formatPermissionLabel } from '../../utils/permissionSetUtils';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

interface PermissionSetFormPageProps {
  editingSet: PermissionSetApi | null;
  onBack: () => void;
  onSaved: () => void;
}

export const PermissionSetFormPage: React.FC<PermissionSetFormPageProps> = ({
  editingSet,
  onBack,
  onSaved,
}) => {
  const { addToast } = useToast();
  const { locationDefinitions, sreniDefinitions } = useAdminDefinitions();

  const [allPermissions, setAllPermissions] = useState<PermissionApi[]>([]);
  const [locations, setLocations] = useState<LocationDefinitionApi[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');

  useEffect(() => {
    setLocations(locationDefinitions);
  }, [locationDefinitions]);

  useEffect(() => {
    setIsLoading(true);
    backendApi.listPermissions()
      .then(setAllPermissions)
      .catch(() => addToast('Failed to load permissions.', 'error'))
      .finally(() => setIsLoading(false));
  }, [addToast]);

  useEffect(() => {
    setFormName(editingSet?.name ?? '');
    setFormDescription(editingSet?.description ?? '');
    setSelectedPermIds(new Set(editingSet?.permissionIds ?? []));
    setPermSearch('');
  }, [editingSet]);

  const locationById = useMemo(() => {
    const m = new Map<string, LocationDefinitionApi>();
    locations.forEach((l) => m.set(l.id, l));
    return m;
  }, [locations]);

  const sreniById = useMemo(() => {
    const m = new Map<string, SreniDefinitionApi>();
    sreniDefinitions.forEach((s) => m.set(s.id, s));
    return m;
  }, [sreniDefinitions]);

  const permById = useMemo(() => {
    const m = new Map<string, PermissionApi>();
    allPermissions.forEach((p) => m.set(p.id, p));
    return m;
  }, [allPermissions]);

  const filteredPerms = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    const active = allPermissions.filter((p) => p.active);
    if (!q) return active;
    return active.filter((p) =>
      p.name.toLowerCase().includes(q)
      || p.code.toLowerCase().includes(q)
      || (p.description ?? '').toLowerCase().includes(q),
    );
  }, [allPermissions, permSearch]);

  const groupedPerms = useMemo(() => {
    const map = new Map<string, PermissionApi[]>();
    filteredPerms.forEach((p) => {
      const loc = locationById.get(p.locationId);
      const key = loc ? `${loc.name} (${loc.level})` : 'Other';
      map.set(key, [...(map.get(key) ?? []), p]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPerms, locationById]);

  const togglePerm = (id: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      addToast('Name is required.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      if (editingSet) {
        await backendApi.updatePermissionSet(editingSet.id, {
          name: cleanName,
          description: formDescription.trim() || undefined,
        });
        await backendApi.setPermissionSetItems(editingSet.id, [...selectedPermIds]);
        addToast('Permission set updated.', 'success');
      } else {
        const created = await backendApi.createPermissionSet({
          name: cleanName,
          description: formDescription.trim() || undefined,
          permissionIds: [...selectedPermIds],
        });
        if (selectedPermIds.size > 0) {
          await backendApi.setPermissionSetItems(created.id, [...selectedPermIds]);
        }
        addToast('Permission set created.', 'success');
      }
      onSaved();
    } catch (err) {
      addToast(toUiError(err, 'Failed to save.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="🗂️"
        title={editingSet ? 'Edit Permission Set' : 'New Permission Set'}
        subtitle={editingSet ? editingSet.name : 'Bundle permissions into a named set for users and roles.'}
        actions={<button type="button" className="btn btn-secondary" onClick={onBack}>Back to List</button>}
      />

      <form onSubmit={(e) => void handleSave(e)} className="animate-stagger">
        <FormSection title="Details" accent="primary" flatHover>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Name <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                className="form-input"
                placeholder="e.g. Madinat Zayed Sikshak"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <input
                className="form-input"
                placeholder="What does this set grant?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Permissions" accent="violet" flatHover>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>
              {selectedPermIds.size} selected
              {isLoading ? ' · loading…' : ` · ${allPermissions.filter((p) => p.active).length} available`}
            </span>
            <input
              className="form-input"
              style={{ maxWidth: '280px', marginBottom: 0 }}
              placeholder="Filter permissions…"
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
            />
          </div>

          {selectedPermIds.size > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {[...selectedPermIds].map((pid) => {
                const p = permById.get(pid);
                return (
                  <span
                    key={pid}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      background: 'rgba(99,102,241,0.15)',
                      color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.3)',
                    }}
                  >
                    {formatPermissionLabel(p, pid, locationById, sreniById)}
                    <button
                      type="button"
                      onClick={() => togglePerm(pid)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#818cf8', fontSize: '0.85rem', padding: 0, lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div style={{ maxHeight: 'min(62vh, 640px)', overflowY: 'auto', border: '1px solid var(--border-dark)', borderRadius: '8px' }}>
            {isLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>Loading permissions…</div>
            ) : groupedPerms.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>No active permissions found.</div>
            ) : groupedPerms.map(([groupLabel, groupItems]) => (
              <div key={groupLabel}>
                <div style={{
                  padding: '6px 14px',
                  background: 'var(--table-head-bg)',
                  borderBottom: '1px solid var(--border-dark)',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary-dark)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
                >
                  {groupLabel}
                </div>
                {groupItems.map((p) => {
                  const checked = selectedPermIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '9px 14px',
                        borderBottom: '1px solid var(--border-dark)',
                        background: checked ? 'rgba(99,102,241,0.06)' : 'transparent',
                      }}
                    >
                      <SwitchToggle
                        variant="inline"
                        checked={checked}
                        onChange={() => togglePerm(p.id)}
                        ariaLabel={`Toggle permission ${p.name}`}
                      />
                      <span style={{ fontSize: '0.87rem', fontWeight: 600, flex: 1 }}>
                        {formatPermissionLabel(p, p.id, locationById, sreniById)}
                      </span>
                      {p.description && (
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary-dark)',
                            maxWidth: '320px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={p.description}
                        >
                          {p.description}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </FormSection>

        <FormActions>
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ minWidth: '100px' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving || isLoading} style={{ minWidth: '140px' }}>
            {isSaving ? (editingSet ? 'Updating…' : 'Creating…') : editingSet ? 'Update' : 'Create'}
          </button>
        </FormActions>
      </form>
    </div>
  );
};
