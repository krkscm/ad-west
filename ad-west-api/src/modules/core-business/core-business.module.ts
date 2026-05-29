import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from '@modules/user-management/services/crypto.service';
import { CORE_BUSINESS_STORE } from './constants';
import { CoreBusinessController } from './core-business.controller';
import { CoreBusinessService } from './core-business.service';
import { CoreBusinessRuntimeStateEntity } from './entities/core-business-runtime-state.entity';
import { CoreAdminAuthGuard } from './guards/core-admin-auth.guard';
import { CoreMemberAuthGuard } from './guards/core-member-auth.guard';
import { InMemoryCoreBusinessStoreService } from './store/in-memory-core-business-store.service';
import { PostgresCoreBusinessStoreService } from './store/postgres-core-business-store.service';

@Module({
  imports: [],
  controllers: [CoreBusinessController],
  providers: [],
})
export class CoreBusinessModule {
  static register(useDbPersistence: boolean): DynamicModule {
    const imports = useDbPersistence ? [TypeOrmModule.forFeature([CoreBusinessRuntimeStateEntity])] : [];

    const providers = [
      CoreBusinessService,
      CryptoService,
      CoreAdminAuthGuard,
      CoreMemberAuthGuard,
      InMemoryCoreBusinessStoreService,
      ...(useDbPersistence ? [PostgresCoreBusinessStoreService] : []),
      {
        provide: CORE_BUSINESS_STORE,
        useFactory: (
          memoryStore: InMemoryCoreBusinessStoreService,
          postgresStore?: PostgresCoreBusinessStoreService,
        ) => {
          if (useDbPersistence && postgresStore) {
            return postgresStore;
          }

          return memoryStore;
        },
        inject: useDbPersistence
          ? [InMemoryCoreBusinessStoreService, PostgresCoreBusinessStoreService]
          : [InMemoryCoreBusinessStoreService],
      },
    ];

    return {
      module: CoreBusinessModule,
      imports,
      controllers: [CoreBusinessController],
      providers,
      exports: [CORE_BUSINESS_STORE, CoreBusinessService],
    };
  }
}

