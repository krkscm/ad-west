import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { USER_STORE } from '../constants';
import { AdminMenuGrantEntity } from '../entities/admin-menu-grant.entity';
import { MenuItemEntity } from '../entities/menu-item.entity';
import { AdminMenuGrant, MenuItem } from '../interfaces/menu-item.interface';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AdminUser } from '../interfaces/admin-user.interface';
import { CreateMenuItemDto } from '../dto/create-menu-item.dto';
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto';
import { CryptoService } from './crypto.service';
import { UserStore } from '../interfaces/user-store.interface';

const DEFAULT_MENUS: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { key: 'dashboard',                    label: 'Dashboard',           parentKey: null,       icon: '📊', sortOrder: 10, active: true },
  { key: 'insights',                     label: 'Insights',            parentKey: null,       icon: '📈', sortOrder: 15, active: true },
  { key: 'settings',                     label: 'Settings',            parentKey: null,       icon: '⚙️', sortOrder: 20, active: true },
  { key: 'settings-roles-definition',    label: 'Roles Definition',    parentKey: 'settings', icon: null, sortOrder: 10, active: true },
  { key: 'settings-location-definition', label: 'Location Definition', parentKey: 'settings', icon: null, sortOrder: 20, active: true },
  { key: 'settings-sreni-definition',    label: 'Sreni Definition',    parentKey: 'settings', icon: null, sortOrder: 30, active: true },
  { key: 'settings-permissions',         label: 'Permissions',         parentKey: 'settings', icon: null, sortOrder: 40, active: true },
  { key: 'settings-permission-sets',     label: 'Permission Sets',     parentKey: 'settings', icon: null, sortOrder: 50, active: true },
  { key: 'settings-enum-values',         label: 'Reference Data',      parentKey: 'settings', icon: null, sortOrder: 55, active: true },
  { key: 'settings-admins',              label: 'Admin Management',    parentKey: 'settings', icon: null, sortOrder: 60, active: true },
  { key: 'settings-approval-workflows',  label: 'Approval Workflows',  parentKey: 'settings', icon: null, sortOrder: 70, active: true },
  { key: 'settings-users',               label: 'Users',               parentKey: 'settings', icon: null, sortOrder: 80, active: true },
  { key: 'settings-responsibility-chart', label: 'Responsibility Chart', parentKey: 'settings', icon: null, sortOrder: 90, active: true },
  { key: 'settings-google-integration',  label: 'Google Integration',  parentKey: 'settings', icon: null, sortOrder: 95, active: true },
  { key: 'helpdesk',                         label: 'Helpdesk',              parentKey: null,                icon: '🛠️', sortOrder: 25, active: true },
  { key: 'helpdesk-tickets',                 label: 'Helpdesk Tickets',      parentKey: 'helpdesk',          icon: null, sortOrder: 10, active: true },
  { key: 'job-postings',                     label: 'Job Postings',          parentKey: 'helpdesk',          icon: null, sortOrder: 20, active: true },
  { key: 'job-applications',                 label: 'Job Applications',      parentKey: 'helpdesk',          icon: null, sortOrder: 30, active: true },
  { key: 'member-services',                  label: 'Member Services',       parentKey: null,                icon: '🛎️', sortOrder: 27, active: true },
  { key: 'member-services-reimbursements',   label: 'Reimbursements',        parentKey: 'member-services',   icon: null, sortOrder: 10, active: true },
  { key: 'member-services-events',           label: 'Special Events',        parentKey: 'member-services',   icon: null, sortOrder: 20, active: true },
  { key: 'member-services-notifications',    label: 'Notifications',         parentKey: 'member-services',   icon: null, sortOrder: 30, active: true },
  { key: 'member-services-gmail',            label: 'Gmail Workspace',        parentKey: 'member-services',   icon: null, sortOrder: 40, active: true },
];

@Injectable()
export class MenuManagementService {
  private readonly memMenus = new Map<string, MenuItem>();
  private readonly memGrants = new Map<string, AdminMenuGrant[]>();

  constructor(
    private readonly cryptoService: CryptoService,
    @Inject(USER_STORE) private readonly userStore: UserStore,
    @Optional() @InjectRepository(MenuItemEntity)
    private readonly menuRepo?: Repository<MenuItemEntity>,
    @Optional() @InjectRepository(AdminMenuGrantEntity)
    private readonly grantRepo?: Repository<AdminMenuGrantEntity>,
  ) {
    if (!this.menuRepo) {
      this.seedInMemory();
    }
  }

  private seedInMemory(): void {
    const now = new Date().toISOString();
    for (const def of DEFAULT_MENUS) {
      const id = `menu_${def.key.replace(/-/g, '_')}`;
      this.memMenus.set(id, { id, ...def, createdAt: now, updatedAt: now });
    }
  }

  private useDb(): boolean {
    return !!this.menuRepo && !!this.grantRepo;
  }

  // ── Menu Items ──────────────────────────────────────────────────────────────

  async listMenuItems(activeOnly = false): Promise<MenuItem[]> {
    if (this.useDb()) {
      await this.ensureSettingsResponsibilityChartMenu();
      await this.ensureSettingsGoogleIntegrationMenu();
      await this.ensurePublicGatewayMenus();
      await this.ensureMemberServicesMenus();
      await this.ensureSreniAttendanceChildMenus();
      const rows = activeOnly
        ? await this.menuRepo!.find({ where: { active: true } })
        : await this.menuRepo!.find();
      return rows.map(this.toMenuItem);
    }
    const items = Array.from(this.memMenus.values());
    return activeOnly ? items.filter((m) => m.active) : items;
  }

  async getMenuItemById(id: string): Promise<MenuItem> {
    if (this.useDb()) {
      const row = await this.menuRepo!.findOne({ where: { id } });
      if (!row) throw new NotFoundException(`Menu item ${id} not found`);
      return this.toMenuItem(row);
    }
    const item = this.memMenus.get(id);
    if (!item) throw new NotFoundException(`Menu item ${id} not found`);
    return item;
  }

  async createMenuItem(dto: CreateMenuItemDto, _principal: AuthPrincipal): Promise<MenuItem> {
    const existing = await this.findByKey(dto.key);
    if (existing) throw new BadRequestException(`Menu key '${dto.key}' already exists`);

    const now = new Date().toISOString();
    const item: MenuItem = {
      id: this.cryptoService.randomId('menu'),
      key: dto.key,
      label: dto.label,
      parentKey: dto.parentKey ?? null,
      icon: dto.icon ?? null,
      sortOrder: dto.sortOrder ?? 0,
      active: dto.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    if (this.useDb()) {
      await this.menuRepo!.insert(this.fromMenuItem(item));
    } else {
      this.memMenus.set(item.id, item);
    }
    return item;
  }

  async updateMenuItem(id: string, dto: UpdateMenuItemDto, _principal: AuthPrincipal): Promise<MenuItem> {
    const item = await this.getMenuItemById(id);
    const updated: MenuItem = {
      ...item,
      label: dto.label ?? item.label,
      parentKey: dto.parentKey !== undefined ? dto.parentKey : item.parentKey,
      icon: dto.icon !== undefined ? dto.icon : item.icon,
      sortOrder: dto.sortOrder ?? item.sortOrder,
      active: dto.active ?? item.active,
      updatedAt: new Date().toISOString(),
    };

    if (this.useDb()) {
      await this.menuRepo!.save(this.fromMenuItem(updated));
    } else {
      this.memMenus.set(id, updated);
    }
    return updated;
  }

  async deleteMenuItem(id: string): Promise<{ success: boolean }> {
    const item = await this.getMenuItemById(id); // throws if not found
    if (this.useDb()) {
      await this.grantRepo!.delete({ menuKey: item.key });
      await this.menuRepo!.delete(id);
    } else {
      this.memMenus.delete(id);
      for (const [adminId, grants] of this.memGrants) {
        this.memGrants.set(adminId, grants.filter((g) => g.menuKey !== item.key));
      }
    }
    return { success: true };
  }

  // ── Admin Menu Grants ───────────────────────────────────────────────────────

  async getAdminMenuGrants(adminUserId: string): Promise<string[]> {
    const admin = await this.userStore.getAdminById(adminUserId);
    if (admin && this.isSuperAdmin(admin)) {
      const allMenus = await this.listMenuItems(true);
      return allMenus.map((menu) => menu.key);
    }

    if (this.useDb()) {
      const rows = await this.grantRepo!.find({ where: { adminUserId } });
      return rows.map((r) => r.menuKey);
    }
    return (this.memGrants.get(adminUserId) ?? []).map((g) => g.menuKey);
  }

  async setAdminMenuGrants(
    adminUserId: string,
    menuKeys: string[],
    principal: AuthPrincipal,
  ): Promise<string[]> {
    const admin = await this.userStore.getAdminById(adminUserId);
    if (admin && this.isSuperAdmin(admin)) {
      const allMenus = await this.listMenuItems(true);
      menuKeys = allMenus.map((menu) => menu.key);
    }

    // Validate all keys exist
    const allMenus = await this.listMenuItems();
    const validKeys = new Set(allMenus.map((m) => m.key));
    const invalid = menuKeys.filter((k) => !validKeys.has(k));
    if (invalid.length > 0) {
      throw new BadRequestException(`Unknown menu keys: ${invalid.join(', ')}`);
    }

    const now = new Date().toISOString();

    if (this.useDb()) {
      await this.grantRepo!.delete({ adminUserId });
      if (menuKeys.length > 0) {
        const entities = menuKeys.map((menuKey) => ({
          id: this.cryptoService.randomId('grant'),
          adminUserId,
          menuKey,
          grantedBy: principal.userId,
          grantedAt: now,
        }));
        await this.grantRepo!.insert(entities);
      }
    } else {
      const grants: AdminMenuGrant[] = menuKeys.map((menuKey) => ({
        id: this.cryptoService.randomId('grant'),
        adminUserId,
        menuKey,
        grantedBy: principal.userId,
        grantedAt: now,
      }));
      this.memGrants.set(adminUserId, grants);
    }

    return menuKeys;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async findByKey(key: string): Promise<MenuItem | null> {
    if (this.useDb()) {
      const row = await this.menuRepo!.findOne({ where: { key } });
      return row ? this.toMenuItem(row) : null;
    }
    return Array.from(this.memMenus.values()).find((m) => m.key === key) ?? null;
  }

  private toMenuItem(entity: MenuItemEntity): MenuItem {
    return {
      id: entity.id,
      key: entity.key,
      label: entity.label,
      parentKey: entity.parentKey,
      icon: entity.icon,
      sortOrder: entity.sortOrder,
      active: entity.active,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private fromMenuItem(item: MenuItem): MenuItemEntity {
    const e = new MenuItemEntity();
    e.id = item.id;
    e.key = item.key;
    e.label = item.label;
    e.parentKey = item.parentKey;
    e.icon = item.icon;
    e.sortOrder = item.sortOrder;
    e.active = item.active;
    e.createdAt = item.createdAt;
    e.updatedAt = item.updatedAt;
    return e;
  }

  private isSuperAdmin(admin: AdminUser): boolean {
    return admin.roles.some((role) => role.role === 'SUPER_ADMIN');
  }

  private async ensureSreniAttendanceChildMenus(): Promise<void> {
    if (!this.useDb()) {
      return;
    }

    const allMenus = await this.menuRepo!.find();
    const parents = allMenus.filter((item) => !item.parentKey && item.key.startsWith('sreni-'));
    if (!parents.length) {
      return;
    }

    const existingKeys = new Set(allMenus.map((item) => item.key));
    const now = new Date().toISOString();
    const missing: MenuItemEntity[] = [];

    for (const parent of parents) {
      const attendanceKey = `${parent.key}-attendance`;
      if (existingKeys.has(attendanceKey)) {
        continue;
      }

      const entity = new MenuItemEntity();
      entity.id = this.cryptoService.randomId('menu');
      entity.key = attendanceKey;
      entity.label = 'Attendance';
      entity.parentKey = parent.key;
      entity.icon = '✅';
      entity.sortOrder = 30;
      entity.active = parent.active;
      entity.createdAt = now;
      entity.updatedAt = now;
      missing.push(entity);
      existingKeys.add(attendanceKey);
    }

    if (missing.length > 0) {
      await this.menuRepo!.insert(missing);
    }
  }

  private async ensureSettingsResponsibilityChartMenu(): Promise<void> {
    if (!this.useDb()) {
      return;
    }

    const existing = await this.menuRepo!.findOne({ where: { key: 'settings-responsibility-chart' } });
    if (existing) {
      return;
    }

    const settingsMenu = await this.menuRepo!.findOne({ where: { key: 'settings' } });
    if (!settingsMenu) {
      return;
    }

    const now = new Date().toISOString();
    const entity = new MenuItemEntity();
    entity.id = this.cryptoService.randomId('menu');
    entity.key = 'settings-responsibility-chart';
    entity.label = 'Responsibility Chart';
    entity.parentKey = 'settings';
    entity.icon = '🧭';
    entity.sortOrder = 90;
    entity.active = settingsMenu.active;
    entity.createdAt = now;
    entity.updatedAt = now;
    await this.menuRepo!.insert(entity);
  }

  private async ensureSettingsGoogleIntegrationMenu(): Promise<void> {
    if (!this.useDb()) {
      return;
    }

    const existing = await this.menuRepo!.findOne({ where: { key: 'settings-google-integration' } });
    if (existing) {
      return;
    }

    const settingsMenu = await this.menuRepo!.findOne({ where: { key: 'settings' } });
    if (!settingsMenu) {
      return;
    }

    const now = new Date().toISOString();
    const entity = new MenuItemEntity();
    entity.id = this.cryptoService.randomId('menu');
    entity.key = 'settings-google-integration';
    entity.label = 'Google Integration';
    entity.parentKey = 'settings';
    entity.icon = '🔐';
    entity.sortOrder = 95;
    entity.active = settingsMenu.active;
    entity.createdAt = now;
    entity.updatedAt = now;
    await this.menuRepo!.insert(entity);
  }

  private async ensurePublicGatewayMenus(): Promise<void> {
    if (!this.useDb()) {
      return;
    }

    const allMenus = await this.menuRepo!.find();
    const existingKeys = new Set(allMenus.map((item) => item.key));
    const now = new Date().toISOString();
    const missing: MenuItemEntity[] = [];

    const definitions: Array<{
      key: string;
      label: string;
      parentKey: string | null;
      icon: string | null;
      sortOrder: number;
    }> = [
      { key: 'helpdesk', label: 'Helpdesk', parentKey: null, icon: '🛠️', sortOrder: 25 },
      { key: 'helpdesk-tickets', label: 'Helpdesk Tickets', parentKey: 'helpdesk', icon: null, sortOrder: 10 },
      { key: 'job-postings', label: 'Job Postings', parentKey: 'helpdesk', icon: null, sortOrder: 20 },
      { key: 'job-applications', label: 'Job Applications', parentKey: 'helpdesk', icon: null, sortOrder: 30 },
    ];

    for (const definition of definitions) {
      if (existingKeys.has(definition.key)) {
        continue;
      }

      if (definition.parentKey && !existingKeys.has(definition.parentKey)) {
        continue;
      }

      const entity = new MenuItemEntity();
      entity.id = this.cryptoService.randomId('menu');
      entity.key = definition.key;
      entity.label = definition.label;
      entity.parentKey = definition.parentKey;
      entity.icon = definition.icon;
      entity.sortOrder = definition.sortOrder;
      entity.active = true;
      entity.createdAt = now;
      entity.updatedAt = now;
      missing.push(entity);
      existingKeys.add(definition.key);
    }

    if (missing.length > 0) {
      await this.menuRepo!.insert(missing);
    }
  }

  private async ensureMemberServicesMenus(): Promise<void> {
    if (!this.useDb()) return;

    const allMenus = await this.menuRepo!.find();
    const existingKeys = new Set(allMenus.map((item) => item.key));
    const now = new Date().toISOString();
    const missing: MenuItemEntity[] = [];

    const definitions = [
      { key: 'member-services',                label: 'Member Services',  parentKey: null as string | null,  icon: '🛎️', sortOrder: 27 },
      { key: 'member-services-reimbursements',  label: 'Reimbursements',   parentKey: 'member-services',      icon: null as string | null, sortOrder: 10 },
      { key: 'member-services-events',          label: 'Special Events',   parentKey: 'member-services',      icon: null as string | null, sortOrder: 20 },
      { key: 'member-services-notifications',   label: 'Notifications',    parentKey: 'member-services',      icon: null as string | null, sortOrder: 30 },
      { key: 'member-services-gmail',           label: 'Gmail Workspace',  parentKey: 'member-services',      icon: null as string | null, sortOrder: 40 },
    ];

    for (const def of definitions) {
      if (existingKeys.has(def.key)) continue;
      if (def.parentKey && !existingKeys.has(def.parentKey)) continue;

      const entity = new MenuItemEntity();
      entity.id = this.cryptoService.randomId('menu');
      entity.key = def.key;
      entity.label = def.label;
      entity.parentKey = def.parentKey;
      entity.icon = def.icon;
      entity.sortOrder = def.sortOrder;
      entity.active = true;
      entity.createdAt = now;
      entity.updatedAt = now;
      missing.push(entity);
      existingKeys.add(def.key);
    }

    if (missing.length > 0) {
      await this.menuRepo!.insert(missing);
    }
  }
}
