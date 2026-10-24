import Keycloak from 'keycloak-js'

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL?.trim() || 'http://localhost:8081'
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM?.trim() || 'iac'
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID?.trim() || 'iac-frontend'

export const keycloak = new Keycloak({
  url: KEYCLOAK_URL,
  realm: KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT_ID,
})

/**
 * Keycloak must be initialised exactly once per page load; React's development double-render
 * would otherwise start two authentication flows and lose the authorization code.
 */
let initialisation: Promise<boolean> | null = null

export function initKeycloak(): Promise<boolean> {
  if (!initialisation) {
    initialisation = keycloak
      .init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      })
      .catch(() => false)
  }
  return initialisation
}

/** Keeps the access token valid; returns null when the viewer is not signed in. */
export async function currentToken(): Promise<string | null> {
  if (!keycloak.authenticated) return null
  try {
    await keycloak.updateToken(30)
  } catch {
    return null
  }
  return keycloak.token ?? null
}

export function realmRoles(): string[] {
  return keycloak.tokenParsed?.realm_access?.roles ?? []
}
