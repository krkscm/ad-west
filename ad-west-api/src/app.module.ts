import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from '@modules/health/health.module';
import { AppControllerModule } from './app.controller.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),
    AppControllerModule,
    HealthModule,
  ],
})
export class AppModule {}
