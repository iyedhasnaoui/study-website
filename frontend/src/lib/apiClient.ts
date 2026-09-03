import axios from 'axios'

import type { AuthSession } from '../auth/types'

const DEFAULT_BASE_URL = 'http://localhost:8080'
export const AUTH_STORAGE_KEY = 'iac.auth.session'

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '')

export const apiClient = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL?.trim() ?? DEFAULT_BASE_URL),
  headers: {
    'Content-Type': 'application/json',
  },
})

export function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null

  const rawSession = window.sessionStorage.getItem(AUTH_STORAGE_KEY)
  if (!rawSession) return null

  try {
    const session = JSON.parse(rawSession) as AuthSession
    if (!session.accessToken || !session.user?.id || new Date(session.expiresAt).getTime() <= Date.now()) {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    return session
  } catch {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function requireAuthenticatedUser() {
  const session = readStoredSession()
  if (!session) {
    throw new Error('Please sign in to contribute to the circle.')
  }
  return session.user
}

apiClient.interceptors.request.use((config) => {
  const session = readStoredSession()
  if (session) {
    config.headers.Authorization = `${session.tokenType} ${session.accessToken}`
    config.headers['X-User-Id'] = String(session.user.id)
  }
  return config
})
