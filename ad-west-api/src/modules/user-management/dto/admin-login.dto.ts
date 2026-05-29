import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email!: string;

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
