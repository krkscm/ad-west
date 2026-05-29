export interface MemberUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil?: number;
  active: boolean;
}
