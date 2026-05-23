import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { AdminRole } from '../enums/admin-role.enum';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuditLogEntry } from '../interfaces/audit-log.interface';
import { AuditService } from '../services/audit.service';

@Controller('audit-logs')
@UseGuards(AuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ZONE_ADMIN)
  async list(@Query('action') action?: string): Promise<AuditLogEntry[]> {
    return this.auditService.list(action);
  }
}
