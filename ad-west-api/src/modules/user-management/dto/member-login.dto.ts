import { IsString, MinLength } from 'class-validator';

export class MemberLoginDto {
  @IsString()
  @MinLength(3)
  identifier!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(12)
  captchaToken!: string;

  @IsString()
  @MinLength(1)
  captchaAnswer!: string;
}
