import { ApprovalWorkflowDefinition } from './approval-workflow.interface';

export interface ApprovalWorkflowStore {
  list(): Promise<ApprovalWorkflowDefinition[]>;
  findById(id: string): Promise<ApprovalWorkflowDefinition | undefined>;
  findByCode(code: string): Promise<ApprovalWorkflowDefinition | undefined>;
  create(record: ApprovalWorkflowDefinition): Promise<void>;
  save(record: ApprovalWorkflowDefinition): Promise<void>;
  delete(id: string): Promise<void>;
}
