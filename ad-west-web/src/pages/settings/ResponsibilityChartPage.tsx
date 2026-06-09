import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAdminDefinitions } from '../../context/admin-definitions-context'
import {
  backendApi,
  type ResponsibilityChartApi,
  type ResponsibilityChartEdgeApi,
  type ResponsibilityChartNodeApi,
  type RoleDefinitionApi,
  type UserApi,
  type LocationDefinitionApi,
} from '../../utils/backendApi'
import { useToast } from '../../components/common/Toast'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  type Edge,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i)
  if (match?.[1]) return match[1]
  return error.message || fallback
}

export const ResponsibilityChartPage: React.FC = () => {
  const { addToast } = useToast()
  const { locationDefinitions } = useAdminDefinitions()
  const [chart, setChart] = useState<ResponsibilityChartApi | null>(null)
  const [roles, setRoles] = useState<RoleDefinitionApi[]>([])
  const [usersById, setUsersById] = useState<Map<string, UserApi>>(new Map())
  const [locationsById, setLocationsById] = useState<Map<string, LocationDefinitionApi>>(new Map())
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)

  type OrgNodeData = {
    name: string
    roleName: string
    sthanName: string
    contactNumber: string
    reportingLine: string
    active: boolean
  }

  const OrgNodeCard: React.FC<NodeProps<Node<OrgNodeData>>> = ({ data }) => {
    return (
      <div style={{
        width: '260px',
        border: '1px solid var(--border-dark)',
        borderRadius: '12px',
        background: 'var(--panel-soft-bg)',
        boxShadow: '0 6px 20px rgba(15, 23, 42, 0.1)',
        padding: '12px',
        display: 'grid',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary-dark)', lineHeight: 1.2 }}>
            {data.name}
          </div>
          <span className={`badge ${data.active ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.64rem' }}>
            {data.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
          <strong style={{ color: 'var(--text-primary-dark)' }}>Role:</strong> {data.roleName}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
          <strong style={{ color: 'var(--text-primary-dark)' }}>Sthan:</strong> {data.sthanName}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
          <strong style={{ color: 'var(--text-primary-dark)' }}>Contact:</strong> {data.contactNumber}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
          <strong style={{ color: 'var(--text-primary-dark)' }}>Reports To:</strong> {data.reportingLine}
        </div>
      </div>
    )
  }

  const load = useCallback(async (year?: number) => {
    setIsLoading(true)
    try {
      const [chartData, rolesData, usersData] = await Promise.all([
        backendApi.getResponsibilityChart(year),
        backendApi.listRoleDefinitions({ page: 1, pageSize: 1000, active: true }),
        backendApi.listUsers({ page: 1, pageSize: 5000 }),
      ])
      const locationsData = locationDefinitions

      const usersMap = new Map<string, UserApi>()
      usersData.items.forEach((user) => usersMap.set(user.id, user))

      const locationsMap = new Map<string, LocationDefinitionApi>()
      locationsData.forEach((location) => locationsMap.set(location.id, location))

      setChart(chartData)
      setRoles(rolesData.items)
      setUsersById(usersMap)
      setLocationsById(locationsMap)
      setSelectedYear(chartData.year)
    } catch (error) {
      addToast(toUiError(error, 'Failed to load responsibility chart.'), 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addToast, locationDefinitions])

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

  const managerToChildren = useMemo(() => {
    const map = new Map<string, string[]>()
    chart?.edges.forEach((edge) => {
      const rows = map.get(edge.toUserId) ?? []
      rows.push(edge.fromUserId)
      map.set(edge.toUserId, rows)
    })
    return map
  }, [chart])

  const hierarchyLayout = useMemo(() => {
    if (!chart) {
      return { levels: new Map<number, ResponsibilityChartNodeApi[]>(), levelByNode: new Map<string, number>() }
    }

    const incomingCount = new Map<string, number>()
    const levelByNode = new Map<string, number>()

    chart.nodes.forEach((node) => {
      incomingCount.set(node.userId, 0)
      levelByNode.set(node.userId, 0)
    })

    chart.edges.forEach((edge) => {
      incomingCount.set(edge.fromUserId, (incomingCount.get(edge.fromUserId) ?? 0) + 1)
    })

    const roots = chart.nodes
      .filter((node) => (incomingCount.get(node.userId) ?? 0) === 0)
      .map((node) => node.userId)

    const queue = [...roots]
    const seen = new Set<string>(roots)

    while (queue.length > 0) {
      const managerId = queue.shift()!
      const managerLevel = levelByNode.get(managerId) ?? 0
      const children = managerToChildren.get(managerId) ?? []

      children.forEach((childId) => {
        const currentLevel = levelByNode.get(childId) ?? 0
        const nextLevel = Math.max(currentLevel, managerLevel + 1)
        levelByNode.set(childId, nextLevel)
        if (!seen.has(childId)) {
          seen.add(childId)
          queue.push(childId)
        }
      })
    }

    const levels = new Map<number, ResponsibilityChartNodeApi[]>()
    chart.nodes.forEach((node) => {
      const level = levelByNode.get(node.userId) ?? 0
      const row = levels.get(level) ?? []
      row.push(node)
      levels.set(level, row)
    })

    levels.forEach((row) => row.sort((a, b) => a.name.localeCompare(b.name)))

    return { levels, levelByNode }
  }, [chart, managerToChildren])

  const sortedLevels = useMemo(
    () => Array.from(hierarchyLayout.levels.keys()).sort((a, b) => a - b),
    [hierarchyLayout.levels],
  )

  const managerByChildId = useMemo(() => {
    const map = new Map<string, ResponsibilityChartEdgeApi[]>()
    chart?.edges.forEach((edge) => {
      const rows = map.get(edge.fromUserId) ?? []
      rows.push(edge)
      map.set(edge.fromUserId, rows)
    })
    return map
  }, [chart])

  const flowNodes = useMemo<Array<Node<OrgNodeData>>>(() => {
    if (!chart) return []

    const NODE_W = 280
    const GAP_X = 60
    const GAP_Y = 170

    const nodes: Array<Node<OrgNodeData>> = []

    sortedLevels.forEach((level) => {
      const row = hierarchyLayout.levels.get(level) ?? []
      const rowWidth = row.length * NODE_W + Math.max(0, row.length - 1) * GAP_X
      const startX = -rowWidth / 2

      row.forEach((node, index) => {
        const user = usersById.get(node.userId)
        const roleName = node.roleId ? (roleNameById.get(node.roleId) ?? node.roleId) : 'No role assigned'
        const sthanName = user?.sthanId ? (locationsById.get(user.sthanId)?.name ?? user.sthanId) : 'Not assigned'
        const contactNumber = user?.phone?.trim() ? user.phone : 'Not available'
        const reportingEdges = managerByChildId.get(node.userId) ?? []
        const reportingLine = reportingEdges.length
          ? reportingEdges
              .map((edge) => {
                const managerNode = nodesById.get(edge.toUserId)
                const viaRole = roleNameById.get(edge.viaRoleId) ?? edge.viaRoleId
                const managerName = managerNode?.name ?? edge.toUserId
                return `${managerName} (${viaRole})`
              })
              .join(', ')
          : 'Top-level'

        nodes.push({
          id: node.userId,
          type: 'orgNode',
          position: {
            x: startX + index * (NODE_W + GAP_X),
            y: level * GAP_Y,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          draggable: false,
          selectable: true,
          data: {
            name: node.name,
            roleName,
            sthanName,
            contactNumber,
            reportingLine,
            active: node.active,
          },
        })
      })
    })

    return nodes
  }, [chart, hierarchyLayout.levels, locationsById, managerByChildId, nodesById, roleNameById, sortedLevels, usersById])

  const flowEdges = useMemo<Array<Edge>>(() => {
    if (!chart) return []

    return chart.edges.map((edge) => ({
      id: `${edge.toUserId}-${edge.fromUserId}-${edge.viaRoleId}`,
      source: edge.toUserId,
      target: edge.fromUserId,
      type: 'smoothstep',
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6b7a93',
      },
      style: {
        stroke: '#6b7a93',
        strokeWidth: 1.5,
      },
      label: edge.viaRoleId ? (roleNameById.get(edge.viaRoleId) ?? edge.viaRoleId) : undefined,
      labelStyle: {
        fontSize: 10,
        fill: '#64748b',
      },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 6,
      labelBgStyle: {
        fill: 'rgba(241,245,249,0.9)',
        stroke: '#cbd5e1',
      },
    }))
  }, [chart, roleNameById])

  const handleYearChange = async (value: string) => {
    const year = parseInt(value, 10)
    if (!Number.isFinite(year)) return
    await load(year)
  }

  return (
    <div className="animate-slide-up">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🧭 Responsibility Chart</h2>
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
      ) : (!chart || chart.nodes.length === 0) ? (
        <div className="glass-panel" style={{ padding: '24px', color: 'var(--text-secondary-dark)' }}>
          No organization chart data available for this year.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
            <span><strong>{flowNodes.length}</strong> users</span>
            <span><strong>{flowEdges.length}</strong> reporting links</span>
            <span><strong>{sortedLevels.length}</strong> hierarchy levels</span>
          </div>

          <div className="glass-panel" style={{ padding: '12px', height: 'calc(100vh - 290px)', minHeight: '560px' }}>
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={{ orgNode: OrgNodeCard }}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              zoomOnScroll
              panOnDrag
            >
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) => {
                  const data = node.data as OrgNodeData | undefined
                  return data?.active ? '#3b82f6' : '#ef4444'
                }}
                style={{ background: 'rgba(241,245,249,0.9)', border: '1px solid #cbd5e1' }}
              />
              <Controls />
              <Background color="#dbe5f3" gap={18} />
            </ReactFlow>
          </div>

          <div className="glass-panel" style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
            Org chart nodes show person name, role, sthan, contact number, and reporting line. Use mouse wheel to zoom and drag to pan.
          </div>

          <div className="glass-panel" style={{ padding: '14px 16px', display: 'grid', gap: '8px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Reporting References</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {flowEdges.slice(0, 20).map((edge) => {
                const child = flowNodes.find((node) => node.id === edge.target)
                const manager = flowNodes.find((node) => node.id === edge.source)
                return (
                  <span
                    key={edge.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 8px',
                      borderRadius: '999px',
                      border: '1px solid var(--border-dark)',
                      background: 'var(--panel-soft-bg)',
                      fontSize: '0.72rem',
                    }}
                  >
                    {(child?.data as OrgNodeData | undefined)?.name ?? edge.target} {'->'} {(manager?.data as OrgNodeData | undefined)?.name ?? edge.source}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
