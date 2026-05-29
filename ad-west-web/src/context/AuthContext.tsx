import React, { useEffect, useState } from 'react'
import { Contact } from '../types'
import { backendApi, toUiRole } from '../utils/backendApi'
import { AdminSessionUser, AuthContext } from './auth-context'

interface SessionPayload {
  sub: string
  type: 'admin' | 'member'
  code?: string
  name?: string
  email?: string
  origin?: 'admin' | 'user'
  sid: string
  exp: number
  mustResetPassword?: boolean
}

function decodeToken(token: string): SessionPayload | null {
  const encoded = token.split('.')[0]
  if (!encoded) {
    return null
  }

  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')
    const payload = JSON.parse(atob(padded)) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adwest_token'))
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null)
  const [memberUser, setMemberUser] = useState<Contact | null>(null)
  const [memberToken, setMemberToken] = useState<string | null>(localStorage.getItem('adwest_member_token'))
  const [mustResetPassword, setMustResetPassword] = useState<boolean>(false)

  const loadAdminSession = async (adminToken: string) => {
    localStorage.setItem('adwest_token', adminToken)
    setToken(adminToken)

    const payload = decodeToken(adminToken)
    if (!payload || payload.type !== 'admin') {
      setAdminUser(null)
      return
    }

    setMustResetPassword(payload.mustResetPassword === true)

    // Build session from the signed token payload — always valid when token is valid
    const tokenUser: AdminSessionUser = {
      sub: payload.sub,
      code: payload.code ?? payload.sub,
      name: payload.name ?? payload.code ?? payload.email ?? payload.sub,
      email: payload.email ?? `${payload.code ?? payload.sub}@adwest.local`,
      roles: [{ role: 'Super Admin', scopeType: 'global', scopeId: 'global' }],
    }

    try {
      // Try to enrich with live admin record (role assignments, display name)
      if (payload.code || payload.email) {
        const admins = await backendApi.listAdminUsers()
        const current = admins.find((user) =>
          payload.code
            ? user.code.toLowerCase() === payload.code!.toLowerCase()
            : user.email.toLowerCase() === payload.email!.toLowerCase()
        )
        if (current) {
          setAdminUser({
            sub: current.id,
            code: current.code,
            name: current.name,
            email: current.email,
            roles: current.roles.map((role) => ({
              role: toUiRole(role.role),
              scopeType: role.scopeType,
              scopeId: role.scopeId || 'global',
            })),
          })
          return
        }
      }
      // Not in admin_users table (core user with admin token) — fall back to token payload
      setAdminUser(tokenUser)
    } catch {
      setAdminUser(tokenUser)
    }
  }

  const loadMemberSession = async (tokenValue: string) => {
    localStorage.setItem('adwest_member_token', tokenValue)
    setMemberToken(tokenValue)

    const payload = decodeToken(tokenValue)
    if (!payload || payload.type !== 'member') {
      setMemberUser(null)
      return
    }

    const [firstName, ...lastNameParts] = (payload.name ?? 'Member User').trim().split(/\s+/)
    const mapped: Contact = {
      id: payload.sub,
      zoneId: 'unknown-zone',
      firstName: firstName || 'Member',
      lastName: lastNameParts.join(' ') || 'User',
      phonePrimary: '',
      emailPrimary: payload.email ?? '',
      dob: 'N/A',
      gender: 'N/A',
      address: '',
      status: 'active',
      memberships: [],
    }
    setMemberUser(mapped)
    localStorage.setItem('adwest_member', JSON.stringify(mapped))
  }

  useEffect(() => {
    if (token) {
      void loadAdminSession(token)
    }

    const savedMember = localStorage.getItem('adwest_member')
    if (savedMember) {
      try {
        setMemberUser(JSON.parse(savedMember) as Contact)
      } catch {
        localStorage.removeItem('adwest_member')
      }
    }

    if (memberToken && !memberUser) {
      void loadMemberSession(memberToken)
    }
  }, [])

  const getCaptchaChallenge = async () => {
    try {
      const response = await backendApi.captchaChallenge()
      return {
        success: true,
        captchaToken: response.captchaToken,
        captchaImage: response.captchaImage,
        expiresInSeconds: response.expiresInSeconds,
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to load captcha challenge.' }
    }
  }

  const login = async (identifier: string, password: string, captchaToken: string, captchaAnswer: string) => {
    try {
      const response = await backendApi.login(identifier.trim(), password, captchaToken, captchaAnswer)
      const payload = decodeToken(response.accessToken)
      if (payload?.type === 'member') {
        await loadMemberSession(response.accessToken)
      } else {
        await loadAdminSession(response.accessToken)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Authentication failed.' }
    }
  }

  const logout = () => {
    if (token) {
      void backendApi.adminLogout().catch(() => undefined)
    }

    setToken(null)
    setAdminUser(null)
    setMustResetPassword(false)
    localStorage.removeItem('adwest_token')

    setMemberToken(null)
    setMemberUser(null)
    localStorage.removeItem('adwest_member')
    localStorage.removeItem('adwest_member_token')
  }

  const changeOwnPassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await backendApi.changeOwnPassword(currentPassword, newPassword)
      setMustResetPassword(false)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to change password.' }
    }
  }

  const refreshAdminSession = async () => {
    if (!token) {
      return
    }

    await loadAdminSession(token)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        adminUser,
        memberUser,
        mustResetPassword,
        getCaptchaChallenge,
        login,
        logout,
        refreshAdminSession,
        changeOwnPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
