/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API, e.g. https://api.example.com (default http://localhost:8080). */
  readonly VITE_API_BASE_URL?: string
  /** Keycloak server URL (default http://localhost:8081). */
  readonly VITE_KEYCLOAK_URL?: string
  /** Keycloak realm (default iac). */
  readonly VITE_KEYCLOAK_REALM?: string
  /** Keycloak public client id (default iac-frontend). */
  readonly VITE_KEYCLOAK_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
