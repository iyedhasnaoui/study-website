import axios from 'axios'

import { apiClient } from '../lib/apiClient'
import type { ApiErrorPayload, AuthSession, AuthUser, LoginPayload, RegisterPayload } from './types'

export async function registerAccount(payload: RegisterPayload): Promise<AuthUser> {
  const response = await apiClient.post<{ user: AuthUser }>('/api/auth/register', payload)
  return response.data.user
}

export async function loginAccount(payload: LoginPayload): Promise<AuthSession> {
  const response = await apiClient.post<AuthSession>('/api/auth/login', payload)
  return response.data
}

export async function logoutSession(): Promise<void> {
  await apiClient.delete('/api/auth/session')
}

export async function deleteAccount(): Promise<void> {
  await apiClient.delete('/api/users/me')
}

export function getAuthError(error: unknown, fallback: string): { message: string; fields: Record<string, string> } {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return {
      message: error.response?.data?.message || fallback,
      fields: error.response?.data?.fieldErrors || {},
    }
  }

  return {
    message: error instanceof Error ? error.message : fallback,
    fields: {},
  }
}
