export type ApprovalWorkflowMode = string;

export interface ApprovalWorkflowStage {
  id: string;
  workflowId: string;
  stageOrder: number;
  label: string;
  approverPermissionSetId?: string;
  approverRoleDefinitionIds?: string[];
  parentStageId?: string;
  requiredCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalWorkflowDefinition {
  id: string;
  code: string;
  name: string;
  description?: string;
  approvalMode: ApprovalWorkflowMode;
  isActive: boolean;
  stages: ApprovalWorkflowStage[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}
