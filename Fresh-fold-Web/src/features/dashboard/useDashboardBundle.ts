import { useEffect, useState } from 'react'

import { ApiError } from '@/api/client'
import * as analyticsService from '@/api/services/analyticsService'
import * as inventoryService from '@/api/services/inventoryService'
import * as logisticsService from '@/api/services/logisticsService'
import * as orderService from '@/api/services/orderService'
import type {
  DashboardStats,
  FinancialSummary,
  InventoryItemRow,
  Order,
  SalesReportResponse,
  ServicePopularityRow,
  TripRow,
} from '@/api/types'

import type { ChartPeriod } from './dashboard-store'

export type DashboardBundle = {
  kpis: DashboardStats
  financial: FinancialSummary
  sales: SalesReportResponse
  services: ServicePopularityRow[]
  lowStock: InventoryItemRow[]
  trips: TripRow[]
  orders: Order[]
  recentOrders: Order[]
}

export function useDashboardBundle(chartPeriod: ChartPeriod, filters: { query: string; date: string }) {
  const [data, setData] = useState<DashboardBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [kpis, financial, sales, services, lowStock, trips, orders] = await Promise.all([
          analyticsService.fetchDashboardSnapshot(filters.date),
          analyticsService.fetchFinancialSummary(filters.date),
          analyticsService.fetchSalesReport(chartPeriod, filters.date),
          analyticsService.fetchServicePopularity(filters.date),
          inventoryService.listLowStock({ q: filters.query }).catch(() => []),
          logisticsService.listScheduledTrips({ q: filters.query, date: filters.date }).catch(() => []),
          orderService.listOrders({ q: filters.query, date: filters.date }),
        ])
        if (cancelled) return
        const recentOrders = orders.slice(0, 12)
        setData({ kpis, financial, sales, services, lowStock, trips, orders, recentOrders })
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Failed to load dashboard')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chartPeriod, filters.date, filters.query])

  return { data, loading, error }
}
