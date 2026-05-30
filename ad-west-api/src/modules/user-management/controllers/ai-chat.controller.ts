import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AiChatRequestDto } from '../dto/ai-chat-request.dto';
import { AuthGuard } from '../guards/auth.guard';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AiChatService } from '../services/ai-chat.service';

@Controller('ai-chat')
@UseGuards(AuthGuard)
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('query')
  async query(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: AiChatRequestDto,
  ): Promise<{ answer: string; provider: 'openai' | 'ollama'; model: string }> {
    return this.aiChatService.chat(principal, dto.message, dto.context);
  }
}
