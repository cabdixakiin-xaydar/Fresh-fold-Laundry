/**
 * API origin for production builds, e.g. https://api.example.com
 * Leave empty in development so requests hit the Vite proxy (/api → Django).
 */
export function getApiOrigin(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
}

/** Full URL for a path under /api/v1 (path without leading slash). */
export function apiUrl(path: string): string {
  const trimmed = path.startsWith('/') ? path.slice(1) : path
  const origin = getApiOrigin()
  const prefix = origin ? `${origin}/api/v1` : '/api/v1'
  return `${prefix}/${trimmed}`
}
