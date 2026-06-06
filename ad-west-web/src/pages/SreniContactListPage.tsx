import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import { TableLayoutModal } from '../components/common/TableLayoutModal';
import { backendApi, HouseholdMemberApi, HouseholdResolverKey, SreniContactRowApi, SreniDivisionApi, SthanBasicApi } from '../utils/backendApi';
import { useTableLayout } from '../hooks/useTableLayout';

interface Props {
  sreniId: string;
  sreniName: string;
}

const MASTER_CONTACT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'personalNumber', label: 'Personal Number' },
  { key: 'updatesAsPerAug2024', label: 'Updates as per Aug2024' },
  { key: 'ss', label: 'SS' },
  { key: 'companyMobileNo2', label: 'Company Mobile No 2' },
  { key: 'bhag', label: 'Bhag' },
  { key: 'samithi', label: 'Samithi' },
  { key: 'samithiStatus', label: 'Samithi Status' },
  { key: 'balabarathi', label: 'Balabarathi' },
  { key: 'bbStatus', label: 'BB Status' },
  { key: 'yoga', label: 'Yoga' },
  { key: 'familyOrBachelor', label: 'Family / Bachelor' },
  { key: 'family', label: 'Family' },
  { key: 'bachelor', label: 'Bachelor' },
  { key: 'addressInUae', label: 'Address in UAE' },
  { key: 'company', label: 'Company' },
  { key: 'profession', label: 'Profession' },
  { key: 'wifeName', label: 'Wife Name' },
  { key: 'mobileNo4', label: 'Mobile No 4' },
  { key: 'landLine', label: 'Land Line' },
  { key: 'zoneOrLandmark', label: 'Zone / Land Mark' },
  { key: 'district', label: 'District' },
  { key: 'company8', label: 'Company8' },
  { key: 'profession7', label: 'Profession7' },
  { key: 'yogaSecondary', label: 'Yoga (Secondary)' },
];

const MASTER_CONTACT_COLUMN_LABELS = new Map<string, string>(
  MASTER_CONTACT_COLUMNS.map((column) => [column.key, column.label]),
);

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
            {isSaving ? 'Saving…' : 'Save'}
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
      .catch((err) => addToast(toUiError(err, 'Failed to load household members.'), 'error'))
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
      message: `Remove "${member.name}" from this household?`,
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
      message: `Remove "${member.name}" from this household?`,
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
    if (role === 'head') return 'Head';
    if (role === 'spouse') return 'Spouse';
    return role;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Household — ${contactName}`} maxWidth="520px">
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
                          <input className="form-input" type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} disabled={saving} />
                          {divisions.length > 0 && (
                            <select className="form-input" value={editDivisionId} onChange={(e) => setEditDivisionId(e.target.value)} disabled={saving}>
                              <option value="">— Division —</option>
                              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          )}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="btn btn-primary" style={{ fontSize: '0.82rem' }} onClick={() => void handleSaveEdit(child.id)} disabled={saving}>Save</button>
                            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem' }} onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ flex: 1, fontWeight: 600 }}>{child.name}</span>
                          {child.dateOfBirth && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>{child.dateOfBirth}</span>}
                          {divisionName && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '5px' }}>{divisionName}</span>
                          )}
                          <button type="button" className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 8px' }} onClick={() => { setEditingId(child.id); setEditName(child.name); setEditDob(child.dateOfBirth ?? ''); setEditDivisionId(divisionId); }}>Edit</button>
                          <button type="button" className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 8px', color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => void handleDeleteChild(child)}>Remove</button>
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
              <input className="form-input" type="date" value={newDob} onChange={(e) => setNewDob(e.target.value)} disabled={saving} />
              {divisions.length > 0 ? (
                <select className="form-input" value={newDivisionId} onChange={(e) => setNewDivisionId(e.target.value)} disabled={saving}>
                  <option value="">— Select division —</option>
                  {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              ) : (
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--error)' }}>Create divisions first (Manage Divisions).</p>
              )}
              <button type="button" className="btn btn-primary" style={{ fontSize: '0.84rem' }} onClick={() => void handleAddChild()} disabled={saving}>
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
                      <button type="button" className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 8px', color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => void handleDeleteFemaleMember(member)}>Remove</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: '14px', borderRadius: '8px', border: '1px dashed var(--border-dark)', display: 'grid', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>Add female participant</p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>For single mothers, widows, or other female members not in the Excel spouse field.</p>
              <input className="form-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" disabled={saving} />
              <button type="button" className="btn btn-primary" style={{ fontSize: '0.84rem' }} onClick={() => void handleAddFemaleMember()} disabled={saving}>
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
                  <button type="button" className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => void handleSaveEdit(d.id)} disabled={saving}>Save</button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary-dark)' }}>{d.name}</span>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => { setEditingId(d.id); setEditName(d.name); }}>Edit</button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px', color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => void handleDelete(d.id, d.name)}>Delete</button>
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

// ── Pagination helper ─────────────────────────────────────────────────────────

const buildPageNums = (page: number, totalPages: number): (number | '…')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
  if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, '…', page - 1, page, page + 1, '…', totalPages];
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const SreniContactListPage: React.FC<Props> = ({ sreniId, sreniName }) => {
  const { addToast } = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showLayoutModal, setShowLayoutModal] = useState(false);

  // ── Table layout ──
  const sreniLayout = useTableLayout('sreni-contacts');

  // ── State ──
  const [rows, setRows] = useState<SreniContactRowApi[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<SreniDivisionApi[]>([]);
  const [showDivisionsModal, setShowDivisionsModal] = useState(false);
  const [sthans, setSthans] = useState<SthanBasicApi[]>([]);
  const [assignTarget, setAssignTarget] = useState<SreniContactRowApi | null>(null);
  const [householdTarget, setHouseholdTarget] = useState<SreniContactRowApi | null>(null);
  const [enrollmentScope, setEnrollmentScope] = useState('HOUSEHOLD');
  const [resolverKey, setResolverKey] = useState<HouseholdResolverKey>('household_head');
  const [femaleGenderMatches, setFemaleGenderMatches] = useState<string[]>(['f', 'female', 'woman', 'women']);
  const [participantTotal, setParticipantTotal] = useState(0);
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  const memberEnrollment = enrollmentScope === 'MEMBER' || resolverKey === 'enrolled_children';
  const femaleParticipantsMode = resolverKey === 'female_participants';

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
    backendApi.listSthans()
      .then(setSthans)
      .catch(() => {/* non-critical */});
  }, [sreniId]);

  const load = useCallback((p: number) => {
    setIsLoading(true);
    backendApi.listSreniContacts(sreniId, p, pageSize)
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setEnrollmentScope(res.enrollmentScope ?? 'HOUSEHOLD');
        setResolverKey(res.resolverKey ?? 'household_head');
        setParticipantTotal(res.participantTotal ?? res.total);
        const colSet = new Set<string>();
        for (const r of res.items) Object.keys(r.data).forEach((k) => colSet.add(k));
        if (colSet.size > 0) {
          const masterOrdered = MASTER_CONTACT_COLUMNS.map((c) => c.key).filter((k) => colSet.has(k));
          const extras = Array.from(colSet).filter((k) => !MASTER_CONTACT_COLUMN_LABELS.has(k)).sort((a, b) => a.localeCompare(b));
          setColumns([...masterOrdered, ...extras]);
        }
        if (res.items.length > 0 && res.items[0].sourceFile) setSourceFile(res.items[0].sourceFile);
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load contacts.'), 'error'))
      .finally(() => setIsLoading(false));
  }, [sreniId, pageSize, addToast]);

  useEffect(() => {
    backendApi.listEnumValues('female_gender_match', true)
      .then((values) => setFemaleGenderMatches(values.map((v) => v.value.toLowerCase())))
      .catch(() => {/* non-critical */});
  }, []);

  useEffect(() => {
    setPage(1); setRows([]); setColumns([]); setTotal(0); setTotalPages(1); setSourceFile(null);
    setSthans([]);
    load(1);
    loadDivisions();
  }, [sreniId, load, loadDivisions]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploading(true);
    try {
      const result = await backendApi.uploadSreniContacts(sreniId, file);
      addToast(`Uploaded ${result.inserted} contact${result.inserted !== 1 ? 's' : ''} from "${file.name}".`, 'success');
      setPage(1);
      load(1);
    } catch (err) {
      addToast(toUiError(err, 'Upload failed.'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleSaveAssign = async (divisionId: string | null, sthanId: string | null) => {
    if (!assignTarget) return;
    const contact = assignTarget;
    setIsSavingAssign(true);
    try {
      const [updatedDiv, updatedSthan] = await Promise.all([
        divisionId !== (contact.divisionId ?? null)
          ? backendApi.assignContactDivision(contact.sreniId, contact.id, divisionId)
          : Promise.resolve(contact),
        sthanId !== (contact.sthanId ?? null)
          ? backendApi.assignContactSthan(contact.sreniId, contact.id, sthanId)
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

  const renderPagination = (
    currentPage: number,
    currentTotalPages: number,
    onPageChange: (p: number) => void,
  ) => {
    if (currentTotalPages <= 1) return null;
    const nums = buildPageNums(currentPage, currentTotalPages);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '20px 0', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>← Prev</button>
        {nums.map((n, i) => n === '…'
          ? <span key={`e-${i}`} style={{ padding: '6px 4px', color: 'var(--text-secondary-dark)' }}>…</span>
          : <button key={n} className={`btn ${currentPage === n ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.82rem', minWidth: '36px' }} onClick={() => onPageChange(n as number)}>{n}</button>
        )}
        <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} disabled={currentPage >= currentTotalPages} onClick={() => onPageChange(currentPage + 1)}>Next →</button>
      </div>
    );
  };

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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📋 {sreniName} — Contacts</h2>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid currentColor', background: 'transparent', fontSize: '0.8rem', fontWeight: 600 }}>
              <span style={{ fontWeight: 800 }}>{memberEnrollment || femaleParticipantsMode ? participantTotal : total}</span>
              {memberEnrollment || femaleParticipantsMode ? 'participants' : 'contacts'}
            </span>
            {(memberEnrollment || femaleParticipantsMode) && (
              <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid var(--border-dark)', background: 'transparent', fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
                {total} household{total !== 1 ? 's' : ''}
              </span>
            )}
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1px solid var(--border-dark)', background: 'transparent', fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
              {divisions.length} division{divisions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.875rem' }} onClick={() => setShowDivisionsModal(true)}>
              Manage Divisions
            </button>
            <a href="/templates/master-sreni-contact-template.xlsx" download className="btn btn-secondary" style={{ fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Download Template
            </a>
            {total > 0 && (
              <button type="button" className="btn btn-secondary" onClick={handleClear} style={{ fontSize: '0.875rem', color: 'var(--error)', borderColor: 'var(--error)' }}>
                Clear All
              </button>
            )}
            <button type="button" className="btn btn-primary" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? (
                <><span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #fff4', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Uploading…</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path></svg>{total > 0 ? 'Re-upload Excel' : 'Upload Excel'}</>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => void handleUpload(e)} />
          </div>
      </div>

      {/* Columns button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setShowLayoutModal(true)}
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
      {(isLoading && rows.length === 0) || sreniLayout.loading ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
          Loading contacts…
        </div>
      ) : !isLoading && total === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
          <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>No contacts yet</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', margin: '0 auto 24px', maxWidth: '400px' }}>
            Upload the master contact Excel template, or tag contacts from other Srenies to this Sreni via the global Contacts page.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>Upload Excel File</button>
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
                  {isLoading && columns.length === 0 ? <th>Loading…</th> : visibleSreniCols.map((col) => (
                    <th key={col} style={{ whiteSpace: 'nowrap' }}>{MASTER_CONTACT_COLUMN_LABELS.get(col) ?? col}</th>
                  ))}
                  <th style={{ width: '140px' }} />
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
                      {visibleSreniCols.map((col) => {
                        const val = row.data[col];
                        return (
                          <td key={col} style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val != null ? String(val) : undefined}>
                            {val != null ? String(val) : <span style={{ color: 'var(--text-secondary-dark)', opacity: 0.45 }}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            onClick={() => setHouseholdTarget(row)}
                          >
                            Household
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                            onClick={() => setAssignTarget(row)}
                          >
                            Assign
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {renderPagination(page, totalPages, (p) => { setPage(p); load(p); })}
        </>
      )}
    </div>
  );
};
