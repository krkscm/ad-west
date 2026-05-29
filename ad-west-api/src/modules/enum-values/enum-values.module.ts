import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserManagementModule } from '@modules/user-management/user-management.module';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import { EnumValueEntity } from './entities/enum-value.entity';
import { EnumValuesService } from './services/enum-values.service';
import { EnumValuesController } from './controllers/enum-values.controller';

@Module({})
export class EnumValuesModule {
  static register(useDbPersistence: boolean): DynamicModule {
    return {
      module: EnumValuesModule,
      imports: [
        UserManagementModule.register(useDbPersistence),
        ...(useDbPersistence ? [TypeOrmModule.forFeature([EnumValueEntity])] : []),
      ],
      controllers: [EnumValuesController],
      providers: [
        CryptoService,
        EnumValuesService,
      ],
    };
  }
}
