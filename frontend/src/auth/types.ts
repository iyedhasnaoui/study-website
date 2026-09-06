export interface AuthUser {
  id: number
  username: string
  email: string
  roles: string[]
  joinedAt: string
}

export interface AuthSession {
  accessToken: string
  tokenType: 'Bearer'
  expiresAt: string
  user: AuthUser
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ApiErrorPayload {
  message?: string
  fieldErrors?: Record<string, string>
}
