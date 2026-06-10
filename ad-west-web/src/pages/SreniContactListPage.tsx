import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import { DateField, validateBirthDate } from '../components/common/DateFields';
import { ContactEditModal } from '../components/common/ContactEditModal';
import { ContactUploadModal, SRENI_CONTACT_UPLOAD_DESCRIPTION } from '../components/common/ContactUploadModal';
import { TableRowActionsMenu } from '../components/common/TableRowActionsMenu';
import { TableLayoutModal } from '../components/common/TableLayoutModal';
import { PageHeader, PageStat } from '../components/common/PageHeader';
import { PAGE_SIZE_OPTIONS, PaginationBar } from '../components/common/PaginationBar';
import { buildContactEditFieldSections, MASTER_CONTACT_COLUMN_LABELS, orderContactColumns } from '../constants/contactColumns';
import { useAdminDefinitions } from '../context/admin-definitions-context';
import {
  backendApi,
  GadaContactListFilter,
  HouseholdMemberApi,
  HouseholdResolverKey,
  SevaContributionApi,
  SreniContactRowApi,
  SreniDivisionApi,
  SreniGadanayakApi,
  SthanBasicApi,
} from '../utils/backendApi';
import { useTableLayout } from '../hooks/useTableLayout';

interface Props {
  sreniId: string;
  sreniName: string;
}

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  return match?.[1] ?? error.message ?? fallback;
};

// ── Assign Division & Sthan Modal ─────────────────────────────────────────────

interface AssignModalProps {
  isOpen: boolean;
  contact: SreniContactRowApi | null;
  divisions: SreniDivisionApi[];
  sthans: SthanBasicApi[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (divisionId: string | null, sthanId: string | null) => void;
}

const AssignModal: React.FC<AssignModalProps> = ({ isOpen, contact, divisions, sthans, isSaving, onClose, onSave }) => {
  const [divisionId, setDivisionId] = useState<string>('');
  const [sthanId, setSthanId] = useState<string>('');

  useEffect(() => {
    if (contact) {
      setDivisionId(contact.divisionId ?? '');
      setSthanId(contact.sthanId ?? '');
    }
  }, [contact]);

  const contactName = contact?.data['name'] != null ? String(contact.data['name']) : 'Contact';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign — ${contactName}`} maxWidth="400px">
      <div style={{ display: 'grid', gap: '18px' }}>
        {divisions.length > 0 && (
          <>
            <div>
              <label className="form-label">Division</label>
              <select
                className="form-input"
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
              >
                <option value="">— None —</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div style={{ height: '1px', background: 'var(--border-dark)' }} />
          </>
        )}

        <div>
          <label className="form-label">Sthan</label>
          <select
            className="form-input"
            value={sthanId}
            onChange={(e) => setSthanId(e.target.value)}
          >
            <option value="">— None —</option>
            {sthans.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {sthans.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '6px' }}>
              No sthans found for this Sreni.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isSaving}
            onClick={() => onSave(divisionId || null, sthanId || null)}
          >
            {isSaving ? 'Updating…' : 'Update'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Household Members Modal (BB children + head/spouse view) ─────────────────

interface HouseholdMembersModalProps {
  isOpen: boolean;
  sreniId: string;
  contact: SreniContactRowApi | null;
  divisions: SreniDivisionApi[];
  memberEnrollment: boolean;
  femaleParticipantsMode: boolean;
  femaleGenderMatches: string[];
  onClose: () => void;
  onChanged: () => void;
}

const HouseholdMembersModal: React.FC<HouseholdMembersModalProps> = ({
  isOpen,
  sreniId,
  contact,
  divisions,
  memberEnrollment,
  femaleParticipantsMode,
  femaleGenderMatches,
  onClose,
  onChanged,
}) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [members, setMembers] = useState<HouseholdMemberApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newDivisionId, setNewDivisionId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editDivisionId, setEditDivisionId] = useState('');

  const loadMembers = useCallback(() => {
    if (!contact) return;
    setLoading(true);
    backendApi.listHouseholdMembers(sreniId, contact.id)
      .then(setMembers)
      .catch((err) => addToast(toUiError(err, 'Failed to load family members.'), 'error'))
      .finally(() => setLoading(false));
  }, [sreniId, contact, addToast]);

  useEffect(() => {
    if (isOpen && contact) {
      setNewName('');
      setNewDob('');
      setNewDivisionId('');
      setEditingId(null);
      loadMembers();
    }
  }, [isOpen, contact, loadMembers]);

  const contactName = contact?.data['name'] != null ? String(contact.data['name']) : 'Contact';
  const adults = members.filter((m) => m.role === 'head' || m.role === 'spouse');
  const children = members.filter((m) => m.role === 'child' && m.active);
  const isFemaleMember = (m: HouseholdMemberApi) => {
    const gender = (m.gender ?? '').trim().toLowerCase();
    if (femaleGenderMatches.includes(gender)) return true;
    return m.role === 'spouse' && m.source === 'import';
  };
  const femaleParticipants = members.filter((m) => m.active && isFemaleMember(m));

  const handleAddChild = async () => {
    if (!contact) return;
    const name = newName.trim();
    if (!name) {
      addToast('Child name is required.', 'error');
      return;
    }
    if (memberEnrollment && !newDivisionId) {
      addToast('Division is required for each child.', 'error');
      return;
    }
    if (newDob.trim()) {
      const dobError = validateBirthDate(newDob, 'Child date of birth');
      if (dobError) {
        addToast(dobError, 'warning');
        return;
      }
    }
    setSaving(true);
    try {
      await backendApi.createHouseholdMember(sreniId, contact.id, {
        name,
        role: 'child',
        dateOfBirth: newDob || undefined,
        divisionId: newDivisionId || undefined,
      });
      setNewName('');
      setNewDob('');
      setNewDivisionId('');
      loadMembers();
      onChanged();
      addToast('Child added.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to add child.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFemaleMember = async () => {
    if (!contact) return;
    const name = newName.trim();
    if (!name) {
      addToast('Name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await backendApi.createHouseholdMember(sreniId, contact.id, {
        name,
        role: 'other',
        gender: 'female',
      });
      setNewName('');
      loadMembers();
      onChanged();
      addToast('Female participant added.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to add participant.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFemaleMember = async (member: HouseholdMemberApi) => {
    if (!contact || member.source === 'import') return;
    const ok = await confirm({
      title: 'Remove Participant',
      message: `Remove "${member.name}" from this family contact?`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await backendApi.deleteHouseholdMember(sreniId, contact.id, member.id);
      loadMembers();
      onChanged();
      addToast('Participant removed.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to remove participant.'), 'error');
    }
  };

  const handleSaveEdit = async (memberId: string) => {
    if (!contact) return;
    const name = editName.trim();
    if (!name) return;
    if (editDob.trim()) {
      const dobError = validateBirthDate(editDob, 'Child date of birth');
      if (dobError) {
        addToast(dobError, 'warning');
        return;
      }
    }
    setSaving(true);
    try {
      await backendApi.updateHouseholdMember(sreniId, contact.id, memberId, {
        name,
        dateOfBirth: editDob || undefined,
        divisionId: editDivisionId || null,
      });
      setEditingId(null);
      loadMembers();
      onChanged();
      addToast('Child updated.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to update child.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChild = async (member: HouseholdMemberApi) => {
    if (!contact) return;
    const ok = await confirm({
      title: 'Remove Child',
      message: `Remove "${member.name}" from this family contact?`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await backendApi.deleteHouseholdMember(sreniId, contact.id, member.id);
      loadMembers();
      onChanged();
      addToast('Child removed.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to remove child.'), 'error');
    }
  };

  const roleLabel = (role: HouseholdMemberApi['role']) => {
    if (role === 'head') return 'Primary';
    if (role === 'spouse') return 'Spouse';
    return role;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Family members — ${contactName}`} maxWidth="520px">
      {loading ? (
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>Loading members…</p>
      ) : (
        <div style={{ display: 'grid', gap: '18px' }}>
          {adults.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                From Excel
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {adults.map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dark)' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary-dark)', minWidth: '52px' }}>{roleLabel(m.role)}</span>
                    <span style={{ flex: 1, fontWeight: 600 }}>{m.name}</span>
                    {m.phone && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>{m.phone}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {memberEnrollment && (
          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Children (division per child)
            </h4>
            {children.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary-dark)' }}>No children added yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                {children.map((child) => {
                  const divisionId = child.enrollments?.[0]?.divisionId ?? '';
                  const divisionName = child.enrollments?.[0]?.divisionName;
                  const isEditing = editingId === child.id;
                  return (
                    <div key={child.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-dark)', background: 'rgba(255,255,255,0.02)' }}>
                      {isEditing ? (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" disabled={saving} />
                          <DateField value={editDob} birthDate onChange={(e) => setEditDob(e.target.value)} disabled={saving} />
                          {divisions.length > 0 && (
                            <select className="form-input" value={editDivisionId} onChange={(e) => setEditDivisionId(e.target.value)} disabled={saving}>
                              <option value="">— Division —</option>
                              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          )}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleSaveEdit(child.id)} disabled={saving}>Save</button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ flex: 1, fontWeight: 600 }}>{child.name}</span>
                          {child.dateOfBirth && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>{child.dateOfBirth}</span>}
                          {divisionName && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '5px' }}>{divisionName}</span>
                          )}
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditingId(child.id); setEditName(child.name); setEditDob(child.dateOfBirth ?? ''); setEditDivisionId(divisionId); }}>Edit</button>
                          <button type="button" className="btn btn-danger-outline btn-xs" onClick={() => void handleDeleteChild(child)}>Remove</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ padding: '14px', borderRadius: '8px', border: '1px dashed var(--border-dark)', display: 'grid', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>Add child</p>
              <input className="form-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Child name" disabled={saving} />
              <DateField value={newDob} birthDate onChange={(e) => setNewDob(e.target.value)} disabled={saving} />
              {divisions.length > 0 ? (
                <select className="form-input" value={newDivisionId} onChange={(e) => setNewDivisionId(e.target.value)} disabled={saving}>
                  <option value="">— Select division —</option>
                  {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              ) : (
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--error)' }}>Create divisions first (Manage Divisions).</p>
              )}
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleAddChild()} disabled={saving}>
                {saving ? 'Saving…' : 'Add Child'}
              </button>
            </div>
          </div>
          )}

          {femaleParticipantsMode && (
          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Female participants
            </h4>
            {femaleParticipants.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary-dark)' }}>No female participants yet. Add manually or include wife name in Excel.</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                {femaleParticipants.map((member) => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary-dark)', minWidth: '52px' }}>{roleLabel(member.role)}</span>
                    <span style={{ flex: 1, fontWeight: 600 }}>{member.name}</span>
                    {(member.phone || contact?.data['personalNumber']) && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>{member.phone ?? String(contact?.data['personalNumber'] ?? '')}</span>
                    )}
                    {member.source === 'manual' && (
                      <button type="button" className="btn btn-danger-outline btn-xs" onClick={() => void handleDeleteFemaleMember(member)}>Remove</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: '14px', borderRadius: '8px', border: '1px dashed var(--border-dark)', display: 'grid', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>Add female participant</p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>For single mothers, widows, or other female members not in the Excel spouse field.</p>
              <input className="form-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" disabled={saving} />
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleAddFemaleMember()} disabled={saving}>
                {saving ? 'Saving…' : 'Add Participant'}
              </button>
            </div>
          </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ── Assign Gada Modal ─────────────────────────────────────────────────────────

interface AssignGadaModalProps {
  isOpen: boolean;
  contact: SreniContactRowApi | null;
  gadanayaks: SreniGadanayakApi[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (gadanayakUserId: string) => void;
  onUnassign: () => void;
}

const AssignGadaModal: React.FC<AssignGadaModalProps> = ({
  isOpen, contact, gadanayaks, isSaving, onClose, onSave, onUnassign,
}) => {
  const [gadanayakUserId, setGadanayakUserId] = useState('');

  useEffect(() => {
    if (contact) {
      setGadanayakUserId(contact.gadanayakUserId ?? '');
    }
  }, [contact]);

  const contactName = contact?.data['name'] != null ? String(contact.data['name']) : 'Contact';
  const contactSthanId = contact?.sthanId ?? '';
  const eligible = contactSthanId
    ? gadanayaks.filter((g) => g.sthanId === contactSthanId)
    : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Gada — ${contactName}`} maxWidth="400px">
      <div style={{ display: 'grid', gap: '18px' }}>
        {!contactSthanId ? (
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary-dark)' }}>
            Assign a sthan to this contact before assigning a gadanayak.
          </p>
        ) : eligible.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary-dark)' }}>
            No gadanayaks registered for this contact&apos;s sthan. Use Manage Gadanayaks to add one.
          </p>
        ) : (
          <div>
            <label className="form-label">Gadanayak</label>
            <select
              className="form-input"
              value={gadanayakUserId}
              onChange={(e) => setGadanayakUserId(e.target.value)}
            >
              <option value="">— Select —</option>
              {eligible.map((g) => (
                <option key={g.id} value={g.userId}>{g.userName}{g.sthanName ? ` (${g.sthanName})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px', flexWrap: 'wrap' }}>
          {contact?.gadanayakUserId && (
            <button type="button" className="btn btn-danger-outline" onClick={onUnassign} disabled={isSaving}>
              Remove assignment
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isSaving || !gadanayakUserId || !contactSthanId}
            onClick={() => onSave(gadanayakUserId)}
          >
            {isSaving ? 'Updating…' : 'Update'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Gadanayaks Management Modal ───────────────────────────────────────────────

interface GadanayaksModalProps {
  isOpen: boolean;
  sreniId: string;
  sthans: SthanBasicApi[];
  onClose: () => void;
  onChanged: () => void;
}

const GadanayaksModal: React.FC<GadanayaksModalProps> = ({ isOpen, sreniId, sthans, onClose, onChanged }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<SreniGadanayakApi[]>([]);
  const [sthanId, setSthanId] = useState('');
  const [eligibleUsers, setEligibleUsers] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadGadanayaks = useCallback(() => {
    setLoading(true);
    backendApi.listSreniGadanayaks(sreniId)
      .then(setList)
      .catch((err) => addToast(toUiError(err, 'Failed to load gadanayaks.'), 'error'))
      .finally(() => setLoading(false));
  }, [sreniId, addToast]);

  useEffect(() => {
    if (!isOpen) return;
    loadGadanayaks();
    if (sthans.length > 0 && !sthanId) {
      setSthanId(sthans[0].id);
    }
  }, [isOpen, loadGadanayaks, sthans, sthanId]);

  useEffect(() => {
    if (!isOpen || !sthanId) {
      setEligibleUsers([]);
      setUserId('');
      return;
    }
    backendApi.listEligibleGadanayakUsers(sreniId, sthanId)
      .then((users) => {
        setEligibleUsers(users);
        setUserId(users[0]?.id ?? '');
      })
      .catch(() => setEligibleUsers([]));
  }, [isOpen, sreniId, sthanId]);

  const handleAdd = async () => {
    if (!sthanId || !userId) return;
    setSaving(true);
    try {
      await backendApi.registerSreniGadanayak(sreniId, sthanId, userId);
      loadGadanayaks();
      onChanged();
      setUserId('');
      addToast('Gadanayak registered.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to register gadanayak.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (g: SreniGadanayakApi) => {
    const ok = await confirm({
      title: 'Remove Gadanayak',
      message: `Remove ${g.userName} as gadanayak? Their contact assignments will be cleared.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await backendApi.removeSreniGadanayak(sreniId, g.id);
      loadGadanayaks();
      onChanged();
      addToast('Gadanayak removed.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to remove gadanayak.'), 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Gadanayaks" maxWidth="520px">
      <div style={{ marginBottom: '20px' }}>
        <label className="form-label">Register gadanayak</label>
        <div style={{ display: 'grid', gap: '8px' }}>
          <select className="form-input" value={sthanId} onChange={(e) => setSthanId(e.target.value)} disabled={saving}>
            <option value="">— Select sthan —</option>
            {sthans.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="form-input" value={userId} onChange={(e) => setUserId(e.target.value)} disabled={saving || !sthanId}>
            <option value="">— Select user —</option>
            {eligibleUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleAdd()}
            disabled={saving || !sthanId || !userId}
          >
            Add gadanayak
          </button>
        </div>
        {sthanId && eligibleUsers.length === 0 && (
          <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
            No eligible users for this sthan (must have Sreni + sthan access and not already registered).
          </p>
        )}
      </div>

      <div style={{ height: '1px', background: 'var(--border-dark)', marginBottom: '16px' }} />

      {loading ? (
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>Loading…</p>
      ) : list.length === 0 ? (
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>
          No gadanayaks registered yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
          {list.map((g) => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: '1px solid var(--border-dark)', borderRadius: '8px', background: 'var(--surface-dark)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.userName}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary-dark)' }}>{g.sthanName ?? g.sthanId}</div>
              </div>
              <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => void handleRemove(g)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '18px' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

// ── Divisions Management Modal ────────────────────────────────────────────────

interface DivisionsModalProps {
  isOpen: boolean;
  sreniId: string;
  divisions: SreniDivisionApi[];
  onClose: () => void;
  onChanged: (divisions: SreniDivisionApi[]) => void;
}

const DivisionsModal: React.FC<DivisionsModalProps> = ({ isOpen, sreniId, divisions, onClose, onChanged }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [list, setList] = useState<SreniDivisionApi[]>(divisions);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync if parent updates divisions (e.g. on reopen)
  useEffect(() => { setList(divisions); }, [divisions]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const created = await backendApi.createSreniDivision(sreniId, { name, displayOrder: list.length });
      const updated = [...list, created];
      setList(updated);
      onChanged(updated);
      setNewName('');
    } catch (err) {
      addToast(toUiError(err, 'Failed to create division.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const updated = await backendApi.updateSreniDivision(sreniId, id, { name });
      const updatedList = list.map((d) => (d.id === id ? updated : d));
      setList(updatedList);
      onChanged(updatedList);
      setEditingId(null);
    } catch (err) {
      addToast(toUiError(err, 'Failed to update division.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Division',
      message: `Delete division "${name}"? Contacts assigned to it will become unassigned.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await backendApi.deleteSreniDivision(sreniId, id);
      const updatedList = list.filter((d) => d.id !== id);
      setList(updatedList);
      onChanged(updatedList);
    } catch (err) {
      addToast(toUiError(err, 'Failed to delete division.'), 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Divisions" maxWidth="480px">
      {/* Add new division */}
      <div style={{ marginBottom: '20px' }}>
        <label className="form-label">New Division</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Enter division name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
            disabled={saving}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleAdd()}
            disabled={saving || !newName.trim()}
          >
            Add
          </button>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border-dark)', marginBottom: '16px' }} />

      {/* Division list */}
      {list.length === 0 ? (
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>
          No divisions defined yet. Add one above.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
          {list.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', border: '1px solid var(--border-dark)', borderRadius: '8px', background: 'var(--surface-dark)' }}>
              {editingId === d.id ? (
                <>
                  <input
                    className="form-input"
                    style={{ flex: 1, padding: '6px 10px' }}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveEdit(d.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    disabled={saving}
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleSaveEdit(d.id)} disabled={saving}>Save</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary-dark)' }}>{d.name}</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditingId(d.id); setEditName(d.name); }}>Edit</button>
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => void handleDelete(d.id, d.name)}>Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '18px' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

// ── Seva Contributions Modal (Seva Samithi only) ──────────────────────────────

interface SevaContributionsModalProps {
  isOpen: boolean;
  sreniId: string;
  contact: SreniContactRowApi | null;
  onClose: () => void;
}

const SevaContributionsModal: React.FC<SevaContributionsModalProps> = ({ isOpen, sreniId, contact, onClose }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [contributions, setContributions] = useState<SevaContributionApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activityDate, setActivityDate] = useState('');
  const [sevaActivity, setSevaActivity] = useState('');
  const [details, setDetails] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setActivityDate('');
    setSevaActivity('');
    setDetails('');
    setPendingFiles([]);
  }, []);

  const loadContributions = useCallback(() => {
    if (!contact) return;
    setLoading(true);
    backendApi.listSevaContributions(sreniId, contact.id)
      .then(setContributions)
      .catch((err) => addToast(toUiError(err, 'Failed to load seva activity.'), 'error'))
      .finally(() => setLoading(false));
  }, [sreniId, contact, addToast]);

  useEffect(() => {
    if (isOpen && contact) {
      resetForm();
      loadContributions();
    }
  }, [isOpen, contact, loadContributions, resetForm]);

  const contactName = contact?.data['name'] != null ? String(contact.data['name']) : 'Contact';

  const handleSave = async () => {
    if (!contact) return;
    if (!activityDate.trim()) {
      addToast('Activity date is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        activityDate: activityDate.trim(),
        sevaActivity: sevaActivity.trim() || undefined,
        details: details.trim() || undefined,
      };
      const saved = editingId
        ? await backendApi.updateSevaContribution(sreniId, contact.id, editingId, payload)
        : await backendApi.createSevaContribution(sreniId, contact.id, payload);

      if (pendingFiles.length > 0) {
        await backendApi.uploadSevaContributionDocuments(sreniId, contact.id, saved.id, pendingFiles);
      }

      resetForm();
      loadContributions();
      addToast(editingId ? 'Seva activity updated.' : 'Seva activity recorded.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to save seva activity.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: SevaContributionApi) => {
    setEditingId(entry.id);
    setActivityDate(entry.activityDate);
    setSevaActivity(entry.sevaActivity ?? '');
    setDetails(entry.details ?? '');
    setPendingFiles([]);
  };

  const handleDelete = async (entry: SevaContributionApi) => {
    if (!contact) return;
    const ok = await confirm({
      title: 'Delete seva activity',
      message: `Remove the seva activity from ${entry.activityDate}? Documents will also be deleted.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      await backendApi.deleteSevaContribution(sreniId, contact.id, entry.id);
      if (editingId === entry.id) resetForm();
      loadContributions();
      addToast('Seva activity deleted.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to delete seva activity.'), 'error');
    }
  };

  const handleUploadToEntry = async (contributionId: string, fileList: FileList | null) => {
    if (!contact || !fileList?.length) return;
    setUploadingId(contributionId);
    try {
      await backendApi.uploadSevaContributionDocuments(
        sreniId,
        contact.id,
        contributionId,
        Array.from(fileList),
      );
      loadContributions();
      addToast('Documents uploaded.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to upload documents.'), 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    const ok = await confirm({
      title: 'Delete document',
      message: 'Remove this document from the seva activity?',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      await backendApi.deleteSevaContributionDocument(documentId);
      loadContributions();
      addToast('Document deleted.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to delete document.'), 'error');
    }
  };

  const formatDisplayDate = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Seva activity — ${contactName}`} maxWidth="640px">
      <div style={{ display: 'grid', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '16px', display: 'grid', gap: '14px' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>
            {editingId ? 'Edit activity' : 'Record new activity'}
          </h4>
          <div>
            <label className="form-label">Date</label>
            <DateField value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Seva activity</label>
            <textarea
              className="form-input"
              rows={3}
              value={sevaActivity}
              onChange={(e) => setSevaActivity(e.target.value)}
              placeholder="Describe the seva activity or contribution"
            />
          </div>
          <div>
            <label className="form-label">Further details</label>
            <textarea
              className="form-input"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional notes, hours, location, etc."
            />
          </div>
          <div>
            <label className="form-label">Documents</label>
            <input
              type="file"
              className="form-input"
              multiple
              onChange={(e) => setPendingFiles(e.target.files ? Array.from(e.target.files) : [])}
            />
            {pendingFiles.length > 0 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '6px' }}>
                {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>
                Cancel edit
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (editingId ? 'Updating…' : 'Creating…') : editingId ? 'Update activity' : 'Create activity'}
            </button>
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700 }}>Activity history</h4>
          {loading ? (
            <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>Loading…</p>
          ) : contributions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>No seva activity recorded yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {contributions.map((entry) => (
                <div key={entry.id} className="glass-panel" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatDisplayDate(entry.activityDate)}</div>
                      {entry.sevaActivity && (
                        <p style={{ margin: '8px 0 0', fontSize: '0.84rem', whiteSpace: 'pre-wrap' }}>{entry.sevaActivity}</p>
                      )}
                      {entry.details && (
                        <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary-dark)', whiteSpace: 'pre-wrap' }}>
                          {entry.details}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button type="button" className="btn btn-secondary btn-xs" onClick={() => handleEdit(entry)}>Edit</button>
                      <button type="button" className="btn btn-danger-outline btn-xs" onClick={() => handleDelete(entry)}>Delete</button>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary-dark)' }}>Documents</div>
                    {entry.documents.length > 0 ? (
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {entry.documents.map((doc) => (
                          <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => backendApi.downloadSevaContributionDocument(doc.id, doc.fileName)}
                            >
                              {doc.fileName}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger-outline btn-xs"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)', opacity: 0.7 }}>No documents</span>
                    )}
                    <label className="btn btn-secondary btn-xs" style={{ width: 'fit-content', cursor: uploadingId === entry.id ? 'wait' : 'pointer' }}>
                      {uploadingId === entry.id ? 'Uploading…' : 'Add documents'}
                      <input
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        disabled={uploadingId === entry.id}
                        onChange={(e) => {
                          void handleUploadToEntry(entry.id, e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const SreniContactListPage: React.FC<Props> = ({ sreniId, sreniName }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const {
    uploadSrenies: contextUploadSrenies,
    locationNames: contextLocationNames,
    ensureSthansLoaded,
    sthans: contextSthans,
  } = useAdminDefinitions();
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [layoutEnabled, setLayoutEnabled] = useState(false);

  // ── Table layout (deferred until contacts load or Columns is opened) ──
  const sreniLayout = useTableLayout('sreni-contacts', { enabled: layoutEnabled });

  // ── State ──
  const [rows, setRows] = useState<SreniContactRowApi[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<SreniDivisionApi[]>([]);
  const [showDivisionsModal, setShowDivisionsModal] = useState(false);
  const [sthans, setSthans] = useState<SthanBasicApi[]>(contextSthans);
  const [assignTarget, setAssignTarget] = useState<SreniContactRowApi | null>(null);
  const [gadaAssignTarget, setGadaAssignTarget] = useState<SreniContactRowApi | null>(null);
  const [householdTarget, setHouseholdTarget] = useState<SreniContactRowApi | null>(null);
  const [sevaContributionsTarget, setSevaContributionsTarget] = useState<SreniContactRowApi | null>(null);
  const [gadaAssignmentEnabled, setGadaAssignmentEnabled] = useState(false);
  const [canManageGadaAssignments, setCanManageGadaAssignments] = useState(false);
  const [gadaFilter, setGadaFilter] = useState<GadaContactListFilter>('all');
  const [gadanayakFilterUserId, setGadanayakFilterUserId] = useState('');
  const [gadanayaks, setGadanayaks] = useState<SreniGadanayakApi[]>([]);
  const [showGadanayaksModal, setShowGadanayaksModal] = useState(false);
  const [isSavingGadaAssign, setIsSavingGadaAssign] = useState(false);
  const [enrollmentScope, setEnrollmentScope] = useState('HOUSEHOLD');
  const [resolverKey, setResolverKey] = useState<HouseholdResolverKey>('household_head');
  const [femaleGenderMatches, setFemaleGenderMatches] = useState<string[]>(['f', 'female', 'woman', 'women']);
  const [participantTotal, setParticipantTotal] = useState(0);
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [editTarget, setEditTarget] = useState<SreniContactRowApi | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [femaleGenderLoaded, setFemaleGenderLoaded] = useState(false);

  const memberEnrollment = enrollmentScope === 'MEMBER' || resolverKey === 'enrolled_children';
  const femaleParticipantsMode = resolverKey === 'female_participants';
  const isSevaSamithiSreni = /seva\s*samithi/i.test(sreniName);

  const sreniColDefs = useMemo(
    () => columns.filter((k) => k !== 'name').map((k) => ({ key: k, label: MASTER_CONTACT_COLUMN_LABELS.get(k) ?? k })),
    [columns],
  );
  const visibleSreniCols = useMemo(() => {
    if (!sreniColDefs.length) return [];
    const active = sreniLayout.activeId ? sreniLayout.layouts.find((l) => l.id === sreniLayout.activeId) : null;
    if (!active || !active.columns.length) return sreniColDefs.map((c) => c.key);
    const defKeys = new Set(sreniColDefs.map((c) => c.key));
    return active.columns.filter((sc) => sc.visible && defKeys.has(sc.key)).map((sc) => sc.key);
  }, [sreniLayout.activeId, sreniLayout.layouts, sreniColDefs]);

  const loadDivisions = useCallback(() => {
    backendApi.listSreniDivisions(sreniId)
      .then(setDivisions)
      .catch(() => {/* non-critical */});
  }, [sreniId]);

  const loadGadanayaks = useCallback(() => {
    if (!gadaAssignmentEnabled || !canManageGadaAssignments) return;
    backendApi.listSreniGadanayaks(sreniId)
      .then(setGadanayaks)
      .catch(() => {/* non-critical */});
  }, [sreniId, gadaAssignmentEnabled, canManageGadaAssignments]);

  const load = useCallback((p: number, ps?: number, filterOverride?: GadaContactListFilter, gadanayakUserOverride?: string) => {
    setIsLoading(true);
    const size = ps ?? pageSize;
    const activeFilter = filterOverride ?? gadaFilter;
    const activeGadanayakUserId = gadanayakUserOverride ?? gadanayakFilterUserId;
    const gadaOptions = {
      filter: activeFilter,
      gadanayakUserId: activeFilter === 'all' && activeGadanayakUserId ? activeGadanayakUserId : undefined,
    };
    backendApi.listSreniContacts(sreniId, p, size, gadaOptions)
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setEnrollmentScope(res.enrollmentScope ?? 'HOUSEHOLD');
        setResolverKey(res.resolverKey ?? 'household_head');
        setParticipantTotal(res.participantTotal ?? res.total);
        setGadaAssignmentEnabled(res.gadaAssignmentEnabled ?? false);
        setCanManageGadaAssignments(res.canManageGadaAssignments ?? false);
        const colSet = new Set<string>();
        for (const r of res.items) Object.keys(r.data).forEach((k) => colSet.add(k));
        if (colSet.size > 0) {
          setColumns(orderContactColumns(colSet));
        }
        if (res.items.length > 0 && res.items[0].sourceFile) setSourceFile(res.items[0].sourceFile);
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load contacts.'), 'error'))
      .finally(() => setIsLoading(false));
  }, [sreniId, pageSize, gadaFilter, gadanayakFilterUserId, addToast]);

  useEffect(() => {
    setSthans(contextSthans);
  }, [contextSthans]);

  useEffect(() => {
    if (!isLoading && (rows.length > 0 || total > 0)) {
      setLayoutEnabled(true);
    }
  }, [isLoading, rows.length, total]);

  useEffect(() => {
    if (!femaleParticipantsMode || !householdTarget || femaleGenderLoaded) return;
    setFemaleGenderLoaded(true);
    backendApi.listEnumValues('female_gender_match', true)
      .then((values) => setFemaleGenderMatches(values.map((v) => v.value.toLowerCase())))
      .catch(() => {/* non-critical */});
  }, [femaleParticipantsMode, householdTarget, femaleGenderLoaded]);

  const editFieldOptions = useMemo(() => ({
    uploadSrenies: contextUploadSrenies,
    sthanNames: contextLocationNames.filter((l) => l.level === 'STHAN').map((l) => l.name),
    zoneNames: contextLocationNames.filter((l) => l.level === 'ZONE').map((l) => l.name),
  }), [contextUploadSrenies, contextLocationNames]);

  const editSections = useMemo(
    () => (editTarget ? buildContactEditFieldSections(columns, editTarget.data, editFieldOptions) : []),
    [editTarget, columns, editFieldOptions],
  );

  const openEdit = useCallback((row: SreniContactRowApi) => {
    setEditTarget(row);
  }, []);

  const openAssign = useCallback((row: SreniContactRowApi) => {
    ensureSthansLoaded();
    setAssignTarget(row);
  }, [ensureSthansLoaded]);

  useEffect(() => {
    setPage(1); setRows([]); setColumns([]); setTotal(0); setTotalPages(1); setSourceFile(null);
    setGadaFilter('all');
    setGadanayakFilterUserId('');
    load(1, undefined, 'all', '');
    loadDivisions();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when sreni changes
  }, [sreniId]);

  useEffect(() => {
    loadGadanayaks();
  }, [loadGadanayaks]);

  const handleClear = async () => {
    const ok = await confirm({
      title: 'Clear Contact List',
      message: `Remove all contacts for ${sreniName}? This cannot be undone. You can re-upload a new file after clearing.`,
      confirmLabel: 'Clear All',
      danger: true,
    });
    if (!ok) return;
    try {
      const result = await backendApi.clearSreniContacts(sreniId);
      addToast(`Cleared ${result.deleted} contact${result.deleted !== 1 ? 's' : ''}.`, 'success');
      setRows([]); setColumns([]); setTotal(0); setTotalPages(1); setSourceFile(null);
    } catch (err) {
      addToast(toUiError(err, 'Failed to clear contacts.'), 'error');
    }
  };

  const handleSaveEdit = async (data: Record<string, string | number | boolean | null>) => {
    if (!editTarget) return;
    setIsSavingEdit(true);
    try {
      const updated = await backendApi.updateHouseholdContact(editTarget.id, data);
      setRows((prev) => prev.map((r) => r.id !== editTarget.id ? r : { ...r, data: updated.data }));
      setEditTarget(null);
      addToast('Contact updated.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to update contact.'), 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveGadaAssign = async (gadanayakUserId: string) => {
    if (!gadaAssignTarget) return;
    setIsSavingGadaAssign(true);
    try {
      const result = await backendApi.assignContactGada(sreniId, gadaAssignTarget.id, gadanayakUserId);
      setRows((prev) => prev.map((r) => r.id !== gadaAssignTarget.id ? r : {
        ...r,
        gadanayakUserId: result.gadanayakUserId,
        gadanayakUserName: result.gadanayakUserName,
      }));
      setGadaAssignTarget(null);
      addToast('Gada assignment saved.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to assign gadanayak.'), 'error');
    } finally {
      setIsSavingGadaAssign(false);
    }
  };

  const handleUnassignGada = async () => {
    if (!gadaAssignTarget) return;
    setIsSavingGadaAssign(true);
    try {
      await backendApi.unassignContactGada(sreniId, gadaAssignTarget.id);
      setRows((prev) => prev.map((r) => r.id !== gadaAssignTarget.id ? r : {
        ...r,
        gadanayakUserId: undefined,
        gadanayakUserName: undefined,
      }));
      setGadaAssignTarget(null);
      addToast('Gada assignment removed.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to remove gada assignment.'), 'error');
    } finally {
      setIsSavingGadaAssign(false);
    }
  };

  const handleGadaFilterChange = (filter: GadaContactListFilter) => {
    setGadaFilter(filter);
    if (filter !== 'all') setGadanayakFilterUserId('');
    setPage(1);
    load(1, undefined, filter, filter === 'all' ? gadanayakFilterUserId : '');
  };

  const handleGadanayakUserFilterChange = (userId: string) => {
    setGadanayakFilterUserId(userId);
    setGadaFilter('all');
    setPage(1);
    load(1, undefined, 'all', userId);
  };

  const handleSaveAssign = async (divisionId: string | null, sthanId: string | null) => {
    if (!assignTarget) return;
    const contact = assignTarget;
    setIsSavingAssign(true);
    try {
      const [updatedDiv, updatedSthan] = await Promise.all([
        divisionId !== (contact.divisionId ?? null)
          ? backendApi.assignContactDivision(sreniId, contact.id, divisionId)
          : Promise.resolve(contact),
        sthanId !== (contact.sthanId ?? null)
          ? backendApi.assignContactSthan(sreniId, contact.id, sthanId)
          : Promise.resolve(contact),
      ]);
      setRows((prev) => prev.map((r) => r.id !== contact.id ? r : {
        ...r, divisionId: updatedDiv.divisionId, sthanId: updatedSthan.sthanId,
      }));
      setAssignTarget(null);
    } catch (err) {
      addToast(toUiError(err, 'Failed to save assignment.'), 'error');
    } finally {
      setIsSavingAssign(false);
    }
  };

  const headerStats = useMemo(() => {
    const stats: PageStat[] = [
      {
        label: memberEnrollment || femaleParticipantsMode ? 'participants' : 'contacts',
        value: memberEnrollment || femaleParticipantsMode ? participantTotal : total,
        variant: 'info',
      },
    ];
    if (memberEnrollment || femaleParticipantsMode) {
      stats.push({
        label: total !== 1 ? 'family contacts' : 'family contact',
        value: total,
      });
    }
    stats.push({
      label: divisions.length !== 1 ? 'divisions' : 'division',
      value: divisions.length,
    });
    return stats;
  }, [memberEnrollment, femaleParticipantsMode, participantTotal, total, divisions.length]);

  return (
    <div className="animate-slide-up">
      <TableLayoutModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        tableTitle={`${sreniName} Contacts`}
        allColumns={sreniColDefs}
        layouts={sreniLayout.layouts}
        activeId={sreniLayout.activeId}
        onActivate={sreniLayout.activateLayout}
        onCreate={(name, cols) => sreniLayout.createLayout(name, cols)}
        onUpdate={(id, cols, nm) => sreniLayout.updateLayout(id, cols, nm)}
        onDelete={sreniLayout.deleteLayout}
      />
      <DivisionsModal
        isOpen={showDivisionsModal}
        sreniId={sreniId}
        divisions={divisions}
        onClose={() => setShowDivisionsModal(false)}
        onChanged={(updated) => { setDivisions(updated); }}
      />
      <AssignModal
        isOpen={assignTarget !== null}
        contact={assignTarget}
        divisions={memberEnrollment ? [] : divisions}
        sthans={sthans}
        isSaving={isSavingAssign}
        onClose={() => setAssignTarget(null)}
        onSave={handleSaveAssign}
      />
      <AssignGadaModal
        isOpen={gadaAssignTarget !== null}
        contact={gadaAssignTarget}
        gadanayaks={gadanayaks}
        isSaving={isSavingGadaAssign}
        onClose={() => setGadaAssignTarget(null)}
        onSave={(userId) => void handleSaveGadaAssign(userId)}
        onUnassign={() => void handleUnassignGada()}
      />
      <GadanayaksModal
        isOpen={showGadanayaksModal}
        sreniId={sreniId}
        sthans={sthans}
        onClose={() => setShowGadanayaksModal(false)}
        onChanged={() => { loadGadanayaks(); load(page); }}
      />
      <ContactEditModal
        isOpen={editTarget !== null}
        title={editTarget?.data['name'] != null ? `Edit — ${String(editTarget.data['name'])}` : 'Edit Contact'}
        sections={editSections}
        data={editTarget?.data ?? {}}
        isSaving={isSavingEdit}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
      />
      <HouseholdMembersModal
        isOpen={householdTarget !== null}
        sreniId={sreniId}
        contact={householdTarget}
        divisions={divisions}
        memberEnrollment={memberEnrollment}
        femaleParticipantsMode={femaleParticipantsMode}
        femaleGenderMatches={femaleGenderMatches}
        onClose={() => setHouseholdTarget(null)}
        onChanged={() => load(page)}
      />
      <SevaContributionsModal
        isOpen={sevaContributionsTarget !== null}
        sreniId={sreniId}
        contact={sevaContributionsTarget}
        onClose={() => setSevaContributionsTarget(null)}
      />
      <ContactUploadModal
        isOpen={showUploadModal}
        description={SRENI_CONTACT_UPLOAD_DESCRIPTION}
        onClose={() => setShowUploadModal(false)}
        previewUpload={(file) => backendApi.previewMemberContactUpload(file, { sreniId })}
        onUploaded={() => {
          setPage(1);
          load(1);
        }}
      />

      <PageHeader
        icon="📋"
        title={`${sreniName} — Contacts`}
        stats={headerStats}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowDivisionsModal(true)}>
              Manage Divisions
            </button>
            {gadaAssignmentEnabled && canManageGadaAssignments && (
              <button type="button" className="btn btn-secondary" onClick={() => { ensureSthansLoaded(); setShowGadanayaksModal(true); }}>
                Manage Gadanayaks
              </button>
            )}
            {total > 0 && (
              <button type="button" className="btn btn-danger-outline" onClick={handleClear}>
                Clear All
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path></svg>
              Upload Contacts
            </button>
          </>
        }
      />

      {gadaAssignmentEnabled && canManageGadaAssignments && total > 0 && (
        <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', padding: '12px 16px', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary-dark)' }}>Gada filter:</span>
          {(['all', 'unassigned', 'mine'] as GadaContactListFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`page-size-pill${gadaFilter === f && !gadanayakFilterUserId ? ' is-active' : ''}`}
              onClick={() => handleGadaFilterChange(f)}
            >
              {f === 'all' ? 'All' : f === 'unassigned' ? 'Unassigned' : 'Mine'}
            </button>
          ))}
          {gadanayaks.length > 0 && (
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: '180px', fontSize: '0.8rem', padding: '6px 10px' }}
              value={gadanayakFilterUserId}
              onChange={(e) => handleGadanayakUserFilterChange(e.target.value)}
            >
              <option value="">By gadanayak…</option>
              {gadanayaks.map((g) => (
                <option key={g.id} value={g.userId}>{g.userName}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Columns button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => { setLayoutEnabled(true); setShowLayoutModal(true); }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Columns
          {sreniLayout.activeLayoutName && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px' }}>
              {sreniLayout.activeLayoutName}
            </span>
          )}
        </button>
      </div>
      {isLoading && rows.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
          Loading contacts…
        </div>
      ) : !isLoading && total === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No contacts yet</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', margin: '0 auto 24px', maxWidth: '400px' }}>
            {isSevaSamithiSreni
              ? 'Upload the member data Excel template to register household primaries here. Sreni memberships from the upload appear in the Member Srenis column.'
              : 'Upload the master contact Excel template, or tag contacts from other Srenies to this Sreni via the global Contacts page.'}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setShowUploadModal(true)}>Upload Contacts</button>
        </div>
      ) : (
        <>
          {sourceFile && <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem', marginBottom: '12px', fontStyle: 'italic' }}>Source: {sourceFile}</p>}
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Name</th>
                  {memberEnrollment ? (
                    <th style={{ whiteSpace: 'nowrap' }}>Children</th>
                  ) : femaleParticipantsMode ? (
                    <th style={{ whiteSpace: 'nowrap' }}>Participants</th>
                  ) : (
                    <th style={{ whiteSpace: 'nowrap' }}>Division</th>
                  )}
                  <th style={{ whiteSpace: 'nowrap' }}>Sthan</th>
                  {isSevaSamithiSreni && <th style={{ whiteSpace: 'nowrap' }}>Member Srenis</th>}
                  {gadaAssignmentEnabled && <th style={{ whiteSpace: 'nowrap' }}>Gadanayak</th>}
                  {isLoading && columns.length === 0 ? <th>Loading…</th> : visibleSreniCols.map((col) => (
                    <th key={col} style={{ whiteSpace: 'nowrap' }}>{MASTER_CONTACT_COLUMN_LABELS.get(col) ?? col}</th>
                  ))}
                  <th style={{ width: '56px' }} />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      {Array.from({ length: Math.max(visibleSreniCols.length + 3, 5) }).map((__, j) => (
                        <td key={j}><div style={{ height: '12px', borderRadius: '4px', background: 'var(--border-dark)', width: `${50 + (j * 17) % 40}%`, animation: 'pulse 1.4s ease-in-out infinite' }} /></td>
                      ))}
                    </tr>
                  ))
                ) : rows.map((row) => {
                  const divName = row.divisionId ? divisions.find((d) => d.id === row.divisionId)?.name : null;
                  const sthanName = row.sthanId ? sthans.find((s) => s.id === row.sthanId)?.name : null;
                  return (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>{row.rowIndex}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span>{row.data['name'] != null ? String(row.data['name']) : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.45 }}>—</span>}</span>
                        {row.isTagged && (
                          <span style={{ marginLeft: '6px', fontSize: '0.68rem', fontWeight: 700, background: 'rgba(249,115,22,0.12)', color: '#fb923c', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(249,115,22,0.3)', verticalAlign: 'middle' }}>
                            {row.sreniName ?? 'tagged'}
                          </span>
                        )}
                      </td>
                      <td>
                        {memberEnrollment ? (
                          row.childrenDivisionSummary ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }} title={row.childrenDivisionSummary}>
                              {(row.childCount ?? 0) > 0 ? `${row.childCount} child${row.childCount !== 1 ? 'ren' : ''}` : '—'}
                              {row.childrenDivisionSummary && (
                                <span style={{ display: 'block', fontSize: '0.72rem', opacity: 0.85, marginTop: '2px' }}>{row.childrenDivisionSummary}</span>
                              )}
                            </span>
                          ) : (
                            <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>
                              {(row.childCount ?? 0) > 0 ? `${row.childCount} child${row.childCount !== 1 ? 'ren' : ''}` : '—'}
                            </span>
                          )
                        ) : femaleParticipantsMode ? (
                          <span style={{ opacity: (row.participantCount ?? 0) > 0 ? 1 : 0.4, fontSize: '0.84rem' }}>
                            {(row.participantCount ?? 0) > 0 ? `${row.participantCount} female${row.participantCount !== 1 ? 's' : ''}` : '—'}
                          </span>
                        ) : divName ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(99,102,241,0.25)' }}>{divName}</span>
                        ) : (
                          <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        {sthanName
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(20,184,166,0.1)', color: '#2dd4bf', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(20,184,166,0.25)' }}>{sthanName}</span>
                          : <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>}
                      </td>
                      {isSevaSamithiSreni && (
                        <td>
                          {(row.memberSrenis?.length ?? 0) > 0 ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
                              {row.memberSrenis!.map((s) => s.sreniName).join(', ')}
                            </span>
                          ) : (
                            <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>
                          )}
                        </td>
                      )}
                      {gadaAssignmentEnabled && (
                        <td>
                          {row.gadanayakUserName
                            ? <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#c084fc' }}>{row.gadanayakUserName}</span>
                            : <span style={{ opacity: 0.4, fontSize: '0.84rem' }}>—</span>}
                        </td>
                      )}
                      {visibleSreniCols.map((col) => {
                        const val = row.data[col];
                        return (
                          <td key={col} style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val != null ? String(val) : undefined}>
                            {val != null ? String(val) : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.45 }}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <TableRowActionsMenu
                          ariaLabel={`Actions for ${row.data['name'] != null ? String(row.data['name']) : 'contact'}`}
                          actions={[
                                { label: 'Edit', onClick: () => openEdit(row) },
                            { label: 'Family members', onClick: () => setHouseholdTarget(row) },
                            ...(isSevaSamithiSreni
                              ? [{ label: 'Seva activity', onClick: () => setSevaContributionsTarget(row) }]
                              : []),
                                { label: 'Assign', onClick: () => openAssign(row) },
                            ...(gadaAssignmentEnabled && canManageGadaAssignments
                              ? [{ label: 'Assign Gada', onClick: () => { ensureSthansLoaded(); loadGadanayaks(); setGadaAssignTarget(row); } }]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(p) => { setPage(p); load(p); }}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setPage(1);
              load(1, ps);
            }}
          />
        </>
      )}
    </div>
  );
};
