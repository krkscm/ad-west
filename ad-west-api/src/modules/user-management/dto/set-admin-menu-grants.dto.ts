import { IsArray, IsString } from 'class-validator';

export class SetAdminMenuGrantsDto {
  @IsArray()
  @IsString({ each: true })
  menuKeys!: string[];
}
