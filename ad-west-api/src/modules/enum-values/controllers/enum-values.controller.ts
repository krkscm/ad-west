import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@modules/user-management/guards/auth.guard';
import { RolesGuard } from '@modules/user-management/guards/roles.guard';
import { Roles } from '@modules/user-management/decorators/roles.decorator';
import { AdminRole } from '@modules/user-management/enums/admin-role.enum';
import { CreateEnumValueDto, ListEnumValuesQueryDto, UpdateEnumValueDto } from '../dto/enum-value.dto';
import { EnumValue, EnumValuesService } from '../services/enum-values.service';

@Controller('settings/enum-values')
@UseGuards(AuthGuard, RolesGuard)
export class EnumValuesController {
  constructor(private readonly service: EnumValuesService) {}

  @Get()
  list(@Query() query: ListEnumValuesQueryDto): Promise<EnumValue[]> {
    return this.service.list(query);
  }

  @Get('types')
  listTypes(): Promise<string[]> {
    return this.service.listTypes();
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  create(@Body() dto: CreateEnumValueDto): Promise<EnumValue> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateEnumValueDto): Promise<EnumValue> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.service.remove(id);
  }
}
