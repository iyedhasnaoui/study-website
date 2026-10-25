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
  overrideRole?: (role: AppRole) => void // Added for development testing
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [devRoleOverride, setDevRoleOverride] = useState<AppRole | null>(null)

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

  // DEV OVERRIDE INTERCEPTOR: Safe for production as it requires Vite's DEV flag
  const effectiveMe = useMemo(() => {
    if (!me) return null
    if (import.meta.env.DEV && devRoleOverride) {
      return {
        ...me,
        role: devRoleOverride,
        canAdminister: devRoleOverride === 'ADMIN',
        canContribute: true,
      }
    }
    return me
  }, [me, devRoleOverride])

  const overrideRole = useCallback((role: AppRole) => {
    if (import.meta.env.DEV) {
      setDevRoleOverride(role)
      localStorage.setItem('dev_role_override', role)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session: effectiveMe ? { user: { id: effectiveMe.userId, username: effectiveMe.username, email: effectiveMe.email, role: effectiveMe.role, roles: [effectiveMe.role] } } : null,
    role: effectiveMe?.role ?? null,
    canContribute: effectiveMe?.canContribute ?? false,
    isAdmin: effectiveMe?.canAdminister ?? false,
    isReady,
    login: () => void keycloak.login({ redirectUri: window.location.href }),
    register: () => void keycloak.register({ redirectUri: window.location.href }),
    logout: async () => {
      setMe(null)
      setDevRoleOverride(null)
      await keycloak.logout({ redirectUri: window.location.origin })
    },
    refresh: loadMe,
    overrideRole,
  }), [effectiveMe, isReady, loadMe, overrideRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}