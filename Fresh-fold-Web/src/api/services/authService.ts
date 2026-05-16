import { apiRequest } from '../client'
import type { LoginResponse, User } from '../types'

export async function login(username: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function register(payload: {
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone?: string
  account_type: 'staff' | 'customer'
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function logout(): Promise<void> {
  await apiRequest<unknown>('auth/logout/', { method: 'POST', body: '{}' })
}

export async function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>('auth/me/')
}
