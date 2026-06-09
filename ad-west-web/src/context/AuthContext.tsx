import React, { useEffect, useState } from 'react'
import { Contact } from '../types'
import { backendApi, toUiRole } from '../utils/backendApi'
import { AdminSessionUser, AuthContext } from './auth-context'

interface SessionPayload {
  sub: string
  type: 'admin' | 'member'
  roles?: string[]
  authProvider?: 'password' | 'google'
  code?: string
  name?: string
  email?: string
  picture?: string
  gender?: string
  origin?: 'admin' | 'user'
  sid: string
  exp: number
  mustResetPassword?: boolean
}

interface GoogleAuthMessage {
  type: 'adwest-google-auth'
  success: boolean
  accessToken?: string
  profile?: {
    name: string
    email: string
    picture?: string
  }
  error?: string
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
  const [isInitializing, setIsInitializing] = useState<boolean>(true)

  const loadAdminSession = async (adminToken: string) => {
    localStorage.setItem('adwest_token', adminToken)
    setToken(adminToken)

    const payload = decodeToken(adminToken)
    if (!payload || payload.type !== 'admin') {
      setAdminUser(null)
      setToken(null)
      localStorage.removeItem('adwest_token')
      return
    }

    setMustResetPassword(payload.mustResetPassword === true)

    const normalizeRole = (value: string): string =>
      value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
    const isTokenSuperAdmin = payload.origin === 'user'
      || (payload.roles ?? []).some((role) => normalizeRole(role) === 'SUPERADMIN')

    // Build session from the signed token payload — always valid when token is valid
    const tokenUser: AdminSessionUser = {
      sub: payload.sub,
      code: payload.code ?? payload.sub,
      name: payload.name ?? payload.code ?? payload.email ?? payload.sub,
      email: payload.email ?? `${payload.code ?? payload.sub}@adwest.local`,
      picture: payload.picture,
      gender: payload.gender,
      authProvider: payload.authProvider ?? 'password',
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
          const mappedRoles = current.roles.map((role) => ({
            role: toUiRole(role.role),
            scopeType: role.scopeType,
            scopeId: role.scopeId || 'global',
          }))

          if (isTokenSuperAdmin && !mappedRoles.some((role) => normalizeRole(String(role.role)) === 'SUPERADMIN')) {
            mappedRoles.push({ role: 'Super Admin', scopeType: 'global', scopeId: 'global' })
          }

          setAdminUser({
            sub: current.id,
            code: current.code,
            name: payload.name ?? current.name,
            email: payload.email ?? current.email,
            picture: payload.picture,
            authProvider: payload.authProvider ?? 'password',
            roles: mappedRoles,
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
      setMemberToken(null)
      localStorage.removeItem('adwest_member_token')
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
    let cancelled = false

    const initializeSession = async () => {
      if (token) {
        await loadAdminSession(token)
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
        await loadMemberSession(memberToken)
      }
    }

    initializeSession().finally(() => {
      if (!cancelled) {
        setIsInitializing(false)
      }
    })

    return () => {
      cancelled = true
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

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const popup = window.open(
        backendApi.buildGoogleStartUrl(window.location.origin),
        'adwest-google-auth',
        'width=520,height=700,left=200,top=100',
      )

      if (!popup) {
        resolve({ success: false, error: 'Popup blocked. Allow popups and try again.' })
        return
      }

      const timeoutId = window.setTimeout(() => {
        cleanup()
        resolve({ success: false, error: 'Google sign-in timed out. Please try again.' })
      }, 120000)

      const closeWatcher = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(closeWatcher)
          cleanup(false)
          resolve({ success: false, error: 'Google sign-in was cancelled.' })
        }
      }, 400)

      const onMessage = (event: MessageEvent<GoogleAuthMessage>) => {
        const apiProxyTarget = import.meta.env.VITE_API_PROXY_TARGET as string | undefined
        const apiOrigin = apiProxyTarget ? new URL(apiProxyTarget).origin : null
        const isAllowedOrigin =
          event.origin === window.location.origin ||
          (apiOrigin !== null && event.origin === apiOrigin)
        if (!isAllowedOrigin) {
          return
        }

        const message = event.data
        if (!message || message.type !== 'adwest-google-auth') {
          return
        }

        window.clearInterval(closeWatcher)
        cleanup()

        if (!message.success || !message.accessToken) {
          resolve({ success: false, error: message.error || 'Google sign-in failed.' })
          return
        }

        void loadAdminSession(message.accessToken)
          .then(() => resolve({ success: true }))
          .catch(() => resolve({ success: false, error: 'Unable to initialize session after Google sign-in.' }))
      }

      function cleanup(removeListener = true) {
        window.clearTimeout(timeoutId)
        if (removeListener) {
          window.removeEventListener('message', onMessage)
        }
      }

      window.addEventListener('message', onMessage)
    })
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
        memberToken,
        adminUser,
        memberUser,
        mustResetPassword,
        isInitializing,
        getCaptchaChallenge,
        login,
        loginWithGoogle,
        logout,
        refreshAdminSession,
        changeOwnPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
