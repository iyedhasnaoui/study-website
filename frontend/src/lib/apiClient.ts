import axios from 'axios'

import type { AppRole } from '../auth/types'
import { currentToken, keycloak } from '../auth/keycloak'

const DEFAULT_BASE_URL = 'http://localhost:8080'
const DEV_ROLE_OVERRIDE_KEY = 'dev_role_override'
const APP_ROLES = ['VIEWER', 'CONTRIBUTOR', 'ADMIN'] as const

const isAppRole = (role: unknown): role is AppRole => APP_ROLES.some((appRole) => appRole === role)

if (typeof window !== 'undefined') {
  window.localStorage.removeItem(DEV_ROLE_OVERRIDE_KEY)
}

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '')

export const apiClient = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL?.trim() ?? DEFAULT_BASE_URL),
})

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const baseUrl = String(apiClient.defaults.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) {
      const message = (error.response.data as { message?: unknown } | undefined)?.message
      return typeof message === 'string' && message.trim()
        ? message
        : 'Your role does not allow this action.'
    }
    if (error.response?.status === 401) {
      return 'Please sign in to continue.'
    }
    const message = (error.response?.data as { message?: unknown } | undefined)?.message
    if (typeof message === 'string' && message.trim()) return message
    if (!error.response) return 'The API server is not reachable. Check that the backend is running.'
  }
  return error instanceof Error && error.message ? error.message : fallback
}

/** True when the backend refused the action because of the caller's role. */
export function isForbidden(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403
}

export function getDevRoleOverride(): AppRole | null {
  if (typeof window === 'undefined') return null
  if (!import.meta.env.DEV) {
    window.sessionStorage.removeItem(DEV_ROLE_OVERRIDE_KEY)
    return null
  }

  const stored = window.sessionStorage.getItem(DEV_ROLE_OVERRIDE_KEY)
  if (!stored) return null

  try {
    const value: unknown = JSON.parse(stored)
    if (typeof value !== 'object' || value === null || !('role' in value) || !('subject' in value)) {
      window.sessionStorage.removeItem(DEV_ROLE_OVERRIDE_KEY)
      return null
    }
    if (
      !keycloak.authenticated ||
      !keycloak.subject ||
      value.subject !== keycloak.subject ||
      !isAppRole(value.role)
    ) {
      window.sessionStorage.removeItem(DEV_ROLE_OVERRIDE_KEY)
      return null
    }
    return value.role
  } catch {
    window.sessionStorage.removeItem(DEV_ROLE_OVERRIDE_KEY)
    return null
  }
}

export function setDevRoleOverride(role: AppRole | null): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(DEV_ROLE_OVERRIDE_KEY)
  if (!import.meta.env.DEV || !role || !keycloak.authenticated || !keycloak.subject) {
    window.sessionStorage.removeItem(DEV_ROLE_OVERRIDE_KEY)
    return
  }
  window.sessionStorage.setItem(DEV_ROLE_OVERRIDE_KEY, JSON.stringify({ role, subject: keycloak.subject }))
}

export function requireAuthenticatedUser() {
  if (!keycloak.authenticated) {
    throw new Error('Please sign in to contribute to the circle.')
  }
  return { id: keycloak.subject }
}

apiClient.interceptors.request.use(async (config) => {
  delete config.headers['X-Dev-Role']
  const token = await currentToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    if (import.meta.env.DEV) {
      const devRole = getDevRoleOverride()
      if (devRole) {
        config.headers['X-Dev-Role'] = devRole
      }
    }
  }
  return config
})