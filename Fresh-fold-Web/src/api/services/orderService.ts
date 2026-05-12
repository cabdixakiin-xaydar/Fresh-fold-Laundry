import { apiList, apiPage, apiRequest } from '../client'
import type { Order, OrderItem, Paginated, ServiceType } from '../types'

export function listServiceTypes(): Promise<ServiceType[]> {
  return apiList<ServiceType>('service-types/')
}

export function listOrders(params?: {
  status?: string
  customer?: number
  q?: string
  service_type?: number | string
  date?: string
}): Promise<Order[]> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.customer != null) q.set('customer', String(params.customer))
  if (params?.q) q.set('q', params.q)
  if (params?.service_type != null && params.service_type !== '') q.set('service_type', String(params.service_type))
  if (params?.date) q.set('date', params.date)
  const suffix = q.toString() ? `?${q}` : ''
  return apiList<Order>(`orders/${suffix}`)
}

export function listOrdersPage(params?: {
  status?: string
  customer?: number
  q?: string
  service_type?: number | string
  date?: string
  page?: number
}): Promise<Paginated<Order>> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.customer != null) q.set('customer', String(params.customer))
  if (params?.q) q.set('q', params.q)
  if (params?.service_type != null && params.service_type !== '') q.set('service_type', String(params.service_type))
  if (params?.date) q.set('date', params.date)
  if (params?.page) q.set('page', String(params.page))
  const suffix = q.toString() ? `?${q}` : ''
  return apiPage<Order>(`orders/${suffix}`)
}

export function getOrder(id: number): Promise<Order> {
  return apiRequest<Order>(`orders/${id}/`)
}

export function createOrder(payload: {
  customer: number
  special_instructions?: string
  is_express?: boolean
  items: Array<{ service_type: number; quantity?: number; weight_kg?: string | null }>
}): Promise<Order> {
  return apiRequest<Order>('orders/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateOrder(
  id: number,
  payload: {
    customer?: number
    special_instructions?: string
    is_express?: boolean
    status?: string
  },
): Promise<Order> {
  return apiRequest<Order>(`orders/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteOrder(id: number): Promise<void> {
  return apiRequest<void>(`orders/${id}/`, {
    method: 'DELETE',
  })
}

export function updateOrderStatus(id: number, status: string): Promise<Order> {
  return apiRequest<Order>(`orders/${id}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function createOrderItem(payload: {
  order: number
  service_type: number
  quantity?: number
  weight_kg?: string | null
}): Promise<OrderItem> {
  return apiRequest<OrderItem>(`order-items/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateOrderItem(
  id: number,
  payload: {
    service_type?: number
    quantity?: number
    weight_kg?: string | null
  },
): Promise<OrderItem> {
  return apiRequest<OrderItem>(`order-items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteOrderItem(id: number): Promise<void> {
  return apiRequest<void>(`order-items/${id}/`, {
    method: 'DELETE',
  })
}

export function createWebBooking(payload: {
  customer: {
    name: string
    phone: string
    email?: string
    address?: string
    preferences?: string
    notes?: string
  }
  special_instructions?: string
  is_express?: boolean
  items: Array<{ service_type: number; quantity?: number; weight_kg?: string | null }>
}): Promise<Order> {
  return apiRequest<Order>('orders/web-booking/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
