import { Injectable } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { SmtpIntegrationConfigService } from './smtp-integration-config.service';

export interface InboxEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

@Injectable()
export class ImapService {
  constructor(private readonly smtpConfig: SmtpIntegrationConfigService) {}

  async listInbox(maxResults = 10): Promise<InboxEmail[]> {
    const config = await this.smtpConfig.getResolvedConfig();

    if (!config.enabled || !config.imapHost || !config.username || !config.password) {
      return [];
    }

    const client = new ImapFlow({
      host: config.imapHost,
      port: config.imapPort,
      secure: true,
      auth: {
        user: config.username,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
      logger: false,
    });

    await client.connect();
    const emails: InboxEmail[] = [];

    try {
      const mailbox = await client.mailboxOpen('INBOX');
      const total = mailbox.exists;
      if (total === 0) {
        return [];
      }

      const start = Math.max(1, total - maxResults + 1);
      const range = `${start}:${total}`;

      for await (const message of client.fetch(range, { envelope: true })) {
        const envelope = message.envelope;
        if (!envelope) continue;

        const fromAddr = envelope.from?.[0];
        const from = fromAddr
          ? fromAddr.name
            ? `${fromAddr.name} <${fromAddr.address ?? ''}>`
            : (fromAddr.address ?? '(Unknown sender)')
          : '(Unknown sender)';

        emails.push({
          id: message.uid.toString(),
          subject: envelope.subject || '(No Subject)',
          from,
          date: envelope.date?.toISOString() ?? '',
          snippet: '',
        });
      }
    } finally {
      await client.logout();
    }

    return emails.reverse();
  }
}
