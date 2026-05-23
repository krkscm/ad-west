import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from '@modules/health/health.module';
import { UserManagementModule } from '@modules/user-management/user-management.module';
import { AppControllerModule } from './app.controller.module';

const useDbPersistence = process.env.ENABLE_DB_PERSISTENCE === 'true';

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
    ...(useDbPersistence ? [createTypeOrmModule()] : []),
    AppControllerModule,
    HealthModule,
    UserManagementModule.register(useDbPersistence),
  ],
})
export class AppModule {}
