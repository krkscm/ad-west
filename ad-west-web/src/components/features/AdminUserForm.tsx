import React, { useCallback, useEffect, useState } from 'react'
import { useToast } from '../common/Toast'
import { backendApi, AdminUserApi, MenuItemApi, RoleDefinitionApi } from '../../utils/backendApi'

const toUiError = (e: unknown, fallback: string): string => {
  if (!(e instanceof Error)) return fallback
  const m = e.message.match(/^API error \(\d+\):\s*(.*)$/i)
  return m?.[1] ?? e.message ?? fallback
}

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghjkmnpqrstuvwxyz'
const DIGITS = '23456789'
const SPECIAL = '@#$%&!'
const ALL = UPPER + LOWER + DIGITS + SPECIAL

function generateTempPassword(): string {
  const rand = (chars: string) => chars[Math.floor(Math.random() * chars.length)]
  const core = Array.from({ length: 8 }, () => rand(ALL))
  // Guarantee at least one of each required class
  core[0] = rand(UPPER)
  core[1] = rand(LOWER)
  core[2] = rand(DIGITS)
  core[3] = rand(SPECIAL)
  // Fisher-Yates shuffle
  for (let i = core.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [core[i], core[j]] = [core[j], core[i]]
  }
  return core.join('')
}

interface Props {
  editingId: string | null
  onBack: () => void
  onSaved: () => void
}

export const AdminUserForm: React.FC<Props> = ({ editingId, onBack, onSaved }) => {
  const { addToast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinitionApi[]>([])

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [active, setActive] = useState(true)
  const [roleDefinitionId, setRoleDefinitionId] = useState('')

  const [menus, setMenus] = useState<MenuItemApi[]>([])
  const [grantedKeys, setGrantedKeys] = useState<Set<string>>(new Set())

  // Shown after create only
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadRoleDefinitions = useCallback(async () => {
    try {
      const response = await backendApi.listRoleDefinitions({ pageSize: 500 })
      setRoleDefinitions(response.items)
    } catch (e) {
      addToast(toUiError(e, 'Failed to load role definitions.'), 'error')
    }
  }, [addToast])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      await loadRoleDefinitions()
      const menuItems = await backendApi.listMenuItems()
      setMenus(menuItems.slice().sort((a, b) => {
        if (!a.parentKey && b.parentKey) return -1
        if (a.parentKey && !b.parentKey) return 1
        if (a.parentKey !== b.parentKey) return (a.parentKey ?? '').localeCompare(b.parentKey ?? '')
        return a.sortOrder - b.sortOrder
      }))

      if (editingId) {
        const [admins, grants] = await Promise.all([
          backendApi.listAdminUsers(),
          backendApi.getAdminMenuGrants(editingId),
        ])
        const row = admins.find((a: AdminUserApi) => a.id === editingId)
        if (row) {
          setCode(row.code)
          setName(row.name)
          setActive(row.active)
          setRoleDefinitionId(row.roleDefinitionId ?? '')
        }
        setGrantedKeys(new Set(grants.menuKeys))
      }
    } catch (e) {
      addToast(toUiError(e, 'Failed to load data.'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [editingId, addToast])

  useEffect(() => { void load() }, [load])

  const handleToggleKey = (key: string) => {
    setGrantedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !name.trim()) { addToast('Code and name are required.', 'warning'); return }
    if (!roleDefinitionId) { addToast('Role definition is required.', 'warning'); return }

    setIsSaving(true)
    try {
      let adminId = editingId
      if (!editingId) {
        const tempPassword = generateTempPassword()
        const created = await backendApi.createAdminUser({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          password: tempPassword,
          roleDefinitionId,
          active,
        })
        adminId = created.id
        setCreatedTempPassword(tempPassword)
      } else {
        await backendApi.updateAdminProfile(editingId, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          roleDefinitionId,
        })
        await backendApi.updateAdminStatus(editingId, active)
      }

      if (adminId) {
        await backendApi.setAdminMenuGrants(adminId, Array.from(grantedKeys))
      }

      if (!editingId) {
        // Stay on page to show the temp password — user must dismiss
        addToast('Administrator created. Share the temporary password below.', 'success')
      } else {
        addToast('Administrator updated successfully.', 'success')
        onSaved()
      }
    } catch (e) {
      addToast(toUiError(e, 'Failed to save administrator.'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopy = () => {
    if (!createdTempPassword) return
    void navigator.clipboard.writeText(createdTempPassword).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const topMenus = menus.filter(m => !m.parentKey)
  const childrenOf = (key: string) => menus.filter(m => m.parentKey === key)
  const grantedCount = grantedKeys.size

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--text-secondary-dark)' }}>
        Loading…
      </div>
    )
  }

  // ── After creation: show temp password banner ──────────────────────────────
  if (createdTempPassword) {
    return (
      <div className="animate-slide-up" style={{ maxWidth: '560px', margin: '60px auto' }}>
        <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✅</div>
          <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '6px' }}>Administrator Created</h3>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginBottom: '28px' }}>
            Share this temporary password with <strong>{name}</strong>. They will use it to log in for the first time.
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center',
            padding: '16px 20px', borderRadius: '10px',
            background: 'rgba(15,23,42,0.04)', border: '1.5px dashed var(--border-dark)',
            marginBottom: '24px',
          }}>
            <code style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-primary-dark)', flex: 1, textAlign: 'center' }}>
              {createdTempPassword}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-dark)',
                background: copied ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)',
                color: copied ? '#10b981' : 'var(--text-secondary-dark)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginBottom: '28px' }}>
            This password will not be shown again. Make sure to copy it now.
          </p>

          <button type="button" className="btn btn-primary" onClick={onSaved} style={{ minWidth: '160px' }}>
            Done
          </button>
        </div>
      </div>
    )
  }

  // ── Normal form ────────────────────────────────────────────────────────────
  return (
    <div className="animate-slide-up">

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={onBack} className="btn btn-secondary"
          style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Back
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {editingId ? 'Edit Administrator' : 'New Administrator'}
          </h2>
          {editingId && name && (
            <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '2px' }}>
              {code} · {name}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

          {/* Left — Account card */}
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid var(--primary)' }}>
            <SectionLabel>Account</SectionLabel>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Admin Code *</label>
                <input
                  className="form-input"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="e.g. ADM_ZONE_01"
                  required
                  disabled={!!editingId}
                />
              </div>
              <div>
                <label className="form-label">Admin Name *</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Role Definition *</label>
                <select
                  className="form-input"
                  value={roleDefinitionId}
                  onChange={e => setRoleDefinitionId(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Select a role definition</option>
                  {roleDefinitions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Status *</label>
                <button
                  type="button"
                  onClick={() => setActive(prev => !prev)}
                  aria-pressed={active}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px',
                    width: '100%', height: '42px', padding: '0 14px', borderRadius: '10px',
                    border: `1px solid ${active ? 'rgba(16,185,129,0.35)' : 'rgba(148,163,184,0.28)'}`,
                    background: active ? 'rgba(16,185,129,0.08)' : 'rgba(15,23,42,0.04)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: active ? '#10b981' : 'var(--text-secondary-dark)' }}>
                    {active ? 'Active' : 'Inactive'}
                  </span>
                  <span style={{
                    position: 'relative', width: '40px', height: '22px', borderRadius: '999px',
                    background: active ? 'var(--success)' : 'rgba(148,163,184,0.45)',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}>
                    <span style={{
                      position: 'absolute', top: '3px', left: active ? '19px' : '3px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,0.22)',
                      transition: 'left 0.2s',
                    }} />
                  </span>
                </button>
              </div>
            </div>

          </div>

          {/* Right — Menu Access */}
          <div className="glass-panel" style={{ padding: '24px', position: 'sticky', top: '20px', borderLeft: '3px solid #10b981' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <SectionLabel color="#10b981">Menu Access</SectionLabel>
              {grantedCount > 0 && (
                <span style={{
                  marginLeft: 'auto', padding: '2px 8px', borderRadius: '999px',
                  fontSize: '0.72rem', fontWeight: 700,
                  background: 'rgba(16,185,129,0.12)', color: '#10b981',
                }}>
                  {grantedCount} granted
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button type="button" onClick={() => setGrantedKeys(new Set(menus.map(m => m.key)))}
                style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-secondary-dark)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                Select All
              </button>
              <button type="button" onClick={() => setGrantedKeys(new Set())}
                style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid var(--border-dark)', background: 'transparent', color: 'var(--text-secondary-dark)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                Clear
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '520px', overflowY: 'auto' }}>
              {topMenus.map(parent => {
                const children = childrenOf(parent.key)
                const parentGranted = grantedKeys.has(parent.key)
                return (
                  <div key={parent.key}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                      background: parentGranted ? 'rgba(99,102,241,0.07)' : 'transparent',
                    }}>
                      <CheckBox checked={parentGranted} onChange={() => handleToggleKey(parent.key)} size={16} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1 }}>{parent.label}</span>
                      {children.length > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary-dark)' }}>
                          {children.filter(c => grantedKeys.has(c.key)).length}/{children.length}
                        </span>
                      )}
                    </label>
                    {children.map(child => {
                      const childGranted = grantedKeys.has(child.key)
                      return (
                        <label key={child.key} style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '6px 10px 6px 30px', borderRadius: '8px', cursor: 'pointer',
                          background: childGranted ? 'rgba(99,102,241,0.05)' : 'transparent',
                        }}>
                          <CheckBox checked={childGranted} onChange={() => handleToggleKey(child.key)} size={14} />
                          <span style={{ fontSize: '0.82rem', color: childGranted ? 'var(--text-primary-dark)' : 'var(--text-secondary-dark)' }}>
                            {child.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-dark)' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ minWidth: '100px' }}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ minWidth: '140px' }}>
            {isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Administrator'}
          </button>
        </div>
      </form>
    </div>
  )
}

const SectionLabel: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'var(--primary)' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
    <div style={{ width: '3px', height: '18px', borderRadius: '2px', background: color, flexShrink: 0 }} />
    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary-dark)' }}>
      {children}
    </span>
  </div>
)

const CheckBox: React.FC<{ checked: boolean; onChange: () => void; size: number }> = ({ checked, onChange, size }) => (
  <div
    onClick={e => { e.preventDefault(); onChange() }}
    style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '4px', flexShrink: 0,
      border: `2px solid ${checked ? 'var(--primary)' : 'var(--border-dark)'}`,
      background: checked ? 'var(--primary)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s',
    }}
  >
    {checked && (
      <svg width={size - 6} height={size - 6} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )}
  </div>
)
