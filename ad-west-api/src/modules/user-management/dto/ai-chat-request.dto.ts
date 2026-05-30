import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AiChatRequestDto {
  @IsString()
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  context?: string;
}
