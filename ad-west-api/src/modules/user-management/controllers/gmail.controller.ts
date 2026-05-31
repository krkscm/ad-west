import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SendGmailDto } from '../dto/send-gmail.dto';
import { AuthGuard } from '../guards/auth.guard';
import { ImapService, InboxEmail } from '../services/imap.service';
import { MailService } from '../services/mail.service';

@Controller('gmail')
@UseGuards(AuthGuard)
export class GmailController {
  constructor(
    private readonly mailService: MailService,
    private readonly imapService: ImapService,
  ) {}

  @Post('send')
  async send(
    @Body() dto: SendGmailDto,
  ): Promise<{ success: boolean; messageId: string }> {
    return this.mailService.sendMail({ to: dto.to, subject: dto.subject, html: dto.body });
  }

  @Get('inbox')
  async inbox(
    @Query('maxResults') maxResultsRaw?: string,
  ): Promise<{ emails: InboxEmail[] }> {
    const parsed = Number(maxResultsRaw ?? '10');
    const maxResults = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 20) : 10;
    const emails = await this.imapService.listInbox(maxResults);
    return { emails };
  }
}
