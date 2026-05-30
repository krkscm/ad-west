import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import {
  AdminHelpdeskController,
  AdminJobsController,
  PublicHelpdeskController,
  PublicJobsController,
  PublicSreniContactsController,
} from './controllers/public-gateway.controller';
import { HelpdeskTicketEntity } from './entities/helpdesk-ticket.entity';
import { JobApplicationEntity } from './entities/job-application.entity';
import { JobPostingEntity } from './entities/job-posting.entity';
import { GatewayAdminAuthGuard } from './guards/gateway-admin-auth.guard';
import { PublicGatewayService } from './public-gateway.service';

@Module({})
export class PublicGatewayModule {
  static register(useDbPersistence: boolean): DynamicModule {
    const entities = [HelpdeskTicketEntity, JobPostingEntity, JobApplicationEntity];

    return {
      module: PublicGatewayModule,
      imports: useDbPersistence ? [TypeOrmModule.forFeature(entities)] : [],
      controllers: [
        PublicHelpdeskController,
        PublicSreniContactsController,
        AdminHelpdeskController,
        PublicJobsController,
        AdminJobsController,
      ],
      providers: [CryptoService, GatewayAdminAuthGuard, PublicGatewayService],
    };
  }
}
