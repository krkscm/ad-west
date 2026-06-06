import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../components/common/Toast'
import { useConfirm } from '../../components/common/ConfirmDialog'
import { PageHeader } from '../../components/common/PageHeader'
import { PaginationBar } from '../../components/common/PaginationBar'
import { backendApi, EnumValueApi } from '../../utils/backendApi'
import { formatEnumTypeName } from '../../constants/enumTypeLabels'
import { SwitchToggle } from '../../components/common/SwitchToggle'

interface FormState {
  value: string
  label: string
  sortOrder: string
  active: boolean
  parentValue: string
}

const BLANK_FORM: FormState = { value: '', label: '', sortOrder: '0', active: true, parentValue: '' }

const TYPE_PAGE_SIZE = 12
const VALUE_PAGE_SIZE = 15

const toUiError = (e: unknown, fallback: string): string => {
  if (!(e instanceof Error)) return fallback
  const m = e.message.match(/^API error \(\d+\):\s*(.*)$/i)
  return m?.[1] ?? e.message ?? fallback
}

export const EnumValuesPage: React.FC = () => {
  const { addToast } = useToast()
  const confirm = useConfirm()

  const [allValues, setAllValues] = useState<EnumValueApi[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newEnumType, setNewEnumType] = useState('')
  const [form, setForm] = useState<FormState>(BLANK_FORM)
  const [typePage, setTypePage] = useState(1)
  const [valuePage, setValuePage] = useState(1)
  const [typeSearch, setTypeSearch] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [vals, ts] = await Promise.all([
        backendApi.listEnumValues(),
        backendApi.listEnumTypes(),
      ])
      setAllValues(vals)
      setTypes(ts)
      if (!selectedType && ts.length > 0) setSelectedType(ts[0])
    } catch (e) {
      addToast(toUiError(e, 'Failed to load reference data.'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast, selectedType])

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleValues = useMemo(() =>
    selectedType ? allValues.filter((v) => v.enumType === selectedType) : [],
  [allValues, selectedType])

  const filteredTypes = useMemo(() => {
    const q = typeSearch.trim().toLowerCase()
    if (!q) return types
    return types.filter((t) =>
      t.toLowerCase().includes(q) || formatEnumTypeName(t).toLowerCase().includes(q),
    )
  }, [types, typeSearch])

  const typeTotalPages = Math.max(1, Math.ceil(filteredTypes.length / TYPE_PAGE_SIZE))
  const pagedTypes = useMemo(() => {
    const start = (typePage - 1) * TYPE_PAGE_SIZE
    return filteredTypes.slice(start, start + TYPE_PAGE_SIZE)
  }, [filteredTypes, typePage])

  useEffect(() => {
    if (typePage > typeTotalPages) setTypePage(typeTotalPages)
  }, [typePage, typeTotalPages])

  useEffect(() => {
    setTypePage(1)
  }, [typeSearch])

  useEffect(() => {
    setValuePage(1)
    setEditingId(null)
    setIsAdding(false)
    setForm(BLANK_FORM)
  }, [selectedType])

  const sortedVisibleValues = useMemo(() =>
    visibleValues.slice().sort((a, b) => a.sortOrder - b.sortOrder),
  [visibleValues])

  const valueTotalPages = Math.max(1, Math.ceil(sortedVisibleValues.length / VALUE_PAGE_SIZE))
  const pagedVisibleValues = useMemo(() => {
    const start = (valuePage - 1) * VALUE_PAGE_SIZE
    return sortedVisibleValues.slice(start, start + VALUE_PAGE_SIZE)
  }, [sortedVisibleValues, valuePage])

  useEffect(() => {
    if (valuePage > valueTotalPages) setValuePage(valueTotalPages)
  }, [valuePage, valueTotalPages])

  const openEdit = (item: EnumValueApi) => {
    setEditingId(item.id)
    setIsAdding(false)
    setForm({ value: item.value, label: item.label, sortOrder: String(item.sortOrder), active: item.active, parentValue: item.parentValue ?? '' })
  }

  const openAdd = () => {
    setEditingId(null)
    setIsAdding(true)
    setNewEnumType(selectedType ?? '')
    setForm(BLANK_FORM)
  }

  const cancelForm = () => {
    setEditingId(null)
    setIsAdding(false)
    setForm(BLANK_FORM)
  }

  const handleSave = async () => {
    const sortOrder = parseInt(form.sortOrder, 10)
    if (!form.value.trim() || !form.label.trim()) {
      addToast('Value and Label are required.', 'warning'); return
    }
    if (isNaN(sortOrder)) {
      addToast('Sort order must be a number.', 'warning'); return
    }

    setIsSaving(true)
    try {
      const cleanParentValue = form.parentValue.trim() || null
      if (editingId) {
        const updated = await backendApi.updateEnumValue(editingId, {
          value: form.value.trim(),
          label: form.label.trim(),
          sortOrder,
          active: form.active,
          parentValue: cleanParentValue,
        })
        setAllValues((prev) => prev.map((v) => v.id === editingId ? updated : v))
        addToast('Value updated.', 'success')
      } else {
        const enumType = newEnumType.trim() || selectedType
        if (!enumType) { addToast('Enum type is required.', 'warning'); return }
        const created = await backendApi.createEnumValue({
          enumType,
          value: form.value.trim(),
          label: form.label.trim(),
          sortOrder,
          active: form.active,
          parentValue: cleanParentValue,
        })
        setAllValues((prev) => [...prev, created])
        if (!types.includes(enumType)) {
          setTypes((prev) => [...prev, enumType].sort())
          setSelectedType(enumType)
        }
        addToast('Value added.', 'success')
      }
      cancelForm()
    } catch (e) {
      addToast(toUiError(e, 'Failed to save.'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: EnumValueApi) => {
    const ok = await confirm({
      title: 'Delete Enum Value',
      message: `Delete "${item.label}" (${item.value}) from ${formatEnumTypeName(item.enumType)}?`,
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await backendApi.deleteEnumValue(item.id)
      const next = allValues.filter((v) => v.id !== item.id)
      setAllValues(next)
      const remaining = next.filter((v) => v.enumType === item.enumType)
      if (remaining.length === 0) {
        const nextTypes = types.filter((t) => t !== item.enumType)
        setTypes(nextTypes)
        setSelectedType(nextTypes[0] ?? null)
      }
      addToast('Deleted.', 'success')
    } catch (e) {
      addToast(toUiError(e, 'Failed to delete.'), 'error')
    }
  }

  const effectiveFormType = isAdding ? newEnumType.trim() : selectedType
  const showParentField = effectiveFormType === 'role_level'
  const parentCandidates = visibleValues.filter((v) => v.id !== editingId)

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="🏷️"
        title="Reference Data"
        subtitle="Centralised enum values used across all modules."
        stats={[
          { label: 'Values', value: allValues.length, variant: 'info' },
          { label: 'Types', value: types.length, variant: 'warning' },
        ]}
        actions={
          <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            + Add Value
          </button>
        }
      />

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--text-secondary-dark)' }}>
          Loading…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', alignItems: 'start' }}>

          {/* Left — type list */}
          <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary-dark)', padding: '6px 10px 10px' }}>
              Enum Types ({filteredTypes.length})
            </div>
            <input
              className="form-input"
              value={typeSearch}
              onChange={(e) => setTypeSearch(e.target.value)}
              placeholder="Search types…"
              style={{ margin: '0 4px 10px', padding: '7px 10px', fontSize: '0.8rem' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              {filteredTypes.length === 0 ? (
                <div style={{ padding: '12px 10px', fontSize: '0.8rem', color: 'var(--text-secondary-dark)', textAlign: 'center' }}>
                  No types match your search.
                </div>
              ) : pagedTypes.map((t) => {
                const count = allValues.filter((v) => v.enumType === t).length
                const isActive = selectedType === t
                return (
                  <button
                    key={t}
                    onClick={() => { setSelectedType(t); cancelForm() }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: isActive ? 'var(--primary)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-secondary-dark)',
                      fontSize: '0.825rem', fontWeight: isActive ? 600 : 400,
                      textAlign: 'left', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--btn-secondary-hover)' }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatEnumTypeName(t)}
                    </span>
                    <span style={{
                      flexShrink: 0, marginLeft: '6px', padding: '1px 7px', borderRadius: '999px',
                      fontSize: '0.72rem', fontWeight: 700,
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.1)',
                      color: isActive ? '#fff' : 'var(--primary)',
                    }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
            <PaginationBar
              page={typePage}
              totalPages={typeTotalPages}
              totalItems={filteredTypes.length}
              pageSize={TYPE_PAGE_SIZE}
              onPageChange={setTypePage}
            />
          </div>

          {/* Right — values table */}
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>

            {/* Table header */}
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {selectedType ? formatEnumTypeName(selectedType) : 'Select a type'}
                </span>
                {selectedType && (
                  <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-secondary-dark)' }}>
                    {visibleValues.length} value{visibleValues.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>

            {/* Add / Edit form */}
            {(isAdding || editingId) && (
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-dark)', background: 'rgba(99,102,241,0.04)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--primary)', marginBottom: '14px' }}>
                  {editingId ? 'Edit Value' : 'Add New Value'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isAdding ? `1fr 1fr 1fr${showParentField ? ' 1fr' : ''} 120px 100px` : `1fr 1fr${showParentField ? ' 1fr' : ''} 120px 100px`, gap: '12px', alignItems: 'end' }}>
                  {isAdding && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Enum Type *</label>
                      <input
                        className="form-input"
                        value={newEnumType}
                        onChange={(e) => setNewEnumType(e.target.value)}
                        placeholder="e.g. approval_mode"
                        list="existing-types"
                      />
                      <datalist id="existing-types">
                        {types.map((t) => <option key={t} value={t} />)}
                      </datalist>
                    </div>
                  )}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Value *</label>
                    <input
                      className="form-input"
                      value={form.value}
                      onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                      placeholder="e.g. in_progress"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Label *</label>
                    <input
                      className="form-input"
                      value={form.label}
                      onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                      placeholder="e.g. In Progress"
                    />
                  </div>
                  {showParentField && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Parent Level <span style={{ color: 'var(--text-secondary-dark)', fontWeight: 400 }}>(optional)</span></label>
                      <select
                        className="form-input"
                        value={form.parentValue}
                        onChange={(e) => setForm((f) => ({ ...f, parentValue: e.target.value }))}
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="">— None (top level) —</option>
                        {parentCandidates.map((p) => (
                          <option key={p.id} value={p.value}>{p.label} ({p.value})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Sort Order</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                      min={0}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Status</label>
                    <SwitchToggle
                      checked={form.active}
                      onChange={(active) => setForm((f) => ({ ...f, active }))}
                      labelOn="Active"
                      labelOff="Inactive"
                      ariaLabel="Toggle enum value status"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                  >
                    {isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Add'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={cancelForm}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Values table */}
            {visibleValues.length === 0 && !isAdding ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.875rem' }}>
                {selectedType ? 'No values defined for this type.' : 'Select a type from the left.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dark)' }}>
                    {(['Value', 'Label', ...(selectedType === 'role_level' ? ['Parent'] : []), 'Sort', 'Active', ''] as const).map((h) => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: h === '' ? 'right' : 'left',
                        fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.06em', color: 'var(--text-secondary-dark)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedVisibleValues.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-dark)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--btn-secondary-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <code style={{ fontSize: '0.8rem', padding: '2px 7px', borderRadius: '4px', background: 'rgba(99,102,241,0.08)', color: 'var(--primary)' }}>
                            {item.value}
                          </code>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500 }}>
                          {item.label}
                        </td>
                        {selectedType === 'role_level' && (
                          <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>
                            {item.parentValue
                              ? (() => { const p = allValues.find((v) => v.enumType === 'role_level' && v.value === item.parentValue); return p ? <><code style={{ fontSize: '0.78rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.08)', color: 'var(--primary)' }}>{p.value}</code> <span>{p.label}</span></> : <span style={{ fontStyle: 'italic' }}>{item.parentValue}</span>; })()
                              : <span style={{ opacity: 0.4 }}>—</span>}
                          </td>
                        )}
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>
                          {item.sortOrder}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                            background: item.active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: item.active ? '#10b981' : '#ef4444',
                          }}>
                            {item.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => openEdit(item)}
                              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void handleDelete(item)}
                              style={{
                                padding: '5px 12px', fontSize: '0.78rem', borderRadius: '8px',
                                border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                                color: '#ef4444', cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
            {visibleValues.length > 0 && (
              <PaginationBar
                page={valuePage}
                totalPages={valueTotalPages}
                totalItems={sortedVisibleValues.length}
                pageSize={VALUE_PAGE_SIZE}
                onPageChange={setValuePage}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
