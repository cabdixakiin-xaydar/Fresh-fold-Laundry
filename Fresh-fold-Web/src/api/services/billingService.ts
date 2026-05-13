import { apiBlob, apiList, apiPage, apiRequest } from '../client'
import type { Invoice, Paginated, Payment } from '../types'

export function listInvoices(params?: { payment_status?: string; q?: string; date?: string; order?: number }): Promise<Invoice[]> {
  const query = new URLSearchParams()
  if (params?.payment_status) query.set('payment_status', params.payment_status)
  if (params?.q) query.set('q', params.q)
  if (params?.date) query.set('date', params.date)
  if (params?.order != null) query.set('order', String(params.order))
  const suffix = query.toString() ? `?${query}` : ''
  return apiList<Invoice>(`invoices/${suffix}`)
}

export function listInvoicesPage(params?: {
  payment_status?: string
  q?: string
  date?: string
  page?: number
  order?: number
}): Promise<Paginated<Invoice>> {
  const query = new URLSearchParams()
  if (params?.payment_status) query.set('payment_status', params.payment_status)
  if (params?.q) query.set('q', params.q)
  if (params?.date) query.set('date', params.date)
  if (params?.page) query.set('page', String(params.page))
  if (params?.order != null) query.set('order', String(params.order))
  const suffix = query.toString() ? `?${query}` : ''
  return apiPage<Invoice>(`invoices/${suffix}`)
}

export function createInvoiceFromOrder(payload: { order_id: number; notes?: string }): Promise<Invoice> {
  return apiRequest<Invoice>('invoices/from-order/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createPayment(payload: {
  invoice: number
  amount: string
  method: 'cash' | 'card' | 'mobile' | 'other'
  reference?: string
}): Promise<Payment> {
  return apiRequest<Payment>('payments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function downloadReceiptPdf(invoiceId: number): Promise<Blob> {
  return apiBlob(`invoices/${invoiceId}/receipt.pdf`)
}
