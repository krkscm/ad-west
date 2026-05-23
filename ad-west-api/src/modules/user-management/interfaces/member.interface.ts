export interface MemberUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  active: boolean;
}

export interface OtpRequest {
  id: string;
  purpose: 'member-login';
  memberId: string;
  destination: string;
  code: string;
  expiresAt: number;
  attempts: number;
}
