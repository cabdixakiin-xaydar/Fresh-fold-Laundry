import { apiRequest } from '../client'
import type {
  DashboardStats,
  FinancialSummary,
  SalesReportResponse,
  ServicePopularityRow,
} from '../types'

export function fetchDashboard(): Promise<DashboardStats> {
  return apiRequest<DashboardStats>('analytics/dashboard/')
}

export function fetchDashboardSnapshot(date?: string): Promise<DashboardStats> {
  const suffix = date ? `?date=${date}` : ''
  return apiRequest<DashboardStats>(`analytics/dashboard/${suffix}`)
}

export function fetchSalesReport(period: 'daily' | 'weekly' | 'monthly', date?: string): Promise<SalesReportResponse> {
  const query = new URLSearchParams({ period })
  if (date) query.set('date', date)
  return apiRequest<SalesReportResponse>(`analytics/reports/sales/?${query}`)
}

export function fetchServicePopularity(date?: string): Promise<ServicePopularityRow[]> {
  const suffix = date ? `?date=${date}` : ''
  return apiRequest<ServicePopularityRow[]>(`analytics/reports/services/${suffix}`)
}

export function fetchFinancialSummary(date?: string): Promise<FinancialSummary> {
  const suffix = date ? `?date=${date}` : ''
  return apiRequest<FinancialSummary>(`analytics/reports/financial/${suffix}`)
}
