/**
 * OAuth 2.0 Authorization Code Flow with PKCE (RFC 7636) against Keycloak OIDC.
 * Tokens are issued exclusively by Keycloak (RS256) and verified by FastAPI via JWKS.
 */

export const OIDC_AUTHORITY =
  import.meta.env.VITE_OIDC_AUTHORITY || 'http://localhost:8180/realms/stockexchange';
export const OIDC_CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID || 'stockexchange-web';

const STORAGE_TOKEN_KEY = 'stockexchange.oidc.tokens';
const STORAGE_PKCE_VERIFIER = 'stockexchange.oidc.pkce_verifier';
const STORAGE_OIDC_STATE = 'stockexchange.oidc.state';

export interface OidcTokenSet {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_at: number; // epoch ms
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomVerifier(length = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join('');
}

async function sha256Challenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return base64UrlEncode(digest);
}

export function getStoredTokens(): OidcTokenSet | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OidcTokenSet;
  } catch {
    return null;
  }
}

export function saveTokens(tokenResp: {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
}): OidcTokenSet {
  const expiresAt = Date.now() + (tokenResp.expires_in ?? 900) * 1000 - 15_000;
  const set: OidcTokenSet = {
    access_token: tokenResp.access_token,
    refresh_token: tokenResp.refresh_token,
    id_token: tokenResp.id_token,
    expires_at: expiresAt,
  };
  sessionStorage.setItem(STORAGE_TOKEN_KEY, JSON.stringify(set));
  return set;
}

export function clearStoredTokens(): void {
  sessionStorage.removeItem(STORAGE_TOKEN_KEY);
  sessionStorage.removeItem(STORAGE_PKCE_VERIFIER);
  sessionStorage.removeItem(STORAGE_OIDC_STATE);
}

export async function startPkceLogin(action: 'login' | 'register' = 'login'): Promise<void> {
  const verifier = randomVerifier();
  const challenge = await sha256Challenge(verifier);
  const state = randomVerifier(24);
  sessionStorage.setItem(STORAGE_PKCE_VERIFIER, verifier);
  sessionStorage.setItem(STORAGE_OIDC_STATE, state);

  const redirectUri = `${window.location.origin}/auth/callback`;
  const endpoint =
    action === 'register'
      ? `${OIDC_AUTHORITY}/protocol/openid-connect/registrations`
      : `${OIDC_AUTHORITY}/protocol/openid-connect/auth`;

  const params = new URLSearchParams({
    client_id: OIDC_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });
  window.location.assign(`${endpoint}?${params.toString()}`);
}

export async function completePkceCallback(code: string, state: string): Promise<OidcTokenSet> {
  const expectedState = sessionStorage.getItem(STORAGE_OIDC_STATE);
  const verifier = sessionStorage.getItem(STORAGE_PKCE_VERIFIER);
  if (!expectedState || state !== expectedState || !verifier) {
    throw new Error('OIDC PKCE state verification failed. Please retry sign-in.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: OIDC_CLIENT_ID,
    code,
    redirect_uri: `${window.location.origin}/auth/callback`,
    code_verifier: verifier,
  });

  const resp = await fetch(`${OIDC_AUTHORITY}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OIDC token exchange failed (${resp.status}): ${errText}`);
  }
  const data = await resp.json();
  sessionStorage.removeItem(STORAGE_PKCE_VERIFIER);
  sessionStorage.removeItem(STORAGE_OIDC_STATE);
  return saveTokens(data);
}

/**
 * Sandbox credential grant against Keycloak's OIDC token endpoint so users and automated tests
 * can authenticate seamlessly with real Keycloak RS256 JWTs.
 */
export async function loginWithKeycloakPassword(
  username: string,
  password: string,
  clientId = OIDC_CLIENT_ID,
): Promise<OidcTokenSet> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    username,
    password,
    scope: 'openid profile email',
  });
  const resp = await fetch(`${OIDC_AUTHORITY}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error_description || 'Invalid credentials or Identity Provider unavailable.');
  }
  return saveTokens(await resp.json());
}

export async function refreshAccessToken(): Promise<OidcTokenSet | null> {
  const current = getStoredTokens();
  if (!current?.refresh_token) return null;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: OIDC_CLIENT_ID,
    refresh_token: current.refresh_token,
  });
  const resp = await fetch(`${OIDC_AUTHORITY}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    clearStoredTokens();
    return null;
  }
  return saveTokens(await resp.json());
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;
  if (Date.now() < tokens.expires_at) return tokens.access_token;
  const refreshed = await refreshAccessToken();
  return refreshed?.access_token ?? null;
}

export function getKeycloakAccountUrl(): string {
  return `${OIDC_AUTHORITY}/account`;
}

export function getKeycloakResetPasswordUrl(): string {
  return `${OIDC_AUTHORITY}/login-actions/reset-credentials?client_id=${encodeURIComponent(OIDC_CLIENT_ID)}`;
}
