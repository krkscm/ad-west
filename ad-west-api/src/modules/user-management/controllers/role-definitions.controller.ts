import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { CreateRoleDefinitionDto } from '../dto/create-role-definition.dto';
import { ListRoleDefinitionsQueryDto } from '../dto/list-role-definitions-query.dto';
import { UpdateRoleDefinitionDto } from '../dto/update-role-definition.dto';
import { UpdateRoleDefinitionStatusDto } from '../dto/update-role-definition-status.dto';
import { AdminRole } from '../enums/admin-role.enum';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { RoleDefinition } from '../interfaces/role-definition.interface';
import {
  PaginatedRoleDefinitionsResponse,
  RoleDefinitionsService,
} from '../services/role-definitions.service';

@Controller('role-definitions')
@UseGuards(AuthGuard, RolesGuard)
export class RoleDefinitionsController {
  constructor(private readonly roleDefinitionsService: RoleDefinitionsService) {}

  @Get()
  async list(
    @Query() query: ListRoleDefinitionsQueryDto,
  ): Promise<PaginatedRoleDefinitionsResponse> {
    return this.roleDefinitionsService.list(query);
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  async create(
    @Body() dto: CreateRoleDefinitionDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<RoleDefinition> {
    return this.roleDefinitionsService.create(dto, principal);
  }

  @Patch(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDefinitionDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<RoleDefinition> {
    return this.roleDefinitionsService.update(id, dto, principal);
  }

  @Patch(':id/status')
  @Roles(AdminRole.SUPER_ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDefinitionStatusDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<RoleDefinition> {
    return this.roleDefinitionsService.updateStatus(id, dto, principal);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.roleDefinitionsService.remove(id);
  }
}
