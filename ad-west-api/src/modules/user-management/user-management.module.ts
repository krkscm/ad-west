import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_STORE } from './constants';
import { AuthController } from './controllers/auth.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AuditController } from './controllers/audit.controller';
import { AdminUserEntity } from './entities/admin-user.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { MemberUserEntity } from './entities/member-user.entity';
import { OtpRequestEntity } from './entities/otp-request.entity';
import { SessionEntity } from './entities/session.entity';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AdminUsersService } from './services/admin-users.service';
import { AuditService } from './services/audit.service';
import { AuthService } from './services/auth.service';
import { CryptoService } from './services/crypto.service';
import { InMemoryStoreService } from './services/in-memory-store.service';
import { PostgresStoreService } from './services/postgres-store.service';

@Module({})
export class UserManagementModule {
  static register(useDbPersistence: boolean): DynamicModule {
    const entities = [
      AdminUserEntity,
      MemberUserEntity,
      SessionEntity,
      OtpRequestEntity,
      AuditLogEntity,
    ];

    const imports = useDbPersistence ? [TypeOrmModule.forFeature(entities)] : [];

    const providers = [
      CryptoService,
      InMemoryStoreService,
      ...(useDbPersistence ? [PostgresStoreService] : []),
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
      AuditService,
      AuthService,
      AdminUsersService,
      AuthGuard,
      RolesGuard,
    ];

    return {
      module: UserManagementModule,
      imports,
      controllers: [AuthController, AdminUsersController, AuditController],
      providers,
      exports: [USER_STORE],
    };
  }
}
