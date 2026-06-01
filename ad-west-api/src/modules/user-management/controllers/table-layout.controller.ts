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
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { TableLayoutService } from '../services/table-layout.service';
import {
  CreateTableLayoutDto,
  SetActiveLayoutDto,
  TableLayoutQueryDto,
  UpdateTableLayoutDto,
} from '../dto/table-layout.dto';

@Controller('settings/table-layouts')
@UseGuards(AuthGuard)
export class TableLayoutController {
  constructor(private readonly service: TableLayoutService) {}

  @Get()
  list(@Query() query: TableLayoutQueryDto, @CurrentUser() principal: AuthPrincipal) {
    return this.service.list(principal.userId, query.tableKey);
  }

  @Post()
  create(@Body() dto: CreateTableLayoutDto, @CurrentUser() principal: AuthPrincipal) {
    return this.service.create(principal.userId, dto);
  }

  // Register /active BEFORE /:id to avoid NestJS matching 'active' as an id param
  @Put('active')
  setActive(
    @Query() query: TableLayoutQueryDto,
    @Body() dto: SetActiveLayoutDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.setActive(principal.userId, query.tableKey, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTableLayoutDto,
    @CurrentUser() principal: AuthPrincipal,
  ) {
    return this.service.update(principal.userId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() principal: AuthPrincipal) {
    return this.service.remove(principal.userId, id);
  }
}
