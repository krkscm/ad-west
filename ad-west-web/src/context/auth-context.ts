import { createContext, useContext } from 'react'
import { Contact } from '../types'

export interface AdminSessionUser {
  sub: string
  code: string
  name: string
  email: string
  picture?: string
  authProvider?: 'password' | 'google'
  roles: Array<{
    role: 'Super Admin' | 'Zone Admin' | 'Sreny Admin'
    scopeType: 'global' | 'zone' | 'sreny'
    scopeId: string
  }>
}

export interface AuthContextType {
  token: string | null
  adminUser: AdminSessionUser | null
  memberUser: Contact | null
  mustResetPassword: boolean
  getCaptchaChallenge: () => Promise<{ success: boolean; captchaToken?: string; captchaImage?: string; expiresInSeconds?: number; error?: string }>
  login: (identifier: string, password: string, captchaToken: string, captchaAnswer: string) => Promise<{ success: boolean; error?: string }>
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshAdminSession: () => Promise<void>
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
