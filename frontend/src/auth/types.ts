export type AppRole = 'VIEWER' | 'CONTRIBUTOR' | 'ADMIN'

export const ROLE_LABELS: Record<AppRole, string> = {
  VIEWER: 'Viewer',
  CONTRIBUTOR: 'Contributor',
  ADMIN: 'Administrator',
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  VIEWER: 'You can browse everything. Ask an administrator for contributor access to publish.',
  CONTRIBUTOR: 'You can create and edit your own contributions.',
  ADMIN: 'You can manage all content and all members.',
}

/** Mirrors the backend's /api/me response. */
export interface CurrentUser {
  userId: number
  keycloakId: string
  username: string
  email: string
  role: AppRole
  canContribute: boolean
  canAdminister: boolean
}

export interface AuthUser {
  id: number
  username: string
  email: string
  role: AppRole
  roles: string[]
}

export interface AuthSession {
  user: AuthUser
}

export interface ManagedUser {
  keycloakId: string
  localUserId: number | null
  username: string
  email: string | null
  role: AppRole
  enabled: boolean
  banned: boolean
  activeSessions: number
  protectedAccount: boolean
}

export interface ApiErrorPayload {
  message?: string
  fieldErrors?: Record<string, string>
}
