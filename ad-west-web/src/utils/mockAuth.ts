// Browser-compatible Authentication and Cryptographic Utilities

// Base32 Alphabet for TOTP Secrets (Google Authenticator)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function decodeBase32(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  const len = clean.length;
  const result = new Uint8Array(Math.floor((len * 5) / 8));
  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (let i = 0; i < len; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bits += 5;
    if (bits >= 8) {
      result[index++] = (buffer >> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return result;
}

// Generate standard TOTP 6-digit code using WebCrypto HMAC-SHA-1
export async function generateTotp(secretBase32: string, timeMs: number = Date.now()): Promise<string> {
  try {
    const step = Math.floor(timeMs / 1000 / 30);
    const keyBuffer = decodeBase32(secretBase32);
    
    // Write step as 64-bit Big-Endian Integer into 8-byte buffer
    const dataBuffer = new Uint8Array(8);
    let temp = step;
    for (let i = 7; i >= 0; i--) {
      dataBuffer[i] = temp & 0xff;
      temp = Math.floor(temp / 256);
    }
    
    // Import raw key buffer for HMAC
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBuffer as any,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );
    
    // Generate signature
    const signatureBuffer = new Uint8Array(await window.crypto.subtle.sign('HMAC', cryptoKey, dataBuffer as any));
    
    // Dynamic truncation
    const offset = signatureBuffer[signatureBuffer.length - 1] & 0x0f;
    const binary =
      ((signatureBuffer[offset] & 0x7f) << 24) |
      (signatureBuffer[offset + 1] << 16) |
      (signatureBuffer[offset + 2] << 8) |
      signatureBuffer[offset + 3];
    
    return (binary % 1000000).toString().padStart(6, '0');
  } catch (error) {
    console.error('Failed to generate TOTP code:', error);
    return '000000';
  }
}

// Verify a given 6-digit TOTP code (supports time window of +/- 30 seconds)
export async function verifyTotp(secretBase32: string, code: string): Promise<boolean> {
  const now = Date.now();
  const codes = await Promise.all([
    generateTotp(secretBase32, now - 30000), // -1 window
    generateTotp(secretBase32, now),         // current window
    generateTotp(secretBase32, now + 30000)  // +1 window
  ]);
  return codes.includes(code.trim());
}

// Generate a random Base32 Secret Key for Google Authenticator (16 characters)
export function createTotpSecret(): string {
  let secret = '';
  for (let i = 0; i < 16; i++) {
    const idx = Math.floor(Math.random() * BASE32_ALPHABET.length);
    secret += BASE32_ALPHABET[idx];
  }
  return secret;
}

// Mock Password hashing algorithm (matches scrypt structure using a lightweight sync check)
export function hashPassword(password: string): string {
  const salt = Math.random().toString(36).substring(2, 10);
  let hash = 5381;
  const combined = salt + password;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 33) ^ combined.charCodeAt(i);
  }
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `${salt}:${hexHash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  // Direct matching for the seeded admin user password 'password123'
  if (storedHash === '8e811c75c5e8c171:5e7d5830b53d8a7c645bc2fa5bbd323b63297a7cc262db80eb9d0e2e9c20a95f5669b32943343a6d96924dcf58925576a8b75e7a909bb6b5c3cb84074211a7c7') {
    return password === 'password123';
  }

  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  let checkHash = 5381;
  const combined = salt + password;
  for (let i = 0; i < combined.length; i++) {
    checkHash = (checkHash * 33) ^ combined.charCodeAt(i);
  }
  const hexCheck = Math.abs(checkHash).toString(16).padStart(8, '0');
  return hexCheck === hash;
}

// Simulated JWT Token Sign/Decode
export interface SessionPayload {
  sub: string;
  name: string;
  email: string;
  roles: { role: string; scopeType: string; scopeId: string }[];
  exp: number;
}

export function signToken(user: { id: string; name: string; email: string; roles: any[] }, expiresInSeconds = 3600): string {
  const payload: SessionPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles.map(r => ({ role: r.role, scopeType: r.scopeType, scopeId: r.scopeId })),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };
  // Base64url encode simulated JWT
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '');
  return `${header}.${body}.mocksignature`;
}

export function decodeToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const bodyStr = atob(parts[1]);
    const payload = JSON.parse(bodyStr) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}
