const KEY = 'access_token';

export function getToken() {
  return localStorage.getItem(KEY) || '';
}
export function setToken(token: string) {
  localStorage.setItem(KEY, token);
}
export function clearToken() {
  localStorage.removeItem(KEY);
}
export function parseJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function isTokenValid(token: string | null): boolean {
  if (!token) return false
  const payload = parseJwt(token)
  if (!payload?.exp) return true // if no exp, assume valid
  const now = Math.floor(Date.now() / 1000)
  return payload.exp > now
}

export function isAuthenticated(): boolean {
  return isTokenValid(getToken())
}

export type JwtPayload = { exp?: number; iat?: number; [k: string]: any }