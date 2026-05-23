import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

interface TokenPayload {
  sub: string;
  type: 'admin' | 'member';
  roles: string[];
  sid: string;
  exp: number;
  email?: string;
  memberId?: string;
}

@Injectable()
export class CryptoService {
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
    if (signature !== expected) {
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

  createTotpSecret(): string {
    return randomBytes(20).toString('hex');
  }

  generateTotp(secretHex: string, time: number = Date.now()): string {
    const step = Math.floor(time / 1000 / 30);
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(Math.floor(step / 0x100000000), 0);
    buffer.writeUInt32BE(step % 0x100000000, 4);

    const key = Buffer.from(secretHex, 'hex');
    const hmac = createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      (hmac[offset + 1] << 16) |
      (hmac[offset + 2] << 8) |
      hmac[offset + 3];

    return (code % 1000000).toString().padStart(6, '0');
  }

  verifyTotp(secretHex: string, code: string): boolean {
    const now = Date.now();
    const candidates = [
      this.generateTotp(secretHex, now - 30000),
      this.generateTotp(secretHex, now),
      this.generateTotp(secretHex, now + 30000),
    ];

    return candidates.includes(code);
  }

  randomNumericCode(length: number): string {
    const max = 10 ** length;
    const min = 10 ** (length - 1);
    const value = Math.floor(Math.random() * (max - min)) + min;
    return `${value}`;
  }

  randomId(prefix: string): string {
    return `${prefix}_${randomBytes(8).toString('hex')}`;
  }

  private signValue(value: string): string {
    const secret = process.env.JWT_SECRET || 'adwest-local-secret';
    return createHmac('sha256', secret).update(value).digest('base64url');
  }
}
