import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { apiClient, getApiErrorMessage, getDevRoleOverride, setDevRoleOverride } from '../lib/apiClient'
import { initKeycloak, keycloak } from './keycloak'
import type { AppRole, AuthSession, CurrentUser } from './types'

interface AuthContextValue {
  session: AuthSession | null
  role: AppRole | null
  canContribute: boolean
  isAdmin: boolean
  isReady: boolean
  isAuthenticated: boolean
  roleError: string | null
  login: () => void
  register: () => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
  overrideRole: (role: AppRole | null) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  const loadMe = useCallback(async () => {
    if (!keycloak.authenticated) {
      setDevRoleOverride(null)
      setMe(null)
      setRoleError(null)
      return null
    }
    try {
      const response = await apiClient.get<CurrentUser>('/api/me')
      setMe(response.data)
      setRoleError(null)
      return response.data
    } catch (error) {
      setRoleError(getApiErrorMessage(error, 'Unable to confirm your role with the backend.'))
      throw error
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      await initKeycloak()
      if (cancelled) return
      await loadMe().catch(() => null)
      if (!cancelled) setIsReady(true)
    }

    void start()
    return () => {
      cancelled = true
    }
  }, [loadMe])

  const overrideRole = useCallback(async (role: AppRole | null) => {
    if (!import.meta.env.DEV) return
    const subject = keycloak.subject
    const previousRole = getDevRoleOverride()
    setRoleError(null)
    setDevRoleOverride(role)
    try {
      const confirmedUser = await loadMe()
      if (!confirmedUser) throw new Error('The backend could not confirm your role.')
      if (role && confirmedUser.role !== role) {
        throw new Error(
          `The backend returned ${confirmedUser.role} instead of ${role}. ` +
          `The development role override may be inactive. Start the backend with exactly ` +
          `./gradlew bootRun --args='--spring.profiles.active=dev'.`
        )
      }
    } catch (error) {
      setDevRoleOverride(keycloak.subject === subject ? previousRole : null)
      const message = getApiErrorMessage(error, 'The backend could not confirm your role.')
      setRoleError(message)
      throw new Error(message)
    }
  }, [loadMe])

  const isAuthenticated = Boolean(keycloak.authenticated)

  const value = useMemo<AuthContextValue>(() => ({
    session: me ? { user: { id: me.userId, username: me.username, email: me.email, role: me.role, roles: [me.role] } } : null,
    role: me?.role ?? null,
    canContribute: me?.canContribute ?? false,
    isAdmin: me?.canAdminister ?? false,
    isReady,
    isAuthenticated,
    roleError,
    login: () => void keycloak.login({ redirectUri: window.location.href }),
    register: () => void keycloak.register({ redirectUri: window.location.href }),
    logout: async () => {
      setMe(null)
      setDevRoleOverride(null)
      setRoleError(null)
      await keycloak.logout({ redirectUri: window.location.origin })
    },
    refresh: async () => { await loadMe() },
    overrideRole,
  }), [me, isReady, isAuthenticated, roleError, loadMe, overrideRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}