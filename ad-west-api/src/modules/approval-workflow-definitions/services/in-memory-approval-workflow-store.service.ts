import { Injectable } from '@nestjs/common';
import { ApprovalWorkflowDefinition } from '../interfaces/approval-workflow.interface';
import { ApprovalWorkflowStore } from '../interfaces/approval-workflow-store.interface';

@Injectable()
export class InMemoryApprovalWorkflowStoreService implements ApprovalWorkflowStore {
  private readonly workflows = new Map<string, ApprovalWorkflowDefinition>();

  async list(): Promise<ApprovalWorkflowDefinition[]> {
    return [...this.workflows.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string): Promise<ApprovalWorkflowDefinition | undefined> {
    return this.workflows.get(id);
  }

  async findByCode(code: string): Promise<ApprovalWorkflowDefinition | undefined> {
    const normalized = code.trim().toUpperCase();
    return [...this.workflows.values()].find((w) => w.code.toUpperCase() === normalized);
  }

  async create(record: ApprovalWorkflowDefinition): Promise<void> {
    this.workflows.set(record.id, record);
  }

  async save(record: ApprovalWorkflowDefinition): Promise<void> {
    this.workflows.set(record.id, record);
  }

  async delete(id: string): Promise<void> {
    this.workflows.delete(id);
  }
}
