import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserManagementModule } from '@modules/user-management/user-management.module';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import { APPROVAL_WORKFLOW_STORE } from './constants';
import { ApprovalWorkflowDefinitionsController } from './controllers/approval-workflow-definitions.controller';
import { ApprovalWorkflowDefinitionEntity } from './entities/approval-workflow-definition.entity';
import { InMemoryApprovalWorkflowStoreService } from './services/in-memory-approval-workflow-store.service';
import { PostgresApprovalWorkflowStoreService } from './services/postgres-approval-workflow-store.service';
import { ApprovalWorkflowDefinitionsService } from './services/approval-workflow-definitions.service';

@Module({})
export class ApprovalWorkflowDefinitionsModule {
  static register(useDbPersistence: boolean): DynamicModule {
    const imports: DynamicModule['imports'] = [
      UserManagementModule.register(useDbPersistence),
      ...(useDbPersistence ? [TypeOrmModule.forFeature([ApprovalWorkflowDefinitionEntity])] : []),
    ];

    const providers = [
      CryptoService,
      InMemoryApprovalWorkflowStoreService,
      ...(useDbPersistence ? [PostgresApprovalWorkflowStoreService] : []),
      {
        provide: APPROVAL_WORKFLOW_STORE,
        useFactory: (
          memStore: InMemoryApprovalWorkflowStoreService,
          pgStore?: PostgresApprovalWorkflowStoreService,
        ) => (useDbPersistence && pgStore ? pgStore : memStore),
        inject: useDbPersistence
          ? [InMemoryApprovalWorkflowStoreService, PostgresApprovalWorkflowStoreService]
          : [InMemoryApprovalWorkflowStoreService],
      },
      ApprovalWorkflowDefinitionsService,
    ];

    return {
      module: ApprovalWorkflowDefinitionsModule,
      imports,
      controllers: [ApprovalWorkflowDefinitionsController],
      providers,
    };
  }
}
