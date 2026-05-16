import { apiList, apiPage, apiRequest } from '../client'
import type { Paginated, User, UserDetail } from '../types'

export function listUsers(params?: {
  q?: string
  role?: string
  account_type?: 'staff' | 'customer'
  is_active?: boolean
}): Promise<User[]> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.role) query.set('role', params.role)
  if (params?.account_type) query.set('account_type', params.account_type)
  if (params?.is_active != null) query.set('is_active', String(params.is_active))
  const suffix = query.toString() ? `?${query}` : ''
  return apiList<User>(`auth/users/${suffix}`)
}

export function listUsersPage(params?: {
  q?: string
  role?: string
  account_type?: 'staff' | 'customer'
  is_active?: boolean
  page?: number
}): Promise<Paginated<User>> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.role) query.set('role', params.role)
  if (params?.account_type) query.set('account_type', params.account_type)
  if (params?.is_active != null) query.set('is_active', String(params.is_active))
  if (params?.page) query.set('page', String(params.page))
  const suffix = query.toString() ? `?${query}` : ''
  return apiPage<User>(`auth/users/${suffix}`)
}

export function getUser(id: number): Promise<UserDetail> {
  return apiRequest<UserDetail>(`auth/users/${id}/`)
}

export function createUser(payload: {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
  role: string
  phone?: string
  is_active?: boolean
}): Promise<User> {
  return apiRequest<User>('auth/users/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateUser(
  id: number,
  payload: Partial<{
    email: string
    first_name: string
    last_name: string
    role: string
    phone: string
    is_active: boolean
  }>,
): Promise<User> {
  return apiRequest<User>(`auth/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
