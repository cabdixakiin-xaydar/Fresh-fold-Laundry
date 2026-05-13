import { apiUrl } from './config'
import { TOKEN_STORAGE_KEY } from './constants'
import type { Paginated } from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

function buildHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getStoredToken()
  if (token) {
    headers.set('Authorization', `Token ${token}`)
  }
  return headers
}

function parseErrorMessage(body: unknown, status: string): string {
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>
    if (typeof o.detail === 'string') return o.detail
    if (Array.isArray(o.detail) && o.detail.length > 0) {
      return o.detail.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')
    }
    if (Array.isArray(o.non_field_errors) && typeof o.non_field_errors[0] === 'string') {
      return o.non_field_errors[0]
    }
    const fieldParts: string[] = []
    for (const [key, value] of Object.entries(o)) {
      if (key === 'detail' || key === 'non_field_errors') continue
      if (typeof value === 'string') {
        fieldParts.push(`${key}: ${value}`)
      } else if (Array.isArray(value)) {
        fieldParts.push(`${key}: ${value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')}`)
      }
    }
    if (fieldParts.length > 0) {
      return fieldParts.join(' ')
    }
  }
  return status || 'Request failed'
}

async function requestUrl<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = buildHeaders(init)

  const res = await fetch(url, {
    ...init,
    headers,
  })

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const msg = parseErrorMessage(data, res.statusText)
    throw new ApiError(msg, res.status, data)
  }

  return data as T
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return requestUrl<T>(apiUrl(path), init)
}

export async function apiBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const headers = buildHeaders(init)
  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
  })
  if (!res.ok) {
    const text = await res.text()
    let data: unknown = text
    try {
      data = JSON.parse(text) as unknown
    } catch {
      // keep raw text
    }
    const msg = parseErrorMessage(data, res.statusText)
    throw new ApiError(msg, res.status, data)
  }
  return res.blob()
}

export async function apiPage<T>(path: string): Promise<Paginated<T>> {
  const data = await apiRequest<Paginated<T> | T[]>(path)
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    }
  }
  return data
}

export async function apiList<T>(path: string): Promise<T[]> {
  const firstPage = await apiPage<T>(path)
  const results = [...firstPage.results]
  let next = firstPage.next

  while (next) {
    const page = await requestUrl<Paginated<T> | T[]>(next)
    if (Array.isArray(page)) {
      results.push(...page)
      next = null
    } else {
      results.push(...page.results)
      next = page.next
    }
  }

  return results
}
