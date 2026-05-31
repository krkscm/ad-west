import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ROLE_DEFINITION_STORE, USER_STORE } from './constants';
import { AuthController } from './controllers/auth.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AuditController } from './controllers/audit.controller';
import { AiChatController } from './controllers/ai-chat.controller';
import { GmailController } from './controllers/gmail.controller';
import { GoogleIntegrationConfigController } from './controllers/google-integration-config.controller';
import { SmtpIntegrationConfigController } from './controllers/smtp-integration-config.controller';
import { MenuManagementController } from './controllers/menu-management.controller';
import { RoleDefinitionsController } from './controllers/role-definitions.controller';
import { AdminMenuGrantEntity } from './entities/admin-menu-grant.entity';
import { AdminUserEntity } from './entities/admin-user.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { MemberUserEntity } from './entities/member-user.entity';
import { MenuItemEntity } from './entities/menu-item.entity';
import { RoleDefinitionEntity } from './entities/role-definition.entity';
import { SessionEntity } from './entities/session.entity';
import { AuthGuard } from './guards/auth.guard';
import { MemberAuthGuard } from './guards/member-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AdminUsersService } from './services/admin-users.service';
import { AuditService } from './services/audit.service';
import { AiChatService } from './services/ai-chat.service';
import { AuthService } from './services/auth.service';
import { CryptoService } from './services/crypto.service';
import { InMemoryRoleDefinitionStoreService } from './services/in-memory-role-definition-store.service';
import { InMemoryStoreService } from './services/in-memory-store.service';
import { GoogleIntegrationConfigService } from './services/google-integration-config.service';
import { SmtpIntegrationConfigService } from './services/smtp-integration-config.service';
import { MailService } from './services/mail.service';
import { ImapService } from './services/imap.service';
import { MenuManagementService } from './services/menu-management.service';
import { PostgresRoleDefinitionStoreService } from './services/postgres-role-definition-store.service';
import { PostgresStoreService } from './services/postgres-store.service';
import { RoleDefinitionsService } from './services/role-definitions.service';

@Module({})
export class UserManagementModule {
  static register(useDbPersistence: boolean): DynamicModule {
    const entities = [
      AdminUserEntity,
      MemberUserEntity,
      SessionEntity,
      AuditLogEntity,
      RoleDefinitionEntity,
      MenuItemEntity,
      AdminMenuGrantEntity,
    ];

    const imports = useDbPersistence ? [TypeOrmModule.forFeature(entities)] : [];

    const providers = [
      CryptoService,
      InMemoryStoreService,
      InMemoryRoleDefinitionStoreService,
      ...(useDbPersistence ? [PostgresStoreService] : []),
      ...(useDbPersistence ? [PostgresRoleDefinitionStoreService] : []),
      {
        provide: USER_STORE,
        useFactory: (
          memoryStore: InMemoryStoreService,
          postgresStore?: PostgresStoreService,
        ) => {
          if (useDbPersistence && postgresStore) {
            return postgresStore;
          }
          return memoryStore;
        },
        inject: useDbPersistence
          ? [InMemoryStoreService, PostgresStoreService]
          : [InMemoryStoreService],
      },
      {
        provide: ROLE_DEFINITION_STORE,
        useFactory: (
          memoryStore: InMemoryRoleDefinitionStoreService,
          postgresStore?: PostgresRoleDefinitionStoreService,
        ) => {
          if (useDbPersistence && postgresStore) {
            return postgresStore;
          }
          return memoryStore;
        },
        inject: useDbPersistence
          ? [InMemoryRoleDefinitionStoreService, PostgresRoleDefinitionStoreService]
          : [InMemoryRoleDefinitionStoreService],
      },
      AuditService,
      AiChatService,
      GoogleIntegrationConfigService,
      SmtpIntegrationConfigService,
      MailService,
      ImapService,
      AuthService,
      AdminUsersService,
      RoleDefinitionsService,
      MenuManagementService,
      AuthGuard,
      MemberAuthGuard,
      RolesGuard,
    ];

    return {
      module: UserManagementModule,
      imports,
      controllers: [AuthController, AdminUsersController, AuditController, AiChatController, GmailController, GoogleIntegrationConfigController, SmtpIntegrationConfigController, RoleDefinitionsController, MenuManagementController],
      providers,
      exports: [USER_STORE, ROLE_DEFINITION_STORE, AuthService, AuthGuard, MemberAuthGuard, RolesGuard],
    };
  }
}
