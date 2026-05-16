export type User = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
  phone: string
  customer_id: number | null
  account_type?: 'staff' | 'customer'
  is_active: boolean
  date_joined: string
}

export type UserDetail = User & {
  is_staff: boolean
  last_login: string | null
  customer_profile: {
    id: number
    name: string
    email: string
    phone: string
    loyalty_points: number
    address: string
  } | null
}

export type LoginResponse = {
  token: string
  user: User
}

export type Customer = {
  id: number
  name: string
  phone: string
  email: string
  address: string
  loyalty_points: number
  notes: string
  preferences: string
  created_at: string
  updated_at: string
}

export type LoyaltyTransaction = {
  id: number
  customer: number
  points_change: number
  reason: string
  created_at: string
}

export type CustomerDetail = Customer & {
  loyalty_transactions: LoyaltyTransaction[]
}

export type CustomerTransaction = {
  type: 'order' | 'invoice' | 'payment'
  reference: string
  status: string
  amount: string
  occurred_at: string
}

export type ServiceType = {
  id: number
  name: string
  code: string
  description: string
  base_price: string
  pricing_unit: 'item' | 'kg'
  active: boolean
}

export type OrderItem = {
  id: number
  service_type: number
  service_type_name: string
  quantity: number
  weight_kg: string | null
  unit_price: string
  line_total: string
}

export type OrderInvoicePaymentRow = {
  id: number
  amount: string
  method: string
  reference: string
  paid_at: string
}

export type OrderInvoiceSummary = {
  id: number
  invoice_number: string
  issued_at: string
  payment_status: 'unpaid' | 'partial' | 'paid'
  subtotal: string
  tax_amount: string
  discount_amount: string
  total: string
  amount_paid: string
  notes: string
  payments: OrderInvoicePaymentRow[]
}

export type Order = {
  id: number
  order_number: string
  customer: number
  customer_name: string
  customer_phone: string
  customer_email: string
  customer_address: string
  source: 'web' | 'in_store'
  status: string
  special_instructions: string
  is_express: boolean
  subtotal: string
  discount_amount: string
  tax_amount: string
  total: string
  created_by: number | null
  items?: OrderItem[]
  invoice?: OrderInvoiceSummary | null
  created_at: string
  updated_at: string
}

export type DashboardStats = {
  total_orders: number
  orders_today: number
  pending_orders: number
  revenue_total: string
  customers_total: number
}

export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type SalesReportResponse = {
  period: string
  series: Array<{
    day: string | null
    count: number
    revenue: string | null
  }>
}

export type ServicePopularityRow = {
  service_type__name: string
  service_type__code: string
  line_count: number
}

export type FinancialSummary = {
  revenue_paid_invoices: string
  outstanding_invoice_total: string
}

export type OrdersReportResponse = {
  period: string
  start_date: string
  end_date: string
  series: Array<{ day: string | null; count: number; revenue: string }>
  by_status: Array<{ status: string; count: number }>
  summary: {
    total_orders: number
    total_revenue: string
    average_order_value: string
    express_orders: number
  }
}

export type CustomersReportResponse = {
  period: string
  start_date: string
  end_date: string
  new_customers: number
  total_customers: number
  signup_series: Array<{ day: string | null; count: number }>
  loyalty_tiers: { gold: number; silver: number; regular: number }
  top_customers: Array<{
    customer_id: number
    name: string
    email: string
    order_count: number
    spend: string
  }>
}

export type RevenueBreakdownResponse = {
  period: string
  start_date: string
  end_date: string
  paid_revenue: string
  by_payment_status: Array<{ payment_status: string; count: number; total: string }>
  monthly_series: Array<{ month: string | null; count: number; revenue: string }>
}

export type InventoryItemRow = {
  id: number
  name: string
  sku: string
  quantity: string
  unit: string
  low_stock_threshold: string
  supplier: number | null
  supplier_name?: string
  is_low_stock: boolean
  updated_at: string
}

export type Supplier = {
  id: number
  name: string
  contact_name: string
  phone: string
  email: string
  address: string
  notes: string
  created_at: string
}

export type StockMovement = {
  id: number
  item: number
  item_name?: string
  movement_type: 'in' | 'out' | 'adjust'
  quantity: string
  note: string
  created_at: string
  created_by: number | null
}

export type TripRow = {
  id: number
  order: number
  order_number: string
  trip_type: string
  scheduled_at: string
  address: string
  driver: number | null
  status: string
  route_notes: string
  created_at: string
}

export type Payment = {
  id: number
  invoice: number
  invoice_number?: string
  customer_name?: string
  amount: string
  method: 'cash' | 'card' | 'mobile' | 'other'
  reference: string
  paid_at: string
  recorded_by: number | null
}

export type Invoice = {
  id: number
  invoice_number: string
  order: number
  order_number: string
  customer_name: string
  issued_at: string
  payment_status: 'unpaid' | 'partial' | 'paid'
  subtotal: string
  tax_amount: string
  discount_amount: string
  total: string
  amount_paid: string
  promo_code: number | null
  notes: string
  payments: Payment[]
}
