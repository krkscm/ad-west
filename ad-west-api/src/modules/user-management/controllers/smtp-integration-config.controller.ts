import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { UpdateSmtpIntegrationConfigDto } from '../dto/update-smtp-integration-config.dto';
import { AdminRole } from '../enums/admin-role.enum';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { SmtpIntegrationConfigService, SmtpIntegrationConfigView } from '../services/smtp-integration-config.service';

@Controller('settings/smtp-integration-config')
@UseGuards(AuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN)
export class SmtpIntegrationConfigController {
  constructor(private readonly service: SmtpIntegrationConfigService) {}

  @Get()
  getConfig(): Promise<SmtpIntegrationConfigView> {
    return this.service.getSettingsView();
  }

  @Patch()
  updateConfig(
    @Body() dto: UpdateSmtpIntegrationConfigDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<SmtpIntegrationConfigView> {
    return this.service.update(dto, principal);
  }
}
