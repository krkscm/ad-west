import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { UpdateGoogleIntegrationConfigDto } from '../dto/update-google-integration-config.dto';
import { AdminRole } from '../enums/admin-role.enum';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { GoogleIntegrationConfigService, GoogleIntegrationConfigView } from '../services/google-integration-config.service';

@Controller('settings/google-integration-config')
@UseGuards(AuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN)
export class GoogleIntegrationConfigController {
  constructor(private readonly service: GoogleIntegrationConfigService) {}

  @Get()
  getConfig(): Promise<GoogleIntegrationConfigView> {
    return this.service.getSettingsView();
  }

  @Patch()
  updateConfig(
    @Body() dto: UpdateGoogleIntegrationConfigDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<GoogleIntegrationConfigView> {
    return this.service.update(dto, principal);
  }
}
