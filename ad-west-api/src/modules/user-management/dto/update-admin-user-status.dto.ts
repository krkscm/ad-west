import { IsBoolean } from 'class-validator';

export class UpdateAdminUserStatusDto {
  @IsBoolean()
  active!: boolean;
}
