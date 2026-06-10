import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../common/Toast'
import { useConfirm } from '../common/ConfirmDialog'
import { TableColumnFilterRow, type TableColumnFilterDef } from '../common/TableColumnFilterRow'
import { TableColumnHeaderRow } from '../common/TableColumnHeaderRow'
import { useTableColumnFilters } from '../../hooks/useTableColumnFilters'
import { useTableSort } from '../../hooks/useTableSort'
import { applyClientColumnFilters, type ClientFilterAccessor } from '../../utils/clientTableFilter'
import { applyClientColumnSort } from '../../utils/clientTableSort'
import { backendApi, AdminUserApi, RoleDefinitionApi } from '../../utils/backendApi'
import { TableRowActionsMenu } from '../common/TableRowActionsMenu'

const toUiError = (e: unknown, fallback: string): string => {
  if (!(e instanceof Error)) return fallback
  const m = e.message.match(/^API error \(\d+\):\s*(.*)$/i)
  return m?.[1] ?? e.message ?? fallback
}

interface UiAdmin {
  id: string
  code: string
  name: string
  active: boolean
  roleDefinitionId?: string
}

const toUiAdmin = (row: AdminUserApi): UiAdmin => {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    active: row.active,
    roleDefinitionId: row.roleDefinitionId,
  }
}

interface Props {
  onAdd: () => void
  onEdit: (id: string) => void
}

export const AdminUsersList: React.FC<Props> = ({ onAdd, onEdit }) => {
  const { addToast } = useToast()
  const confirm = useConfirm()

  const [admins, setAdmins] = useState<UiAdmin[]>([])
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinitionApi[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const { filters, debouncedFilters, setFilter, clearFilters } = useTableColumnFilters()
  const { sortBy, sortDir, toggleSort, clearSort } = useTableSort()

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>()
    roleDefinitions.forEach((role) => map.set(role.id, role.name))
    return map
  }, [roleDefinitions])

  const filterColumns = useMemo<TableColumnFilterDef[]>(() => [
    { key: 'code', label: 'Code', filterable: true, placeholder: 'Code…' },
    { key: 'name', label: 'Name', filterable: true, placeholder: 'Name…' },
    { key: 'role', label: 'Role Definition', filterable: true, placeholder: 'Role…' },
    {
      key: 'active',
      label: 'Status',
      filterable: true,
      filterType: 'select',
      placeholder: 'All statuses',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
      align: 'center',
    },
    { key: '__actions__', label: 'Actions', filterable: false, sortable: false, align: 'right' },
  ], [])

  const accessors = useMemo<Record<string, ClientFilterAccessor<UiAdmin>>>(() => ({
    code: { getValue: (admin) => admin.code },
    name: { getValue: (admin) => admin.name },
    role: { getValue: (admin) => roleNameById.get(admin.roleDefinitionId ?? '') ?? 'Unassigned' },
    active: { getValue: (admin) => (admin.active ? 'active' : 'inactive'), match: 'exact' },
  }), [roleNameById])

  const displayedAdmins = useMemo(
    () => applyClientColumnSort(
      applyClientColumnFilters(admins, debouncedFilters, accessors),
      sortBy,
      sortDir,
      accessors,
    ),
    [admins, debouncedFilters, accessors, sortBy, sortDir],
  )
  const clearAllFilters = () => {
    clearFilters()
    clearSort()
  }

  const loadAdmins = useCallback(async () => {
    setIsLoading(true)
    try {
      const [res, roles] = await Promise.all([
        backendApi.listAdminUsersPaginated({
          page,
          pageSize,
          search: search || undefined,
        }),
        backendApi.listRoleDefinitions({ pageSize: 500 }),
      ])
      const mapped = res.items.map(toUiAdmin)
      setRoleDefinitions(roles.items)
      setAdmins(mapped)
      setTotal(res.total)
      setTotalPages(res.totalPages)
      setPage(res.page)
    } catch (e) {
      addToast(toUiError(e, 'Failed to load administrators.'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast, page, pageSize, search])

  useEffect(() => { void loadAdmins() }, [loadAdmins])

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 300)
  }, [searchInput])

  const handleDelete = async (admin: UiAdmin) => {
    const ok = await confirm({
      message: `Permanently delete "${admin.name}"? This cannot be undone.`,
      danger: true,
    })
    if (!ok) return
    try {
      await backendApi.deleteAdminUser(admin.id)
      addToast(`Administrator "${admin.name}" deleted.`, 'success')
      void loadAdmins()
    } catch (e) {
      addToast(toUiError(e, 'Failed to delete administrator.'), 'error')
    }
  }

  const handleToggleActive = async (admin: UiAdmin) => {
    const ok = await confirm({
      message: `${admin.active ? 'Deactivate' : 'Activate'} "${admin.name}"?`,
      danger: admin.active,
    })
    if (!ok) return
    try {
      await backendApi.updateAdminStatus(admin.id, !admin.active)
      addToast(`Administrator ${admin.active ? 'deactivated' : 'activated'}.`, 'success')
      void loadAdmins()
    } catch (e) {
      addToast(toUiError(e, 'Failed to update status.'), 'error')
    }
  }

  return (
    <div className="animate-slide-up">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>👤 Admin Management</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', marginTop: '4px' }}>
            {total} administrator{total !== 1 ? 's' : ''} · page {page} of {totalPages}
          </p>
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          + Add Administrator
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px', maxWidth: '340px' }}>
        <input
          className="form-input"
          placeholder="Search by code or name…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          style={{ fontSize: '0.875rem' }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary-dark)' }}>Loading…</div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <TableColumnHeaderRow
                columns={filterColumns}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <TableColumnFilterRow
                columns={filterColumns}
                values={filters}
                onChange={setFilter}
                onClear={clearAllFilters}
              />
            </thead>
            <tbody>
              {displayedAdmins.map(admin => (
                <tr key={admin.id} style={{ opacity: admin.active ? 1 : 0.5 }}>
                  <td>
                    <code style={{ fontSize: '0.8rem', fontWeight: 700, background: 'var(--chip-bg-soft)', color: 'var(--text-primary-dark)', padding: '3px 8px', borderRadius: '5px' }}>{admin.code}</code>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{admin.name}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>
                      {roleNameById.get(admin.roleDefinitionId ?? '') ?? 'Unassigned'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${admin.active ? 'badge-success' : 'badge-error'}`}>
                      {admin.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                    <TableRowActionsMenu
                      ariaLabel={`Actions for ${admin.name}`}
                      actions={[
                        { label: 'Edit', onClick: () => onEdit(admin.id) },
                        { label: admin.active ? 'Deactivate' : 'Activate', tone: admin.active ? 'warning' : 'success', onClick: () => void handleToggleActive(admin) },
                        { label: 'Delete', tone: 'danger', onClick: () => void handleDelete(admin) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {displayedAdmins.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>
                    {search || Object.keys(debouncedFilters).length
                      ? 'No admins match your search or filters.'
                      : 'No administrators found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem' }}>
            Showing {(page - 1) * pageSize + (displayedAdmins.length ? 1 : 0)}-{(page - 1) * pageSize + displayedAdmins.length} of {total}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '5px 12px', fontSize: '0.82rem' }}
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '5px 12px', fontSize: '0.82rem' }}
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
