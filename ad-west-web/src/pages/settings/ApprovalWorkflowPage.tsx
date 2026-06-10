import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { PaginationBar } from '../../components/common/PaginationBar';
import { EmptyState } from '../../components/common/EmptyState';
import { TableRowActionsMenu } from '../../components/common/TableRowActionsMenu';
import {
  ApprovalWorkflowDefinitionApi,
  RoleDefinitionApi,
  backendApi,
} from '../../utils/backendApi';

const toUiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) return fallback;
  const match = error.message.match(/^API error \(\d+\):\s*(.*)$/i);
  if (match?.[1]) return match[1];
  return error.message || fallback;
};

const MODE_META: Record<string, { label: string; color: string }> = {
  sequential: {
    label: 'Sequential',
    color: 'var(--primary)',
  },
  parallel: {
    label: 'Parallel',
    color: '#0ea5e9',
  },
};

interface ApprovalWorkflowPageProps {
  onAdd: () => void;
  onEdit: (workflow: ApprovalWorkflowDefinitionApi) => void;
  editingWorkflowId?: string | null;
}

export const ApprovalWorkflowPage: React.FC<ApprovalWorkflowPageProps> = ({
  onAdd,
  onEdit,
  editingWorkflowId,
}) => {
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [items, setItems] = useState<ApprovalWorkflowDefinitionApi[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinitionApi[]>([]);
  const loadWorkflows = (p: number, ps: number, q: string) => {
    setIsLoading(true);
    backendApi
      .listApprovalWorkflowDefinitions({ page: p, pageSize: ps, search: q })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => addToast(toUiError(err, 'Failed to load workflows.'), 'error'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    backendApi.listRoleDefinitions({ pageSize: 500, active: true }).then((res) => setRoleDefinitions(res.items)).catch(() => {});
  }, []);

  useEffect(() => {
    loadWorkflows(page, pageSize, search);
  }, [page, pageSize]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadWorkflows(1, pageSize, q);
    }, 400);
  };

  const roleDefinitionById = useMemo(() => {
    const m = new Map<string, RoleDefinitionApi>();
    roleDefinitions.forEach((r) => m.set(r.id, r));
    return m;
  }, [roleDefinitions]);

  const handleToggleActive = async (w: ApprovalWorkflowDefinitionApi) => {
    try {
      await backendApi.updateApprovalWorkflowDefinitionStatus(w.id, !w.isActive);
      addToast(`Workflow ${w.isActive ? 'deactivated' : 'activated'}.`, 'success');
      loadWorkflows(page, pageSize, search);
    } catch (err) {
      addToast(toUiError(err, 'Failed to update status.'), 'error');
    }
  };

  const handleDeleteWorkflow = async (w: ApprovalWorkflowDefinitionApi) => {
    const ok = await confirm({
      title: 'Delete Workflow',
      message: `Delete "${w.name}" (${w.code})? All stages will be removed.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    try {
      await backendApi.deleteApprovalWorkflowDefinition(w.id);
      addToast('Workflow deleted.', 'success');
      const newPage = items.length === 1 && page > 1 ? page - 1 : page;
      setPage(newPage);
      loadWorkflows(newPage, pageSize, search);
    } catch (err) {
      addToast(toUiError(err, 'Failed to delete workflow.'), 'error');
    }
  };

  const handleEvaluateCoverage = async (w: ApprovalWorkflowDefinitionApi) => {
    try {
      const report = await backendApi.evaluateApprovalWorkflowCoverage(w.id);
      const blocked = report.stages.filter((stage) => !stage.satisfiable);
      if (!blocked.length) {
        addToast('Coverage check passed. All stages have sufficient eligible role approvers.', 'success');
        return;
      }
      const preview = blocked.slice(0, 3).map((stage) => stage.stageLabel).join(', ');
      addToast(`Coverage gaps in ${blocked.length} stage(s): ${preview}${blocked.length > 3 ? ', ...' : ''}`, 'warning');
    } catch (err) {
      addToast(toUiError(err, 'Failed to evaluate workflow coverage.'), 'error');
    }
  };

  const hasTable = !isLoading && items.length > 0;

  return (
    <div className="animate-slide-up">
      <PageHeader
        icon="✅"
        title="Approval Workflows"
        subtitle="Define named approval chains with organization-chart style permission-set mapping."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
            New Workflow
          </button>
        }
      />

      <div className={`glass-panel list-toolbar${hasTable ? ' list-toolbar--fused' : ''}`} style={{ marginBottom: hasTable ? 0 : '16px' }}>
        <div className="list-toolbar__search">
          <input className="form-input" placeholder="Search code or name..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        {search && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); loadWorkflows(1, pageSize, ''); }}>
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="glass-panel loading-state">Loading workflows…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title={search ? 'No workflows match your search' : 'No approval workflows defined yet'}
          copy={search ? 'Try a different search term.' : 'Click "New Workflow" to add one.'}
        />
      ) : (
      <div className="table-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, boxShadow: 'none' }}>
        <table className="custom-table">
          <thead>
            <tr>
              {['Code', 'Name', 'Mode', 'Stages', 'Status', 'Actions'].map((col) => (
                <th key={col} style={{ textAlign: col === 'Stages' ? 'center' : 'left' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((w) => {
                const sortedStages = [...w.stages].sort((a, b) => a.stageOrder - b.stageOrder);
                const wModeMeta = MODE_META[w.approvalMode] ?? { label: w.approvalMode, description: 'Configured via enum values.', color: '#0ea5e9' };
                const isBeingEdited = editingWorkflowId === w.id;
                return (
                  <tr key={w.id} style={{ opacity: w.isActive ? 1 : 0.55, background: isBeingEdited ? 'rgba(99,102,241,0.04)' : undefined }}>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, background: 'var(--chip-bg-soft)', color: 'var(--text-primary-dark)', padding: '3px 8px', borderRadius: '5px' }}>{w.code}</code>
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                      {w.name}
                      {w.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', marginTop: '2px', fontWeight: 400 }}>{w.description}</div>}
                    </td>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: wModeMeta.color, border: `1px solid ${wModeMeta.color}`, borderRadius: '6px', padding: '3px 10px' }}>{wModeMeta.label}</span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      {sortedStages.length === 0 ? (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>No stages</span>
                      ) : (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          {sortedStages.map((s, idx) => {
                            const roleNames = (s.approverRoleDefinitionIds ?? [])
                              .map((roleId) => roleDefinitionById.get(roleId)?.name ?? roleId)
                              .filter((name) => name.length > 0);
                            const approverSummary = roleNames.length
                              ? roleNames.join(', ')
                              : (s.approverPermissionSetId ? `Legacy ${s.approverPermissionSetId}` : s.label);
                            return (
                              <span key={s.id} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary-dark)', whiteSpace: 'nowrap' }}>
                                {idx + 1}. {approverSummary}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: w.isActive ? 'var(--success)' : 'var(--error)' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: w.isActive ? 'var(--success)' : 'var(--error)', display: 'inline-block' }} />
                        {w.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', verticalAlign: 'middle', width: '56px' }}>
                      <TableRowActionsMenu
                        ariaLabel={`Actions for ${w.name}`}
                        actions={[
                          { label: isBeingEdited ? 'Editing…' : 'Edit', onClick: () => onEdit(w), disabled: isBeingEdited },
                          { label: w.isActive ? 'Deactivate' : 'Activate', tone: w.isActive ? 'warning' : 'success', onClick: () => void handleToggleActive(w) },
                          { label: 'Coverage', onClick: () => void handleEvaluateCoverage(w) },
                          { label: 'Delete', tone: 'danger', onClick: () => void handleDeleteWorkflow(w) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
        />
      </div>
      )}
    </div>
  );
};
