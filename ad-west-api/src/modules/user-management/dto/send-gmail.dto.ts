import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendGmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  body!: string;
}
