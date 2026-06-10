import React, { useEffect, useMemo, useState } from 'react';
import {
  Background,
  Connection,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useToast } from '../../components/common/Toast';
import {
  ApprovalWorkflowDefinitionApi,
  ApprovalWorkflowMode,
  EnumValueApi,
  RoleDefinitionApi,
  backendApi,
} from '../../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

const MODE_META: Record<string, { label: string; description: string; color: string }> = {
  sequential: {
    label: 'Sequential',
    description: 'Each stage must be fully approved before the next stage begins.',
    color: 'var(--primary)',
  },
  parallel: {
    label: 'Parallel',
    description: 'All stages run simultaneously. The request is approved when every stage is satisfied.',
    color: '#0ea5e9',
  },
};

interface DraftStage {
  _tempId: string;
  label: string;
  approverPermissionSetId?: string;
  approverRoleDefinitionIds?: string[];
  parentStageId?: string;
  requiredCount: number;
  stageOrder: number;
}

type FormStage = {
  id: string;
  stageOrder: number;
  label: string;
  approverPermissionSetId?: string;
  approverRoleDefinitionIds?: string[];
  parentStageId?: string;
  requiredCount: number;
};

interface ApprovalWorkflowFormPageProps {
  editingWorkflow: ApprovalWorkflowDefinitionApi | null;
  onBack: () => void;
  onSaved: () => void;
}

let _draftCounter = 0;
const newDraftId = () => `draft-${++_draftCounter}`;

type StageNodeData = {
  label: string;
  approverName: string;
  requiredCount: number;
  color: string;
  selected: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

const StageFlowNode: React.FC<NodeProps> = ({ data }) => {
  const nodeData = data as StageNodeData;
  return (
    <div
      style={{
        width: '260px',
        borderRadius: '10px',
        border: nodeData.selected ? `2px solid ${nodeData.color}` : '1px solid var(--border-dark)',
        background: 'var(--bg-card)',
        padding: '10px 12px',
        boxShadow: nodeData.selected ? `0 0 0 3px ${nodeData.color}22` : '0 2px 8px rgba(15,23,42,0.06)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: nodeData.color, width: 10, height: 10 }} />
      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary-dark)', marginBottom: '2px' }}>
        {nodeData.label}
      </div>
      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary-dark)' }}>
        {nodeData.approverName} | min {nodeData.requiredCount} approval{nodeData.requiredCount !== 1 ? 's' : ''}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
          onClick={(e) => {
            e.stopPropagation();
            nodeData.onEdit();
          }}
        >
          Edit
        </button>
        <button
          type="button"
          style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            nodeData.onDelete();
          }}
        >
          Del
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: nodeData.color, width: 10, height: 10 }} />
    </div>
  );
};

const nodeTypes = { stageNode: StageFlowNode };

const buildDefaultPositions = (stages: FormStage[]): Record<string, { x: number; y: number }> => {
  const byParent = new Map<string, FormStage[]>();
  const rootKey = '__root__';

  for (const stage of stages) {
    const key = stage.parentStageId ?? rootKey;
    byParent.set(key, [...(byParent.get(key) ?? []), stage]);
  }

  for (const [key, rows] of byParent.entries()) {
    byParent.set(key, [...rows].sort((a, b) => a.stageOrder - b.stageOrder));
  }

  const positions: Record<string, { x: number; y: number }> = {};
  const levelOffsets: Record<number, number> = {};

  const walk = (parentId: string | undefined, depth: number) => {
    const key = parentId ?? rootKey;
    const children = byParent.get(key) ?? [];
    for (const child of children) {
      const offset = levelOffsets[depth] ?? 0;
      positions[child.id] = {
        x: offset * 320,
        y: depth * 180,
      };
      levelOffsets[depth] = offset + 1;
      walk(child.id, depth + 1);
    }
  };

  walk(undefined, 0);
  return positions;
};

const wouldCreateCycle = (stages: FormStage[], stageId: string, nextParentId?: string): boolean => {
  if (!nextParentId) return false;
  const byId = new Map<string, FormStage>();
  stages.forEach((stage) => byId.set(stage.id, stage));

  let cur: string | undefined = nextParentId;
  while (cur) {
    if (cur === stageId) return true;
    cur = byId.get(cur)?.parentStageId;
  }
  return false;
};

// ── Main page ──────────────────────────────────────────────────────────────

export const ApprovalWorkflowFormPage: React.FC<ApprovalWorkflowFormPageProps> = ({
  editingWorkflow,
  onBack,
  onSaved,
}) => {
  const { addToast } = useToast();

  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinitionApi[]>([]);
  const [approvalModes, setApprovalModes] = useState<EnumValueApi[]>([]);

  const [fCode, setFCode] = useState('');
  const [fName, setFName] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fMode, setFMode] = useState<ApprovalWorkflowMode>('sequential');
  const [isSaving, setIsSaving] = useState(false);

  const [draftStages, setDraftStages] = useState<DraftStage[]>([]);
  const [editingStages, setEditingStages] = useState<FormStage[]>([]);

  const [sfEditingId, setSfEditingId] = useState<string | null>(null);
  const [sfLabel, setSfLabel] = useState('');
  const [sfRoleDefinitionIds, setSfRoleDefinitionIds] = useState<string[]>([]);
  const [sfParentStageId, setSfParentStageId] = useState('');
  const [sfRequiredCount, setSfRequiredCount] = useState('1');
  const [isSavingStage, setIsSavingStage] = useState(false);

  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<Node<StageNodeData>>([]);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState<Edge>([]);

  const editingId = editingWorkflow?.id ?? null;

  const resetStageForm = () => {
    setSfEditingId(null);
    setSfLabel('');
    setSfRoleDefinitionIds([]);
    setSfParentStageId('');
    setSfRequiredCount('1');
  };

  useEffect(() => {
    backendApi.listRoleDefinitions({ pageSize: 500, active: true }).then((rows) => setRoleDefinitions(rows.items)).catch(() => {});
    backendApi.listEnumValues('approval_mode', true)
      .then((rows) => setApprovalModes(rows.filter((r) => r.enumType === 'approval_mode')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!approvalModes.length) return;
    setFMode((prev) => approvalModes.some((m) => m.value === prev) ? prev : approvalModes[0].value as ApprovalWorkflowMode);
  }, [approvalModes]);

  useEffect(() => {
    setFCode(editingWorkflow?.code ?? '');
    setFName(editingWorkflow?.name ?? '');
    setFDescription(editingWorkflow?.description ?? '');
    setFMode(editingWorkflow?.approvalMode ?? (approvalModes[0]?.value as ApprovalWorkflowMode) ?? 'sequential');
    setDraftStages([]);
    setEditingStages(
      editingWorkflow
        ? [...editingWorkflow.stages].sort((a, b) => a.stageOrder - b.stageOrder).map((s) => ({
            id: s.id, stageOrder: s.stageOrder, label: s.label,
            approverPermissionSetId: s.approverPermissionSetId,
            approverRoleDefinitionIds: s.approverRoleDefinitionIds,
            parentStageId: s.parentStageId, requiredCount: s.requiredCount,
          }))
        : [],
    );
    resetStageForm();
  }, [editingWorkflow, approvalModes]);

  const loadEditingStages = async (workflowId: string) => {
    const rows = await backendApi.listApprovalWorkflowStages(workflowId);
    setEditingStages(
      [...rows].sort((a, b) => a.stageOrder - b.stageOrder).map((s) => ({
        id: s.id, stageOrder: s.stageOrder, label: s.label,
        approverPermissionSetId: s.approverPermissionSetId,
        approverRoleDefinitionIds: s.approverRoleDefinitionIds,
        parentStageId: s.parentStageId, requiredCount: s.requiredCount,
      })),
    );
  };

  const roleDefinitionById = useMemo(() => {
    const m = new Map<string, RoleDefinitionApi>();
    roleDefinitions.forEach((p) => m.set(p.id, p));
    return m;
  }, [roleDefinitions]);

  const formStages: FormStage[] = useMemo(() => {
    if (!editingId) {
      return draftStages.map((d) => ({
        id: d._tempId, stageOrder: d.stageOrder, label: d.label,
        approverPermissionSetId: d.approverPermissionSetId,
        approverRoleDefinitionIds: d.approverRoleDefinitionIds,
        parentStageId: d.parentStageId, requiredCount: d.requiredCount,
      }));
    }
    return editingStages;
  }, [editingId, draftStages, editingStages]);

  const rootStages = useMemo(
    () => formStages.filter((s) => !s.parentStageId).sort((a, b) => a.stageOrder - b.stageOrder),
    [formStages],
  );

  const modeMeta = MODE_META[fMode] ?? { label: fMode, description: 'Mode configured from enum values.', color: '#0ea5e9' };

  const stageDepthById = useMemo(() => {
    const byId = new Map<string, FormStage>();
    formStages.forEach((s) => byId.set(s.id, s));
    const memo = new Map<string, number>();
    const depthOf = (id: string): number => {
      if (memo.has(id)) return memo.get(id)!;
      const s = byId.get(id);
      if (!s?.parentStageId) { memo.set(id, 0); return 0; }
      const d = depthOf(s.parentStageId) + 1;
      memo.set(id, d);
      return d;
    };
    formStages.forEach((s) => depthOf(s.id));
    return memo;
  }, [formStages]);

  useEffect(() => {
    const defaultPositions = buildDefaultPositions(formStages);
    const prevById = new Map(flowNodes.map((node) => [node.id, node]));

    const nodes: Node<StageNodeData>[] = formStages.map((stage) => {
      const prev = prevById.get(stage.id);
      const roleNames = (stage.approverRoleDefinitionIds ?? [])
        .map((id) => roleDefinitionById.get(id)?.name ?? id)
        .filter((name) => name.length > 0);
      const approverName = roleNames.length
        ? roleNames.join(', ')
        : (stage.approverPermissionSetId ? `Legacy Permission Set: ${stage.approverPermissionSetId}` : 'No role definitions selected');
      return {
        id: stage.id,
        type: 'stageNode',
        position: prev?.position ?? defaultPositions[stage.id] ?? { x: 0, y: 0 },
        draggable: true,
        data: {
          label: stage.label,
          approverName,
          requiredCount: stage.requiredCount,
          color: modeMeta.color,
          selected: sfEditingId === stage.id,
          onEdit: () => startEditStage(stage),
          onDelete: () => {
            void handleDeleteStage(stage.id);
          },
        },
      };
    });

    const edges: Edge[] = formStages
      .filter((stage) => stage.parentStageId)
      .map((stage) => ({
        id: `${stage.parentStageId}->${stage.id}`,
        source: stage.parentStageId as string,
        target: stage.id,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: modeMeta.color,
          width: 20,
          height: 20,
        },
        style: {
          stroke: modeMeta.color,
          strokeWidth: 2,
        },
        type: 'smoothstep',
      }));

    setFlowNodes(nodes);
    setFlowEdges(edges);
  }, [formStages, roleDefinitionById, sfEditingId, modeMeta.color]);

  // ── Stage form ──────────────────────────────────────────────────────────

  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = fCode.trim().toUpperCase().replace(/\s+/g, '_');
    const cleanName = fName.trim();
    if ((!cleanCode && !editingId) || !cleanName) { addToast('Code and Name are required.', 'warning'); return; }
    setIsSaving(true);
    try {
      if (editingId) {
        await backendApi.updateApprovalWorkflowDefinition(editingId, {
          name: cleanName, description: fDescription.trim() || undefined, approvalMode: fMode,
        });
        addToast('Workflow updated.', 'success');
      } else {
        await backendApi.createApprovalWorkflowDefinition({
          code: cleanCode, name: cleanName, description: fDescription.trim() || undefined,
          approvalMode: fMode,
          stages: draftStages.map((d) => ({
            label: d.label,
            approverPermissionSetId: d.approverPermissionSetId,
            approverRoleDefinitionIds: d.approverRoleDefinitionIds,
            parentStageId: d.parentStageId, requiredCount: d.requiredCount,
          })),
        });
        addToast('Workflow created.', 'success');
      }
      onSaved();
    } catch (err) {
      addToast(toUiError(err, 'Failed to save workflow.'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sfLabel.trim()) { addToast('Stage label is required.', 'warning'); return; }
    if (!sfRoleDefinitionIds.length) { addToast('Select at least one role definition for this stage.', 'warning'); return; }
    if (sfParentStageId && sfParentStageId === sfEditingId) { addToast('A stage cannot be its own parent.', 'warning'); return; }
    const reqCount = Math.max(1, parseInt(sfRequiredCount, 10) || 1);

    if (!editingId) {
      if (sfEditingId) {
        setDraftStages((prev) =>
          prev.map((d) => d._tempId === sfEditingId
            ? { ...d, label: sfLabel.trim(), approverRoleDefinitionIds: sfRoleDefinitionIds, parentStageId: sfParentStageId || undefined, requiredCount: reqCount }
            : d,
          ),
        );
      } else {
        setDraftStages((prev) => [...prev, {
          _tempId: newDraftId(), label: sfLabel.trim(),
          approverRoleDefinitionIds: sfRoleDefinitionIds,
          parentStageId: sfParentStageId || undefined,
          requiredCount: reqCount,
          stageOrder: prev.length + 1,
        }]);
      }
      resetStageForm(); return;
    }

    setIsSavingStage(true);
    try {
      if (sfEditingId) {
        await backendApi.updateApprovalWorkflowStage(editingId, sfEditingId, {
          label: sfLabel.trim(), approverRoleDefinitionIds: sfRoleDefinitionIds,
          parentStageId: sfParentStageId || undefined, requiredCount: reqCount,
        });
        addToast('Stage updated.', 'success');
      } else {
        await backendApi.addApprovalWorkflowStage(editingId, {
          label: sfLabel.trim(), approverRoleDefinitionIds: sfRoleDefinitionIds,
          parentStageId: sfParentStageId || undefined, requiredCount: reqCount,
        });
        addToast('Stage added.', 'success');
      }
      resetStageForm();
      await loadEditingStages(editingId);
    } catch (err) {
      addToast(toUiError(err, 'Failed to save stage.'), 'error');
    } finally {
      setIsSavingStage(false);
    }
  };

  const startEditStage = (stage: FormStage) => {
    setSfEditingId(stage.id);
    setSfLabel(stage.label);
    setSfRoleDefinitionIds(stage.approverRoleDefinitionIds ?? []);
    setSfParentStageId(stage.parentStageId ?? '');
    setSfRequiredCount(String(stage.requiredCount));
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!editingId) { setDraftStages((prev) => prev.filter((d) => d._tempId !== stageId)); return; }
    try {
      await backendApi.deleteApprovalWorkflowStage(editingId, stageId);
      addToast('Stage removed.', 'success');
      await loadEditingStages(editingId);
    } catch (err) {
      addToast(toUiError(err, 'Failed to remove stage.'), 'error');
    }
  };

  const handleConnect = async (params: Connection) => {
    if (!params.source || !params.target) return;
    if (params.source === params.target) {
      addToast('A stage cannot connect to itself.', 'warning');
      return;
    }

    const target = formStages.find((stage) => stage.id === params.target);
    if (!target) return;

    if (wouldCreateCycle(formStages, target.id, params.source)) {
      addToast('This connection creates a cycle, which is not allowed.', 'warning');
      return;
    }

    const nextSiblingCount = formStages.filter((stage) => stage.parentStageId === params.source && stage.id !== target.id).length;
    const nextOrder = nextSiblingCount + 1;

    if (!editingId) {
      setDraftStages((prev) =>
        prev.map((stage) =>
          stage._tempId === target.id
            ? {
                ...stage,
                parentStageId: params.source,
                stageOrder: nextOrder,
              }
            : stage,
        ),
      );
      addToast('Parent stage updated from connector.', 'success');
      return;
    }

    try {
      await backendApi.updateApprovalWorkflowStage(editingId, target.id, {
        parentStageId: params.source,
        stageOrder: nextOrder,
      });
      await loadEditingStages(editingId);
      addToast('Connection updated successfully.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to connect stages.'), 'error');
    }
  };

  const applySiblingOrderFromCanvas = async (stageId: string) => {
    const moved = formStages.find((stage) => stage.id === stageId);
    if (!moved) return;
    const parentId = moved.parentStageId;

    const siblingIds = formStages
      .filter((stage) => stage.parentStageId === parentId)
      .map((stage) => stage.id);

    const nodeY = new Map(flowNodes.map((node) => [node.id, node.position.y]));
    const orderedSiblingIds = [...siblingIds].sort((a, b) => (nodeY.get(a) ?? 0) - (nodeY.get(b) ?? 0));
    const newOrder = orderedSiblingIds.indexOf(stageId) + 1;
    if (newOrder <= 0 || newOrder === moved.stageOrder) return;

    if (!editingId) {
      setDraftStages((prev) => prev.map((stage) =>
        stage._tempId === stageId
          ? { ...stage, stageOrder: newOrder }
          : stage,
      ));
      return;
    }

    try {
      await backendApi.updateApprovalWorkflowStage(editingId, stageId, {
        stageOrder: newOrder,
      });
      await loadEditingStages(editingId);
    } catch (err) {
      addToast(toUiError(err, 'Failed to persist stage order.'), 'error');
    }
  };

  const handleNodeDragStop = async (_event: React.MouseEvent, node: Node<StageNodeData>) => {
    await applySiblingOrderFromCanvas(node.id);
  };

  const handleNodeClick = (_event: React.MouseEvent, node: Node<StageNodeData>) => {
    const stage = formStages.find((item) => item.id === node.id);
    if (stage) startEditStage(stage);
  };

  const makeCurrentStageRoot = async () => {
    if (!sfEditingId) return;

    if (!editingId) {
      setDraftStages((prev) => prev.map((stage) =>
        stage._tempId === sfEditingId
          ? { ...stage, parentStageId: undefined, stageOrder: rootStages.length + 1 }
          : stage,
      ));
      setSfParentStageId('');
      return;
    }

    try {
      await backendApi.updateApprovalWorkflowStage(editingId, sfEditingId, {
        parentStageId: undefined,
      });
      await loadEditingStages(editingId);
      setSfParentStageId('');
      addToast('Stage moved to root level.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to move stage to root.'), 'error');
    }
  };

  const autoLayoutCanvas = () => {
    const defaults = buildDefaultPositions(formStages);
    setFlowNodes((prev) => prev.map((node) => ({ ...node, position: defaults[node.id] ?? node.position })));
  };

  const reconnectStageToRoot = async (edge: Edge) => {
    const targetId = edge.target;
    if (!targetId) return;

    if (!editingId) {
      setDraftStages((prev) => prev.map((stage) =>
        stage._tempId === targetId
          ? { ...stage, parentStageId: undefined, stageOrder: rootStages.length + 1 }
          : stage,
      ));
      return;
    }

    try {
      await backendApi.updateApprovalWorkflowStage(editingId, targetId, {
        parentStageId: undefined,
      });
      await loadEditingStages(editingId);
      addToast('Connection removed and node promoted to root.', 'success');
    } catch (err) {
      addToast(toUiError(err, 'Failed to remove connection.'), 'error');
    }
  };

  const handleEdgeClick = (_event: React.MouseEvent, edge: Edge) => {
    void reconnectStageToRoot(edge);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="animate-slide-up">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            ✅ {editingId ? 'Edit Approval Workflow' : 'New Approval Workflow'}
          </h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', margin: '4px 0 0' }}>
            Configure workflow details and design approval flow visually with node connectors.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-md" onClick={onBack}>Back to List</button>
      </div>

      {/* Workflow details */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', borderLeft: '3px solid var(--primary)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary-dark)', marginBottom: '18px' }}>
          Workflow Details
        </div>
        <form onSubmit={(e) => void handleSaveWorkflow(e)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="form-label">Code {!editingId && <span style={{ color: 'var(--error)' }}>*</span>}</label>
              <input className="form-input" placeholder="e.g. MEMBERSHIP_CHANGE"
                value={fCode} onChange={(e) => setFCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                disabled={!!editingId} required={!editingId} />
            </div>
            <div>
              <label className="form-label">Name <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="form-input" placeholder="e.g. Membership Approval"
                value={fName} onChange={(e) => setFName(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Approval Mode <span style={{ color: 'var(--error)' }}>*</span></label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(approvalModes.length ? approvalModes : [
                { id: 'fb-seq', enumType: 'approval_mode', value: 'sequential', label: 'Sequential', sortOrder: 10, active: true, createdAt: '', updatedAt: '' },
                { id: 'fb-par', enumType: 'approval_mode', value: 'parallel', label: 'Parallel', sortOrder: 20, active: true, createdAt: '', updatedAt: '' },
              ]).map((modeOption) => {
                const mode = modeOption.value as ApprovalWorkflowMode;
                const meta = MODE_META[mode] ?? { label: modeOption.label, description: 'Configured via enum values.', color: '#0ea5e9' };
                const selected = fMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    className={`page-size-pill${selected ? ' is-active' : ''}`}
                    onClick={() => setFMode(mode)}
                    aria-pressed={selected}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
              {modeMeta.description}
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="What does this workflow govern?"
              value={fDescription} onChange={(e) => setFDescription(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-md" onClick={onBack}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-md" disabled={isSaving}>
              {isSaving ? (editingId ? 'Updating…' : 'Creating…') : editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>

      {/* Visual Builder */}
      <div className="glass-panel" style={{ padding: '24px', borderLeft: `3px solid ${modeMeta.color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary-dark)' }}>
            Approval Flow Designer
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: modeMeta.color, border: `1px solid ${modeMeta.color}`, borderRadius: '5px', padding: '2px 8px' }}>
            {modeMeta.label}
          </span>
          {formStages.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>
              {formStages.length} stage{formStages.length !== 1 ? 's' : ''} | drag node to reorder
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', alignItems: 'start' }}>

          {/* Left — add / edit stage form */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: '10px', padding: '18px', position: 'sticky', top: '20px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: modeMeta.color, marginBottom: '14px' }}>
              {sfEditingId ? 'Edit Stage' : `Add Stage ${formStages.length + 1}`}
            </div>
            <form onSubmit={(e) => void handleSaveStage(e)}>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Stage Label *</label>
                <input className="form-input" placeholder="e.g. Zone Treasurer Review"
                  value={sfLabel} onChange={(e) => setSfLabel(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Approver Role Definitions *</label>
                <select
                  className="form-input"
                  value={sfRoleDefinitionIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((option) => option.value);
                    setSfRoleDefinitionIds(selected);
                  }}
                  multiple
                  size={Math.min(Math.max(roleDefinitions.length, 3), 7)}
                  style={{ cursor: 'pointer', minHeight: '126px' }}
                >
                  {roleDefinitions.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} ({role.level})
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-secondary-dark)' }}>
                  Hold Ctrl/Cmd to choose multiple roles.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">Parent Stage</label>
                  <select className="form-input" value={sfParentStageId} onChange={(e) => setSfParentStageId(e.target.value)} style={{ cursor: 'pointer' }}>
                    <option value="">Root Stage</option>
                    {formStages.filter((s) => s.id !== sfEditingId).map((s) => (
                      <option key={s.id} value={s.id}>
                        {'  '.repeat(stageDepthById.get(s.id) ?? 0)}{s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Min Approvals</label>
                  <input className="form-input" type="number" min="1" max="99"
                    value={sfRequiredCount} onChange={(e) => setSfRequiredCount(e.target.value)} />
                </div>
              </div>
              {sfEditingId && (
                <div style={{ marginBottom: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                    onClick={() => {
                      void makeCurrentStageRoot();
                    }}
                  >
                    Move Selected Stage To Root
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                {sfEditingId && (
                  <button type="button" className="btn btn-secondary" onClick={resetStageForm}>Clear</button>
                )}
                <button type="submit" className="btn btn-primary" disabled={isSavingStage}
                  style={{ background: modeMeta.color, borderColor: modeMeta.color }}>
                  {isSavingStage ? (sfEditingId ? 'Updating…' : 'Creating…') : sfEditingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>

          {/* Right — visual canvas */}
          <div>
            {formStages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary-dark)', fontSize: '0.875rem', border: '2px dashed var(--border-dark)', borderRadius: '10px' }}>
                Add your first stage using the form on the left, then connect nodes on the canvas.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={autoLayoutCanvas}>
                    Auto Layout
                  </button>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary-dark)', alignSelf: 'center' }}>
                    Connect bottom handle to top handle to set parent. Click an edge to detach child to root.
                  </span>
                </div>

                <div style={{ height: '620px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-dark)' }}>
                  <ReactFlow
                    nodes={flowNodes}
                    edges={flowEdges}
                    onNodesChange={onFlowNodesChange}
                    onEdgesChange={onFlowEdgesChange}
                    onConnect={(params) => {
                      setFlowEdges((eds) => addEdge(params, eds));
                      void handleConnect(params);
                    }}
                    onNodeDragStop={(event, node) => {
                      void handleNodeDragStop(event, node);
                    }}
                    onNodeClick={handleNodeClick}
                    onEdgeClick={handleEdgeClick}
                    nodeTypes={nodeTypes as Record<string, React.ComponentType<NodeProps>>}
                    fitView
                    fitViewOptions={{ maxZoom: 1.1, padding: 0.2 }}
                    deleteKeyCode={null}
                    nodesConnectable
                    nodesDraggable
                  >
                    <Background gap={24} size={1} color="rgba(15,23,42,0.12)" />
                    <MiniMap
                      style={{ background: 'rgba(248,250,252,0.92)' }}
                      nodeColor={(node) => (node.data.selected ? modeMeta.color : 'rgba(100,116,139,0.55)')}
                      maskColor="rgba(148,163,184,0.22)"
                    />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </div>

                <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-dark)', fontSize: '0.75rem', color: 'var(--text-secondary-dark)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>Drag nodes to reorganize within same parent by vertical position.</span>
                  <span>Click node to edit details in left panel.</span>
                  <span>Click edge to detach and move child to root.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
