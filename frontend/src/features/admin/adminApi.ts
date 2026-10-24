import { apiClient } from '../../lib/apiClient'
import type { AppRole, ManagedUser } from '../../auth/types'

export async function listUsers(): Promise<ManagedUser[]> {
  const response = await apiClient.get<ManagedUser[]>('/api/admin/users')
  return response.data
}

export async function changeRole(keycloakId: string, role: AppRole): Promise<void> {
  await apiClient.put(`/api/admin/users/${keycloakId}/role`, { role })
}

export async function setBanned(keycloakId: string, banned: boolean): Promise<void> {
  await apiClient.put(`/api/admin/users/${keycloakId}/ban`, { banned })
}

export async function endSessions(keycloakId: string): Promise<void> {
  await apiClient.post(`/api/admin/users/${keycloakId}/logout`)
}

export async function removeUser(keycloakId: string): Promise<void> {
  await apiClient.delete(`/api/admin/users/${keycloakId}`)
}
