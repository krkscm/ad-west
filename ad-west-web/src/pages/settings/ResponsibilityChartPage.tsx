import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  backendApi,
  type ResponsibilityChartApi,
  type ResponsibilityChartNodeApi,
  type RoleDefinitionApi,
} from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i)
  if (match?.[1]) return match[1]
  return error.message || fallback
}

export const ResponsibilityChartPage: React.FC = () => {
  const { addToast } = useToast()
  const [chart, setChart] = useState<ResponsibilityChartApi | null>(null)
  const [roles, setRoles] = useState<RoleDefinitionApi[]>([])
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async (year?: number) => {
    setIsLoading(true)
    try {
      const [chartData, rolesData] = await Promise.all([
        backendApi.getResponsibilityChart(year),
        backendApi.listRoleDefinitions({ page: 1, pageSize: 1000, active: true }),
      ])
      setChart(chartData)
      setRoles(rolesData.items)
      setSelectedYear(chartData.year)
    } catch (error) {
      addToast(toUiError(error, 'Failed to load responsibility chart.'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    void load()
  }, [load])

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>()
    roles.forEach((role) => map.set(role.id, role.name))
    return map
  }, [roles])

  const nodesById = useMemo(() => {
    const map = new Map<string, ResponsibilityChartNodeApi>()
    chart?.nodes.forEach((node) => map.set(node.userId, node))
    return map
  }, [chart])

  const edgesByChild = useMemo(() => {
    const map = new Map<string, string[]>()
    chart?.edges.forEach((edge) => {
      const rows = map.get(edge.fromUserId) ?? []
      rows.push(edge.toUserId)
      map.set(edge.fromUserId, rows)
    })
    return map
  }, [chart])

  const managerToChildren = useMemo(() => {
    const map = new Map<string, string[]>()
    chart?.edges.forEach((edge) => {
      const rows = map.get(edge.toUserId) ?? []
      rows.push(edge.fromUserId)
      map.set(edge.toUserId, rows)
    })
    return map
  }, [chart])

  const nodesByLevel = useMemo(() => {
    if (!chart) return new Map<number, ResponsibilityChartNodeApi[]>()

    const levels = new Map<string, number>()
    chart.nodes.forEach((node) => levels.set(node.userId, 0))

    for (let i = 0; i < chart.nodes.length; i += 1) {
      let changed = false
      chart.edges.forEach((edge) => {
        const managerLevel = levels.get(edge.toUserId) ?? 0
        const childLevel = levels.get(edge.fromUserId) ?? 0
        const nextLevel = managerLevel + 1
        if (nextLevel > childLevel) {
          levels.set(edge.fromUserId, nextLevel)
          changed = true
        }
      })
      if (!changed) break
    }

    const grouped = new Map<number, ResponsibilityChartNodeApi[]>()
    chart.nodes.forEach((node) => {
      const level = levels.get(node.userId) ?? 0
      const bucket = grouped.get(level) ?? []
      bucket.push(node)
      grouped.set(level, bucket)
    })

    grouped.forEach((bucket) => bucket.sort((a, b) => a.name.localeCompare(b.name)))
    return grouped
  }, [chart])

  const sortedLevels = useMemo(() => Array.from(nodesByLevel.keys()).sort((a, b) => a - b), [nodesByLevel])

  const handleYearChange = async (value: string) => {
    const year = parseInt(value, 10)
    if (!Number.isFinite(year)) return
    await load(year)
  }

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Responsibility Chart</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary-dark)' }}>Year</label>
          <select
            className="form-input"
            value={selectedYear ?? ''}
            onChange={(event) => void handleYearChange(event.target.value)}
            style={{ minWidth: '120px', cursor: 'pointer' }}
          >
            {(chart?.availableYears ?? []).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-dark)' }}>Loading responsibility chart…</div>
      ) : !chart || chart.nodes.length === 0 ? (
        <div className="glass-panel" style={{ padding: '24px', color: 'var(--text-secondary-dark)' }}>
          No organization chart data available for this year.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
            <span><strong>{chart.nodes.length}</strong> users</span>
            <span><strong>{chart.edges.length}</strong> reporting links</span>
            <span><strong>{sortedLevels.length}</strong> hierarchy levels</span>
          </div>

          <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gap: '18px', minWidth: '920px' }}>
              {sortedLevels.map((level) => {
                const levelNodes = nodesByLevel.get(level) ?? []
                return (
                  <div key={level} style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-secondary-dark)', textTransform: 'uppercase' }}>
                      Level {level + 1}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                      {levelNodes.map((node) => {
                        const managerIds = edgesByChild.get(node.userId) ?? []
                        const childIds = managerToChildren.get(node.userId) ?? []

                        return (
                          <div key={node.userId} style={{
                            border: '1px solid var(--border-dark)',
                            borderRadius: '10px',
                            background: 'var(--panel-soft-bg)',
                            padding: '10px',
                            display: 'grid',
                            gap: '8px',
                          }}>
                            <div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>{node.name}</div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary-dark)' }}>
                                {node.roleId ? (roleNameById.get(node.roleId) ?? node.roleId) : 'No role assigned'}
                              </div>
                            </div>

                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary-dark)' }}>
                              Reports to: {managerIds.length || node.reportingToRoleIds.length}
                              {' · '}
                              Direct reports: {childIds.length}
                            </div>

                            {managerIds.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {managerIds.map((managerId) => {
                                  const manager = nodesById.get(managerId)
                                  if (!manager) return null
                                  return (
                                    <span key={`${node.userId}-${managerId}`} style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'rgba(59,130,246,0.12)',
                                      color: '#60a5fa',
                                      borderRadius: '999px',
                                      padding: '3px 8px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                    }}>
                                      ↑ {manager.name}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
