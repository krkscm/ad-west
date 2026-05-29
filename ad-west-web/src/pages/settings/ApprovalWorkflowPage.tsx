import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
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
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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

  const pageNums = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page - 1, page, page + 1, '…', totalPages];
  })();

  return (
    <div className="animate-slide-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Approval Workflows</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.875rem', margin: '4px 0 0' }}>
            Define named approval chains with organization-chart style permission-set mapping.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '16px', paddingRight: '16px' }}
          onClick={onAdd}
        >
          New Workflow
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: '1px solid var(--border-dark)' }}>
        <div style={{ flex: '1 1 200px', position: 'relative', maxWidth: '300px' }}>
          <input className="form-input" style={{ marginBottom: 0, fontSize: '0.875rem' }} placeholder="Search code or name..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        {search && (
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => { setSearch(''); loadWorkflows(1, pageSize, ''); }}>
            Clear
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary-dark)' }}>Rows:</span>
          {[10, 20, 50].map((ps) => (
            <button key={ps} type="button" onClick={() => { setPageSize(ps); setPage(1); }} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid', minWidth: '34px', borderColor: pageSize === ps ? 'var(--primary)' : 'var(--border-dark)', background: pageSize === ps ? 'var(--primary)' : 'transparent', color: pageSize === ps ? '#fff' : 'var(--text-secondary-dark)', fontSize: '0.78rem', fontWeight: pageSize === ps ? 700 : 400, cursor: 'pointer' }}>
              {ps}
            </button>
          ))}
        </div>
      </div>

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
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-dark)' }}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} style={{ padding: '13px 20px' }}>
                      <div style={{ height: '14px', borderRadius: '6px', background: 'var(--border-dark)', width: j === 5 ? '120px' : '80%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary-dark)' }}>
                  {search ? 'No workflows match your search.' : 'No approval workflows defined yet. Click New Workflow to add one.'}
                </td>
              </tr>
            ) : (
              items.map((w) => {
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
                    <td style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => onEdit(w)}>
                          {isBeingEdited ? 'Editing...' : 'Edit'}
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: w.isActive ? 'var(--error)' : 'var(--success)' }} onClick={() => void handleToggleActive(w)}>
                          {w.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => void handleEvaluateCoverage(w)}>
                          Coverage
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', color: 'var(--error)' }} onClick={() => void handleDeleteWorkflow(w)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '14px 18px', borderTop: '1px solid var(--border-dark)' }}>
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-dark)', background: 'transparent', color: page === 1 ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: '0.82rem' }}>
            Prev
          </button>
          {pageNums.map((n, i) => (
            <button key={i} type="button" onClick={() => typeof n === 'number' && setPage(n)} disabled={n === '…'} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid', minWidth: '34px', borderColor: n === page ? 'var(--primary)' : 'var(--border-dark)', background: n === page ? 'var(--primary)' : 'transparent', color: n === page ? '#fff' : 'var(--text-primary-dark)', fontWeight: n === page ? 700 : 400, cursor: n === '…' ? 'default' : 'pointer', fontSize: '0.82rem' }}>
              {n}
            </button>
          ))}
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-dark)', background: 'transparent', color: page === totalPages ? 'var(--text-secondary-dark)' : 'var(--text-primary-dark)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: '0.82rem' }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};
