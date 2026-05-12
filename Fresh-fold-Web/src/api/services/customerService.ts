import { apiList, apiPage, apiRequest } from '../client'
import type { Customer, CustomerDetail, CustomerTransaction, Paginated } from '../types'

export function listCustomers(params?: { q?: string; tier?: 'gold' | 'silver' | 'regular' }): Promise<Customer[]> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.tier) query.set('tier', params.tier)
  const suffix = query.toString() ? `?${query}` : ''
  return apiList<Customer>(`customers/${suffix}`)
}

export function listCustomersPage(params?: {
  q?: string
  tier?: 'gold' | 'silver' | 'regular'
  page?: number
}): Promise<Paginated<Customer>> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.tier) query.set('tier', params.tier)
  if (params?.page) query.set('page', String(params.page))
  const suffix = query.toString() ? `?${query}` : ''
  return apiPage<Customer>(`customers/${suffix}`)
}

export function getCustomer(id: number): Promise<CustomerDetail> {
  return apiRequest<CustomerDetail>(`customers/${id}/`)
}

export function getCustomerTransactions(id: number): Promise<CustomerTransaction[]> {
  return apiRequest<CustomerTransaction[]>(`customers/${id}/transactions/`)
}

export function createCustomer(payload: {
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  preferences?: string
}): Promise<Customer> {
  return apiRequest<Customer>('customers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCustomer(
  id: number,
  payload: {
    name?: string
    phone?: string
    email?: string
    address?: string
    notes?: string
    preferences?: string
  },
): Promise<Customer> {
  return apiRequest<Customer>(`customers/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
