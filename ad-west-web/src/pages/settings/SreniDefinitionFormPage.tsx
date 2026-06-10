import React, { useEffect, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { PageHeader } from '../../components/common/PageHeader';
import { FormSection } from '../../components/common/FormSection';
import { FormActions } from '../../components/common/FormActions';
import { backendApi, EnumValueApi, SreniDefinitionApi } from '../../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

interface SreniDefinitionFormPageProps {
  editingSreni: SreniDefinitionApi | null;
  onBack: () => void;
  onSaved: () => void;
}

export const SreniDefinitionFormPage: React.FC<SreniDefinitionFormPageProps> = ({
  editingSreni,
  onBack,
  onSaved,
}) => {
  const { addToast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinUsVisible, setJoinUsVisible] = useState(false);
  const [showInUploadExcel, setShowInUploadExcel] = useState(false);
  const [gadaAssignmentEnabled, setGadaAssignmentEnabled] = useState(true);
  const [enrollmentScope, setEnrollmentScope] = useState('');
  const [primaryContactStrategy, setPrimaryContactStrategy] = useState('');
  const [enrollmentScopeOptions, setEnrollmentScopeOptions] = useState<EnumValueApi[]>([]);
  const [strategyOptions, setStrategyOptions] = useState<EnumValueApi[]>([]);

  useEffect(() => {
    Promise.all([
      backendApi.listEnumValues('enrollment_scope', true),
      backendApi.listEnumValues('primary_contact_strategy', true),
    ])
      .then(([scopes, strategies]) => {
        setEnrollmentScopeOptions(scopes);
        setStrategyOptions(strategies);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setCode(editingSreni?.code ?? '');
    setName(editingSreni?.name ?? '');
    setDescription(editingSreni?.description ?? '');
    setJoinUsVisible(editingSreni?.joinUsVisible ?? false);
    setShowInUploadExcel(editingSreni?.showInUploadExcel ?? false);
    setGadaAssignmentEnabled(editingSreni?.gadaAssignmentEnabled ?? true);
    setEnrollmentScope(editingSreni?.enrollmentScope ?? enrollmentScopeOptions[0]?.value ?? '');
    setPrimaryContactStrategy(editingSreni?.primaryContactStrategy ?? strategyOptions[0]?.value ?? '');
  }, [editingSreni, enrollmentScopeOptions, strategyOptions]);

  const isSevaSamithi = /seva\s*samithi/i.test(name) || code.toLowerCase() === 'seva_samithi' || code.toLowerCase() === 'sevasamithi';

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanCode = code.trim().toUpperCase() || undefined;
    const cleanName = name.trim();
    const cleanDescription = description.trim() || undefined;
    if (!cleanName) {
      addToast('Name is required.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: cleanName,
        code: cleanCode,
        description: cleanDescription,
        joinUsVisible,
        showInUploadExcel,
        gadaAssignmentEnabled: isSevaSamithi ? false : gadaAssignmentEnabled,
        enrollmentScope: enrollmentScope || undefined,
        primaryContactStrategy: primaryContactStrategy || undefined,
      };
      if (editingSreni) {
        await backendApi.updateSreniDefinition(editingSreni.id, payload);
        addToast('Sreni updated successfully.', 'success');
      } else {
        await backendApi.createSreniDefinition(payload);
        addToast('Sreni created successfully.', 'success');
      }
      onSaved();
    } catch (error) {
      addToast(toUiError(error, 'Failed to save sreni.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="🏘️"
        title={editingSreni ? 'Edit Sreni' : 'New Sreni'}
        subtitle={editingSreni ? editingSreni.name : 'Define organisational unit settings and participation rules.'}
        actions={<button type="button" className="btn btn-secondary" onClick={onBack}>Back to List</button>}
      />

      <form onSubmit={(e) => void handleSave(e)} className="animate-stagger">
        <FormSection title="Identity" accent="primary" flatHover>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Code</label>
              <input className="form-input" placeholder="e.g. YOG" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={20} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Name <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="form-input" placeholder="Sreni name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" style={{ minHeight: '88px', resize: 'vertical' }} placeholder="Brief description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>
        </FormSection>

        <FormSection title="Participation" accent="violet" flatHover>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Division assignment</label>
              <select className="form-input" value={enrollmentScope} onChange={(e) => setEnrollmentScope(e.target.value)}>
                {enrollmentScopeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
                Whether division is set on the family contact row or on each enrolled member.
              </p>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Who appears in this Sreni</label>
              <select className="form-input" value={primaryContactStrategy} onChange={(e) => setPrimaryContactStrategy(e.target.value)}>
                {strategyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
                Controls contacts list, Excel upload, and participant counts.
              </p>
            </div>
          </div>
        </FormSection>

        <FormSection title="Features" accent="success" flatHover>
          <div style={{ display: 'grid', gap: '16px' }}>
            <ToggleRow
              label="Show in Upload Excel"
              description={showInUploadExcel ? 'Yes/No column in Member Data template' : 'Hidden from upload template'}
              active={showInUploadExcel}
              activeColor="#3b82f6"
              onToggle={() => setShowInUploadExcel((prev) => !prev)}
            />
            <ToggleRow
              label="Gada assignment"
              description={
                isSevaSamithi
                  ? 'Not available for Seva Samithi'
                  : gadaAssignmentEnabled
                    ? 'Gadanayak assignment enabled per sthan'
                    : 'Gada assignment disabled'
              }
              active={gadaAssignmentEnabled && !isSevaSamithi}
              activeColor="#a855f7"
              disabled={isSevaSamithi}
              onToggle={() => setGadaAssignmentEnabled((prev) => !prev)}
            />
            <ToggleRow
              label="Join Us visibility"
              description={joinUsVisible ? 'Visible in Join Us form' : 'Hidden from Join Us form'}
              active={joinUsVisible}
              activeColor="#10b981"
              onToggle={() => setJoinUsVisible((prev) => !prev)}
            />
          </div>
        </FormSection>

        <FormActions>
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ minWidth: '100px' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ minWidth: '140px' }}>
            {isSaving ? (editingSreni ? 'Updating…' : 'Creating…') : editingSreni ? 'Update' : 'Create'}
          </button>
        </FormActions>
      </form>
    </div>
  );
};

const ToggleRow: React.FC<{
  label: string;
  description: string;
  active: boolean;
  activeColor: string;
  disabled?: boolean;
  onToggle: () => void;
}> = ({ label, description, active, activeColor, disabled, onToggle }) => (
  <div>
    <label className="form-label">{label}</label>
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
      style={{
        width: '100%',
        minHeight: '40px',
        borderRadius: '8px',
        padding: '0 12px',
        border: `1px solid ${active ? `${activeColor}59` : 'var(--border-dark)'}`,
        background: active ? `${activeColor}14` : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: active ? activeColor : 'var(--text-secondary-dark)' }}>
        {description}
      </span>
      <span style={{
        position: 'relative',
        width: '36px',
        height: '20px',
        borderRadius: '999px',
        flexShrink: 0,
        background: active ? activeColor : 'rgba(148,163,184,0.45)',
      }}
      >
        <span style={{
          position: 'absolute',
          top: '2px',
          left: active ? '16px' : '2px',
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
);
