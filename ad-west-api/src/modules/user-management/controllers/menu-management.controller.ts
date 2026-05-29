import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { CreateMenuItemDto } from '../dto/create-menu-item.dto';
import { SetAdminMenuGrantsDto } from '../dto/set-admin-menu-grants.dto';
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto';
import { AdminRole } from '../enums/admin-role.enum';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { MenuItem } from '../interfaces/menu-item.interface';
import { MenuManagementService } from '../services/menu-management.service';

@Controller('menu-items')
@UseGuards(AuthGuard, RolesGuard)
export class MenuManagementController {
  constructor(private readonly menuService: MenuManagementService) {}

  // ── Menu definitions ────────────────────────────────────────────────────────

  @Get()
  async listMenuItems(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<MenuItem[]> {
    return this.menuService.listMenuItems(activeOnly === 'true');
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  async createMenuItem(
    @Body() dto: CreateMenuItemDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<MenuItem> {
    return this.menuService.createMenuItem(dto, principal);
  }

  @Patch(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  async updateMenuItem(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<MenuItem> {
    return this.menuService.updateMenuItem(id, dto, principal);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  async deleteMenuItem(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.menuService.deleteMenuItem(id);
  }

  // ── Per-admin grants ────────────────────────────────────────────────────────

  @Get('grants/:adminUserId')
  @Roles(AdminRole.SUPER_ADMIN)
  async getAdminMenuGrants(
    @Param('adminUserId') adminUserId: string,
  ): Promise<{ adminUserId: string; menuKeys: string[] }> {
    const menuKeys = await this.menuService.getAdminMenuGrants(adminUserId);
    return { adminUserId, menuKeys };
  }

  @Put('grants/:adminUserId')
  @Roles(AdminRole.SUPER_ADMIN)
  async setAdminMenuGrants(
    @Param('adminUserId') adminUserId: string,
    @Body() dto: SetAdminMenuGrantsDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<{ adminUserId: string; menuKeys: string[] }> {
    const menuKeys = await this.menuService.setAdminMenuGrants(
      adminUserId,
      dto.menuKeys,
      principal,
    );
    return { adminUserId, menuKeys };
  }
}
