import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalWorkflowDefinitionEntity } from '../entities/approval-workflow-definition.entity';
import { ApprovalWorkflowDefinition, ApprovalWorkflowMode, ApprovalWorkflowStage } from '../interfaces/approval-workflow.interface';
import { ApprovalWorkflowStore } from '../interfaces/approval-workflow-store.interface';

@Injectable()
export class PostgresApprovalWorkflowStoreService implements ApprovalWorkflowStore {
  constructor(
    @InjectRepository(ApprovalWorkflowDefinitionEntity)
    private readonly repo: Repository<ApprovalWorkflowDefinitionEntity>,
  ) {}

  async list(): Promise<ApprovalWorkflowDefinition[]> {
    const rows = await this.repo.find({ order: { createdAt: 'DESC' } });
    return rows.map(this.toRecord);
  }

  async findById(id: string): Promise<ApprovalWorkflowDefinition | undefined> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toRecord(row) : undefined;
  }

  async findByCode(code: string): Promise<ApprovalWorkflowDefinition | undefined> {
    const normalized = code.trim().toUpperCase();
    const rows = await this.repo.find();
    const found = rows.find((r) => r.code.toUpperCase() === normalized);
    return found ? this.toRecord(found) : undefined;
  }

  async create(record: ApprovalWorkflowDefinition): Promise<void> {
    await this.repo.insert({
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description,
      approvalMode: record.approvalMode,
      isActive: record.isActive,
      stages: record.stages,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedBy: record.updatedBy,
      updatedAt: record.updatedAt,
    });
  }

  async save(record: ApprovalWorkflowDefinition): Promise<void> {
    await this.repo.save({
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description,
      approvalMode: record.approvalMode,
      isActive: record.isActive,
      stages: record.stages,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedBy: record.updatedBy,
      updatedAt: record.updatedAt,
    });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toRecord(row: ApprovalWorkflowDefinitionEntity): ApprovalWorkflowDefinition {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      approvalMode: (row.approvalMode ?? 'sequential') as ApprovalWorkflowMode,
      isActive: row.isActive,
      stages: (row.stages ?? []) as ApprovalWorkflowStage[],
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  }
}
