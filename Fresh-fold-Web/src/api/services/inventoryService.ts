import { apiList, apiPage, apiRequest } from '../client'
import type { InventoryItemRow, Paginated, StockMovement, Supplier } from '../types'

export function listItems(params?: { q?: string; supplier?: number | string }): Promise<InventoryItemRow[]> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.supplier != null && params.supplier !== '') query.set('supplier', String(params.supplier))
  const suffix = query.toString() ? `?${query}` : ''
  return apiList<InventoryItemRow>(`items/${suffix}`)
}

export function listItemsPage(params?: {
  q?: string
  supplier?: number | string
  page?: number
}): Promise<Paginated<InventoryItemRow>> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.supplier != null && params.supplier !== '') query.set('supplier', String(params.supplier))
  if (params?.page) query.set('page', String(params.page))
  const suffix = query.toString() ? `?${query}` : ''
  return apiPage<InventoryItemRow>(`items/${suffix}`)
}

/** Low-stock items (custom action returns a JSON array). */
export function listLowStock(params?: { q?: string; supplier?: number | string }): Promise<InventoryItemRow[]> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.supplier != null && params.supplier !== '') query.set('supplier', String(params.supplier))
  const suffix = query.toString() ? `?${query}` : ''
  return apiRequest<InventoryItemRow[]>(`items/low-stock/${suffix}`)
}

export function listSuppliers(): Promise<Supplier[]> {
  return apiList<Supplier>('suppliers/')
}

export function createSupplier(payload: {
  name: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}): Promise<Supplier> {
  return apiRequest<Supplier>('suppliers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSupplier(
  id: number,
  payload: {
    name?: string
    contact_name?: string
    phone?: string
    email?: string
    address?: string
    notes?: string
  },
): Promise<Supplier> {
  return apiRequest<Supplier>(`suppliers/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteSupplier(id: number): Promise<void> {
  return apiRequest<void>(`suppliers/${id}/`, {
    method: 'DELETE',
  })
}

export function createItem(payload: {
  name: string
  sku: string
  quantity: string
  unit: string
  low_stock_threshold: string
  supplier?: number | null
}): Promise<InventoryItemRow> {
  return apiRequest<InventoryItemRow>('items/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateItem(
  id: number,
  payload: {
    name?: string
    sku?: string
    quantity?: string
    unit?: string
    low_stock_threshold?: string
    supplier?: number | null
  },
): Promise<InventoryItemRow> {
  return apiRequest<InventoryItemRow>(`items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteItem(id: number): Promise<void> {
  return apiRequest<void>(`items/${id}/`, {
    method: 'DELETE',
  })
}

export function listStockMovements(params?: { item?: number | string }): Promise<StockMovement[]> {
  const query = new URLSearchParams()
  if (params?.item != null && params.item !== '') query.set('item', String(params.item))
  const suffix = query.toString() ? `?${query}` : ''
  return apiList<StockMovement>(`stock-movements/${suffix}`)
}

export function createStockMovement(payload: {
  item: number
  movement_type: 'in' | 'out' | 'adjust'
  quantity: string
  note?: string
}): Promise<StockMovement> {
  return apiRequest<StockMovement>('stock-movements/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
