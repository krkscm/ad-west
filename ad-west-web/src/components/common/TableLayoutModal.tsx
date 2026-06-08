import React, { useEffect, useState } from 'react';
import { CloseIcon, IconButton } from './IconButton';
import { Modal } from './Modal';
import { SwitchToggle } from './SwitchToggle';
import { buildColumnItems, ColumnItem } from '../../hooks/useTableLayout';
import { TableLayoutApi } from '../../utils/backendApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tableTitle: string;
  allColumns: Array<{ key: string; label: string }>;
  layouts: TableLayoutApi[];
  activeId: string | null;
  onActivate: (id: string | null) => Promise<void>;
  onCreate: (name: string, cols: ColumnItem[]) => Promise<TableLayoutApi>;
  onUpdate: (id: string, cols: ColumnItem[], name?: string) => Promise<TableLayoutApi>;
  onDelete: (id: string) => Promise<void>;
}

export const TableLayoutModal: React.FC<Props> = ({
  isOpen, onClose, tableTitle, allColumns,
  layouts, activeId,
  onActivate, onCreate, onUpdate, onDelete,
}) => {
  const [cols, setCols] = useState<ColumnItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null); // which layout is loaded in editor
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const hasColumns = allColumns.length > 0;

  // Initialise the column editor whenever the modal opens OR columns first become available.
  // The second dep (`hasColumns`) lets the editor bootstrap correctly when data loads after the
  // modal is already open (e.g. user opens Columns before the first page fetch returns).
  useEffect(() => {
    if (!isOpen || !hasColumns) return;
    const active = activeId ? layouts.find((l) => l.id === activeId) : null;
    setCols(buildColumnItems(allColumns, active?.columns ?? null));
    setEditingId(activeId);
    setNewName('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasColumns]);

  const visibleCount = cols.filter((c) => c.visible).length;

  const loadIntoEditor = (id: string | null) => {
    const layout = id ? layouts.find((l) => l.id === id) : null;
    setCols(buildColumnItems(allColumns, layout?.columns ?? null));
    setEditingId(id);
  };

  const toggle = (i: number) =>
    setCols((p) => p.map((c, j) => (j === i ? { ...c, visible: !c.visible } : c)));

  const moveUp = (i: number) => {
    if (i === 0) return;
    setCols((p) => { const n = [...p]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; });
  };

  const moveDown = (i: number) => {
    setCols((p) => {
      if (i >= p.length - 1) return p;
      const n = [...p]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; return n;
    });
  };

  const handleActivate = async (id: string | null) => {
    setSaving(true);
    try {
      await onActivate(id);
      loadIntoEditor(id);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNew = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const created = await onCreate(name, cols);
      setEditingId(created.id);
      setNewName('');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || saving) return;
    setSaving(true);
    try {
      await onUpdate(editingId, cols);
      // Also make this layout active if it isn't already
      if (activeId !== editingId) await onActivate(editingId);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      await onDelete(id);
      if (editingId === id) loadIntoEditor(null);
    } finally {
      setSaving(false);
    }
  };

  const editingLayout = editingId ? layouts.find((l) => l.id === editingId) : null;

  // Detect if cols differ from the saved editingLayout
  const hasPendingChanges = (() => {
    if (!editingLayout) return false;
    const saved = editingLayout.columns.map((c) => `${c.key}:${c.visible}`).join(',');
    const current = cols.map((c) => `${c.key}:${c.visible}`).join(',');
    return saved !== current;
  })();

  const btnStyle: React.CSSProperties = { fontSize: '0.82rem', padding: '5px 12px' };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Customize Columns — ${tableTitle}`} maxWidth="860px">
      <div style={{ display: 'flex', gap: '20px', minHeight: '380px' }}>

        {/* ── Left panel: Saved layouts ── */}
        <div style={{ width: '230px', flexShrink: 0, borderRight: '1px solid var(--border-dark)', paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary-dark)', marginBottom: '8px' }}>
            Saved Layouts
          </div>

          {/* Default row */}
          {(() => {
            const isActive = activeId === null;
            const isEditing = editingId === null;
            return (
              <div
                onClick={() => loadIntoEditor(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px',
                  borderRadius: '7px', cursor: 'pointer',
                  background: isEditing ? 'rgba(99,102,241,0.1)' : 'transparent',
                  border: `1px solid ${isEditing ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                }}
                onMouseEnter={(e) => { if (!isEditing) e.currentTarget.style.background = 'var(--surface-dark)'; }}
                onMouseLeave={(e) => { if (!isEditing) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: isEditing ? 'var(--primary)' : 'var(--text-primary-dark)' }}>
                  Default (All)
                </span>
                {isActive && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(99,102,241,0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                    ON
                  </span>
                )}
              </div>
            );
          })()}

          {/* Named layouts */}
          {layouts.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0 4px' }}>
              No layouts yet
            </p>
          )}
          {layouts.map((l) => {
            const isActive = activeId === l.id;
            const isEditing = editingId === l.id;
            return (
              <div
                key={l.id}
                onClick={() => loadIntoEditor(l.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px',
                  borderRadius: '7px', cursor: 'pointer',
                  background: isEditing ? 'rgba(99,102,241,0.1)' : 'transparent',
                  border: `1px solid ${isEditing ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                }}
                onMouseEnter={(e) => { if (!isEditing) e.currentTarget.style.background = 'var(--surface-dark)'; }}
                onMouseLeave={(e) => { if (!isEditing) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: isEditing ? 'var(--primary)' : 'var(--text-primary-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.name}
                </span>
                {isActive && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(99,102,241,0.15)', padding: '1px 6px', borderRadius: '4px', flexShrink: 0 }}>
                    ON
                  </span>
                )}
                <IconButton
                  label="Delete layout"
                  title="Delete layout"
                  variant="ghost"
                  disabled={saving}
                  onClick={(e) => void handleDelete(l.id, e)}
                  style={{ color: 'var(--text-secondary-dark)', flexShrink: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary-dark)'; }}
                >
                  <CloseIcon />
                </IconButton>
              </div>
            );
          })}

          {/* Activate button for editing layout */}
          {editingId !== null && activeId !== editingId && !hasPendingChanges && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ ...btnStyle, marginTop: '10px' }}
              disabled={saving}
              onClick={() => void handleActivate(editingId)}
            >
              Use This Layout
            </button>
          )}

          {activeId !== null && editingId === null && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ ...btnStyle, marginTop: '10px' }}
              disabled={saving}
              onClick={() => void handleActivate(null)}
            >
              Reset to Default
            </button>
          )}
        </div>

        {/* ── Right panel: Column editor ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary-dark)' }}>
                {editingLayout ? `Editing: ${editingLayout.name}` : 'Default columns'}
              </span>
              {cols.length > 0 && (
                <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
                  {visibleCount} / {cols.length} visible
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCols((p) => p.map((c) => ({ ...c, visible: true })))}>All</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCols((p) => p.map((c) => ({ ...c, visible: false })))}>None</button>
            </div>
          </div>

          {/* Column list */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px', border: '1px solid var(--border-dark)', borderRadius: '8px' }}>
            {cols.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>
                Load data first to see columns.
              </div>
            ) : cols.map((col, i) => (
              <div
                key={col.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px',
                  borderBottom: i < cols.length - 1 ? '1px solid var(--border-dark)' : 'none',
                  opacity: col.visible ? 1 : 0.5,
                  transition: 'opacity 0.15s',
                }}
              >
                {/* Reorder arrows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    style={{ background: 'transparent', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--border-dark)' : 'var(--text-secondary-dark)', fontSize: '0.65rem', padding: '1px 4px', lineHeight: 1 }}
                  >▲</button>
                  <button
                    type="button"
                    onClick={() => moveDown(i)}
                    disabled={i === cols.length - 1}
                    style={{ background: 'transparent', border: 'none', cursor: i === cols.length - 1 ? 'default' : 'pointer', color: i === cols.length - 1 ? 'var(--border-dark)' : 'var(--text-secondary-dark)', fontSize: '0.65rem', padding: '1px 4px', lineHeight: 1 }}
                  >▼</button>
                </div>

                {/* Visibility toggle */}
                <SwitchToggle
                  variant="inline"
                  checked={col.visible}
                  onChange={() => toggle(i)}
                  ariaLabel={`${col.visible ? 'Hide' : 'Show'} ${col.label} column`}
                />

                {/* Label */}
                <span style={{ flex: 1, fontSize: '0.875rem', color: col.visible ? 'var(--text-primary-dark)' : 'var(--text-secondary-dark)' }}>
                  {col.label}
                </span>
              </div>
            ))}
          </div>

          {/* Save as new / update */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              className="form-input"
              style={{ flex: 1, padding: '7px 12px', fontSize: '0.875rem' }}
              placeholder="Layout name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveNew(); }}
              disabled={saving}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ ...btnStyle, whiteSpace: 'nowrap' }}
              disabled={!newName.trim() || saving}
              onClick={() => void handleSaveNew()}
            >
              Save as New
            </button>
          </div>

          {hasPendingChanges && editingId && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)', flex: 1 }}>
                Unsaved changes to "{editingLayout?.name}"
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={saving}
                onClick={() => { const l = layouts.find((x) => x.id === editingId); if (l) setCols(buildColumnItems(allColumns, l.columns)); }}
              >
                Revert
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={btnStyle}
                disabled={saving}
                onClick={() => void handleUpdate()}
              >
                {saving ? 'Saving…' : `Update "${editingLayout?.name}"`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-dark)' }}>
        <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
};
