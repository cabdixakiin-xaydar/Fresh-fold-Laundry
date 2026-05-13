const joinBase = (path: string) => {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  if (!base) {
    return path.startsWith('/') ? path : `/${path}`
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function messageFromErrorBody(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback
  }
  const d = data as { detail?: unknown }
  if (typeof d.detail === 'string') {
    return d.detail
  }
  if (Array.isArray(d.detail)) {
    return d.detail.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(', ')
  }
  return fallback
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(joinBase(path), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(messageFromErrorBody(data, res.statusText))
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(joinBase(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(messageFromErrorBody(data, res.statusText))
    ;(err as Error & { status?: number; data?: unknown }).status = res.status
    ;(err as Error & { data?: unknown }).data = data
    throw err
  }
  return res.json() as Promise<T>
}

export function pdfUrlForOrder(orderNumber: string): string {
  return joinBase(
    `/api/v1/invoices/by-order/${encodeURIComponent(orderNumber)}/receipt.pdf`
  )
}
