import axios from 'axios'

import { currentToken, keycloak } from '../auth/keycloak'

const DEFAULT_BASE_URL = 'http://localhost:8080'

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

export function requireAuthenticatedUser() {
  if (!keycloak.authenticated) {
    throw new Error('Please sign in to contribute to the circle.')
  }
  return { id: keycloak.subject }
}

apiClient.interceptors.request.use(async (config) => {
  const token = await currentToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
