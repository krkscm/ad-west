import { IsOptional, IsString, MinLength } from 'class-validator';

export class MemberRequestOtpDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
