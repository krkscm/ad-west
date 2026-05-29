import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { SendGmailDto } from '../dto/send-gmail.dto';
import { AuthGuard } from '../guards/auth.guard';
import { AuthPrincipal } from '../interfaces/auth-principal.interface';
import { AuthService } from '../services/auth.service';

@Controller('gmail')
@UseGuards(AuthGuard)
export class GmailController {
  constructor(private readonly authService: AuthService) {}

  @Post('send')
  async send(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: SendGmailDto,
  ): Promise<{ success: boolean; messageId: string }> {
    return this.authService.sendGmailMessage(principal, dto.to, dto.subject, dto.body);
  }

  @Get('inbox')
  async inbox(
    @CurrentUser() principal: AuthPrincipal,
    @Query('maxResults') maxResultsRaw?: string,
  ): Promise<{ emails: Array<{ id: string; subject: string; from: string; date: string; snippet: string }> }> {
    const parsed = Number(maxResultsRaw ?? '10');
    const maxResults = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 20) : 10;
    const emails = await this.authService.listInboxEmails(principal, maxResults);
    return { emails };
  }
}
