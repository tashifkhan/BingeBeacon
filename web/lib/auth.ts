// ============================================================
// BingeBeacon — Token Management
// Access & refresh tokens stored in localStorage.
// ============================================================

const ACCESS_TOKEN_KEY = "bb_access_token";
const QUERY_CACHE_KEY = "bb-query-cache";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(accessToken: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
	localStorage.removeItem(QUERY_CACHE_KEY);
	if ("caches" in window) {
		void window.caches.delete("api-cache");
	}
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Parse the JWT payload to check expiration.
 * Returns true if the token is expired or unparseable.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Allow 30 seconds of leeway
    return payload.exp * 1000 < Date.now() - 30_000;
  } catch {
    return true;
  }
}

/**
 * Extract the user ID from the JWT payload.
 */
export function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? payload.user_id ?? null;
  } catch {
    return null;
  }
}
