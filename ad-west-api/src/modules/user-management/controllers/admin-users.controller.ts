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
import { AssignRoleDto } from '../dto/assign-role.dto';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto';
import { ListAdminUsersQueryDto } from '../dto/list-admin-users-query.dto';
import { ResetAdminPasswordDto } from '../dto/reset-admin-password.dto';
import { UpdateAdminProfileDto } from '../dto/update-admin-profile.dto';
import { UpdateAdminUserStatusDto } from '../dto/update-admin-user-status.dto';
import { AdminRole } from '../enums/admin-role.enum';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AdminUser } from '../interfaces/admin-user.interface';
import { AdminUsersService, PaginatedAdminUsersResponse } from '../services/admin-users.service';

@Controller('admin-users')
@UseGuards(AuthGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ZONE_ADMIN)
  async listAdmins(): Promise<Array<Omit<AdminUser, 'passwordHash'>>> {
    return this.adminUsersService.listAdmins();
  }

  @Get('paginated')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ZONE_ADMIN)
  async listAdminsPaginated(
    @Query() query: ListAdminUsersQueryDto,
  ): Promise<PaginatedAdminUsersResponse> {
    return this.adminUsersService.listAdminsPaginated(query);
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  async createAdmin(
    @Body() dto: CreateAdminUserDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    return this.adminUsersService.createAdmin(dto, principal);
  }

  @Patch(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateAdminProfileDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    return this.adminUsersService.updateProfile(id, dto, principal);
  }

  @Patch(':id/status')
  @Roles(AdminRole.SUPER_ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserStatusDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    return this.adminUsersService.updateStatus(id, dto, principal);
  }

  @Post(':id/reset-password')
  @Roles(AdminRole.SUPER_ADMIN)
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetAdminPasswordDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<{ success: boolean }> {
    return this.adminUsersService.resetPassword(id, dto, principal);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  async deleteAdmin(
    @Param('id') id: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<{ success: boolean }> {
    return this.adminUsersService.deleteAdmin(id, principal);
  }

  @Post(':id/roles')
  @Roles(AdminRole.SUPER_ADMIN)
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    return this.adminUsersService.assignRole(id, dto, principal);
  }
}
