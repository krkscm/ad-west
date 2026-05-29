import { config as loadEnv } from 'dotenv';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from '@modules/health/health.module';
import { CoreBusinessModule } from '@modules/core-business/core-business.module';
import { UserManagementModule } from '@modules/user-management/user-management.module';
import { ApprovalWorkflowDefinitionsModule } from '@modules/approval-workflow-definitions/approval-workflow-definitions.module';
import { EnumValuesModule } from '@modules/enum-values/enum-values.module';
import { PublicGatewayModule } from '@modules/public-gateway/public-gateway.module';
import { MemberServicesModule } from '@modules/member-services/member-services.module';
import { AppControllerModule } from './app.controller.module';

loadEnv({ path: '.env.local' });

const useDbPersistence = process.env.ENABLE_DB_PERSISTENCE === 'true';

if (process.env.NODE_ENV === 'production' && !useDbPersistence) {
  throw new Error('ENABLE_DB_PERSISTENCE=true is required in production mode');
}

function createTypeOrmModule() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required when ENABLE_DB_PERSISTENCE=true');
  }

  const parsed = new URL(databaseUrl);

  return TypeOrmModule.forRoot({
    type: 'postgres',
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    synchronize: false,
    autoLoadEntities: true,
    ssl: false,
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: Number(process.env.THROTTLE_DEFAULT_TTL_MS || 60000),
          limit: Number(process.env.THROTTLE_DEFAULT_LIMIT || 240),
        },
      ],
    }),
    ...(useDbPersistence ? [createTypeOrmModule()] : []),
    AppControllerModule,
    HealthModule,
    CoreBusinessModule.register(useDbPersistence),
    UserManagementModule.register(useDbPersistence),
    ApprovalWorkflowDefinitionsModule.register(useDbPersistence),
    EnumValuesModule.register(useDbPersistence),
    PublicGatewayModule.register(useDbPersistence),
    MemberServicesModule.register(useDbPersistence),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

