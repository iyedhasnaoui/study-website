import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { apiClient } from '../lib/apiClient'
import { initKeycloak, keycloak } from './keycloak'
import type { AppRole, AuthSession, CurrentUser } from './types'

interface AuthContextValue {
  session: AuthSession | null
  role: AppRole | null
  canContribute: boolean
  isAdmin: boolean
  isReady: boolean
  login: () => void
  register: () => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  // The role shown here comes from the backend, which reads it from the Keycloak token, so the
  // interface can never claim a permission the server would refuse.
  const loadMe = useCallback(async () => {
    if (!keycloak.authenticated) {
      setMe(null)
      return
    }
    try {
      const response = await apiClient.get<CurrentUser>('/api/me')
      setMe(response.data)
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      await initKeycloak()
      if (cancelled) return
      await loadMe()
      if (!cancelled) setIsReady(true)
    }

    void start()
    return () => {
      cancelled = true
    }
  }, [loadMe])

  const value = useMemo<AuthContextValue>(() => ({
    session: me ? { user: { id: me.userId, username: me.username, email: me.email, role: me.role, roles: [me.role] } } : null,
    role: me?.role ?? null,
    canContribute: me?.canContribute ?? false,
    isAdmin: me?.canAdminister ?? false,
    isReady,
    login: () => void keycloak.login({ redirectUri: window.location.href }),
    register: () => void keycloak.register({ redirectUri: window.location.href }),
    logout: async () => {
      setMe(null)
      await keycloak.logout({ redirectUri: window.location.origin })
    },
    refresh: loadMe,
  }), [me, isReady, loadMe])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
