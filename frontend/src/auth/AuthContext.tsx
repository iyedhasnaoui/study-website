import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import { AUTH_STORAGE_KEY, readStoredSession } from '../lib/apiClient'
import { deleteAccount, loginAccount, logoutSession, registerAccount } from './authApi'
import type { AuthSession, LoginPayload, RegisterPayload } from './types'

interface AuthContextValue {
  session: AuthSession | null
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  removeAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession())

  const saveSession = (nextSession: AuthSession | null) => {
    setSession(nextSession)
    if (nextSession) {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
    } else {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }

  const value = useMemo<AuthContextValue>(() => ({
    session,
    login: async (payload) => {
      const nextSession = await loginAccount(payload)
      saveSession(nextSession)
    },
    register: async (payload) => {
      await registerAccount(payload)
      const nextSession = await loginAccount({ email: payload.email, password: payload.password })
      saveSession(nextSession)
    },
    logout: async () => {
      try {
        await logoutSession()
      } finally {
        saveSession(null)
      }
    },
    removeAccount: async () => {
      await deleteAccount()
      saveSession(null)
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
