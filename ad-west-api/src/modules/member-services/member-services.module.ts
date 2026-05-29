import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import { GatewayAdminAuthGuard } from '@modules/public-gateway/guards/gateway-admin-auth.guard';
import { ReimbursementRequestEntity } from './entities/reimbursement-request.entity';
import { SpecialEventEntity } from './entities/special-event.entity';
import { EventSreniLinkEntity } from './entities/event-sreni-link.entity';
import { EventFormFieldEntity } from './entities/event-form-field.entity';
import { EventRegistrationEntity } from './entities/event-registration.entity';
import { NotificationEntity } from './entities/notification.entity';
import { MemberServicesService } from './member-services.service';
import {
  NotificationsAdminController,
  PublicEventsController,
  ReimbursementController,
  SpecialEventsAdminController,
} from './member-services.controller';

@Module({})
export class MemberServicesModule {
  static register(useDbPersistence: boolean): DynamicModule {
    const entities = [
      ReimbursementRequestEntity,
      SpecialEventEntity,
      EventSreniLinkEntity,
      EventFormFieldEntity,
      EventRegistrationEntity,
      NotificationEntity,
    ];

    return {
      module: MemberServicesModule,
      imports: useDbPersistence ? [TypeOrmModule.forFeature(entities)] : [],
      controllers: [
        ReimbursementController,
        SpecialEventsAdminController,
        NotificationsAdminController,
        PublicEventsController,
      ],
      providers: [CryptoService, GatewayAdminAuthGuard, MemberServicesService],
    };
  }
}
