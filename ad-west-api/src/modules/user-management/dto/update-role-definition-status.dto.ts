import { IsBoolean } from 'class-validator';

export class UpdateRoleDefinitionStatusDto {
  @IsBoolean()
  active!: boolean;
}
