/** Staff & customer portal (Fresh-fold-Web). */
export function appAuthUrl(params?: { mode?: 'login' | 'register'; portal?: 'staff' | 'customer' }) {
  const base = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:5173'
  const search = new URLSearchParams()
  if (params?.mode) search.set('mode', params.mode)
  if (params?.portal) search.set('portal', params.portal)
  const q = search.toString()
  return q ? `${base}/auth?${q}` : `${base}/auth`
}
