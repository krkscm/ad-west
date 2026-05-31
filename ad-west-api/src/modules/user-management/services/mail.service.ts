import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SmtpIntegrationConfigService } from './smtp-integration-config.service';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  constructor(private readonly smtpConfig: SmtpIntegrationConfigService) {}

  async sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId: string }> {
    const config = await this.smtpConfig.getResolvedConfig();

    if (!config.enabled) {
      throw new Error('SMTP integration is disabled.');
    }

    if (!config.host || !config.username || !config.password) {
      throw new Error('SMTP configuration is incomplete. Please configure settings under Settings > Email Integration.');
    }

    const secure = config.encryption === 'SSL';
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure,
      ...(config.encryption === 'TLS' ? { requireTLS: true } : {}),
      auth: {
        user: config.username,
        pass: config.password,
      },
    });

    const from = config.fromName
      ? `"${config.fromName}" <${config.username}>`
      : config.username;

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return { success: true, messageId: info.messageId ?? '' };
  }
}
