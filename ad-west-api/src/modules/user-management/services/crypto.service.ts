import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { AdminRole } from '../enums/admin-role.enum';

interface TokenPayload {
  sub: string;
  type: 'admin' | 'member';
  origin?: 'admin' | 'user';
  authProvider?: 'password' | 'google';
  code?: string;
  roles: string[];
  roleAssignments?: Array<{
    role: AdminRole;
    scopeType: 'global' | 'zone' | 'sreny';
    scopeId?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
  }>;
  sid: string;
  exp: number;
  email?: string;
  name?: string;
  gender?: string;
  picture?: string;
  memberId?: string;
  mustResetPassword?: boolean;
}

interface CaptchaPayload {
  answer: string;
  exp: number;
}

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);

  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) {
      return false;
    }

    const derived = scryptSync(password, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
  }

  signToken(payload: Omit<TokenPayload, 'exp'>, expiresInSeconds: number): string {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const fullPayload: TokenPayload = { ...payload, exp };
    const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = this.signValue(encoded);
    return `${encoded}.${signature}`;
  }

  verifyToken(token: string): TokenPayload | null {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) {
      return null;
    }

    const expected = this.signValue(encoded);
    if (!this.isValidSignature(signature, expected)) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as TokenPayload;
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  randomId(prefix: string): string {
    return `${prefix}_${randomBytes(8).toString('hex')}`;
  }

  createCaptchaChallenge(): {
    captchaToken: string;
    captchaImage: string;
    expiresInSeconds: number;
  } {
    const startedAt = Date.now();
    try {
      const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      let answer = '';
      for (let i = 0; i < 5; i++) {
        answer += charset[Math.floor(Math.random() * charset.length)];
      }

      const exp = Math.floor(Date.now() / 1000) + 600;
      const payload: CaptchaPayload = { answer, exp };
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = this.signValue(encoded);
      const captchaImage = this.renderCaptchaSvg(answer);
      const elapsedMs = Date.now() - startedAt;

      if (elapsedMs >= 500) {
        this.logger.warn(`createCaptchaChallenge took ${elapsedMs}ms`);
      }

      return {
        captchaToken: `${encoded}.${signature}`,
        captchaImage,
        expiresInSeconds: 600,
      };
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `createCaptchaChallenge failed after ${elapsedMs}ms: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  verifyCaptcha(captchaToken: string, captchaAnswer: string): boolean {
    const startedAt = Date.now();
    const [encoded, signature] = captchaToken.split('.');
    if (!encoded || !signature) {
      return false;
    }

    const expected = this.signValue(encoded);
    if (!this.isValidSignature(signature, expected)) {
      return false;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as CaptchaPayload;
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        return false;
      }

      const isValid = payload.answer === captchaAnswer.trim().toUpperCase();
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= 250) {
        this.logger.warn(`verifyCaptcha took ${elapsedMs}ms`);
      }
      return isValid;
    } catch {
      return false;
    }
  }

  private renderCaptchaSvg(text: string): string {
    const w = 200;
    const h = 60;
    const colors = ['#1a237e', '#4a148c', '#01579b', '#1b5e20', '#bf360c', '#37474f', '#880e4f'];
    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    let noise = '';
    for (let i = 0; i < 7; i++) {
      noise += `<line x1="${rand(0, w).toFixed(1)}" y1="${rand(0, h).toFixed(1)}" x2="${rand(0, w).toFixed(1)}" y2="${rand(0, h).toFixed(1)}" stroke="#9e9eb8" stroke-width="${rand(1, 2).toFixed(1)}" opacity="0.55"/>`;
    }
    for (let i = 0; i < 18; i++) {
      noise += `<circle cx="${rand(0, w).toFixed(1)}" cy="${rand(0, h).toFixed(1)}" r="${rand(1, 2.5).toFixed(1)}" fill="#9090aa" opacity="0.45"/>`;
    }

    const cellW = w / text.length;
    let chars = '';
    for (let i = 0; i < text.length; i++) {
      const cx = cellW * i + cellW / 2;
      const cy = 42 + rand(-8, 8);
      const rotation = rand(-18, 18);
      const fontSize = Math.floor(rand(22, 30));
      const color = colors[Math.floor(Math.random() * colors.length)];
      chars += `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="${fontSize}" font-family="'Courier New',Courier,monospace" font-weight="bold" fill="${color}" text-anchor="middle" transform="rotate(${rotation.toFixed(1)},${cx.toFixed(1)},${cy.toFixed(1)})">${text[i]}</text>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#eef0f8" rx="6"/>${noise}${chars}</svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  private signValue(value: string): string {
    const secret = process.env.JWT_SECRET || 'adwest-local-secret';
    return createHmac('sha256', secret).update(value).digest('base64url');
  }

  private isValidSignature(signature: string, expected: string): boolean {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(sigBuffer, expectedBuffer);
  }
}
