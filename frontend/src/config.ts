/**
 * Central runtime configuration. Every value comes from a Vite env var (see .env.example) and
 * falls back to the local-development default, so nothing needs to be set locally.
 */
const read = (value: string | undefined, fallback: string): string => value?.trim() || fallback

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '')

/** Base URL of the Spring Boot API, without a trailing slash. */
export const API_BASE_URL = stripTrailingSlashes(read(import.meta.env.VITE_API_BASE_URL, 'http://localhost:8080'))

export const KEYCLOAK_URL = read(import.meta.env.VITE_KEYCLOAK_URL, 'http://localhost:8081')
export const KEYCLOAK_REALM = read(import.meta.env.VITE_KEYCLOAK_REALM, 'iac')
export const KEYCLOAK_CLIENT_ID = read(import.meta.env.VITE_KEYCLOAK_CLIENT_ID, 'iac-frontend')

/** WebSocket base URL derived from the API base URL (http -> ws, https -> wss). No WebSockets are used today. */
export const WS_BASE_URL = API_BASE_URL.replace(/^http/i, 'ws')
