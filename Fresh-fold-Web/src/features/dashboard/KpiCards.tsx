import { motion } from 'framer-motion'
import { AlertTriangle, CreditCard, Package, TrendingUp, Truck } from 'lucide-react'

import type {
  DashboardStats,
  FinancialSummary,
  InventoryItemRow,
  Order,
  SalesReportResponse,
  TripRow,
} from '@/api/types'
import { formatCurrency } from '@/lib/formatters'

import { Card } from '@/components/ui/card'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

function parseMoney(value: string | null | undefined) {
  const num = Number.parseFloat(value ?? '0')
  return Number.isFinite(num) ? num : 0
}

export function KpiCards({
  kpis,
  financial,
  sales,
  orders,
  trips,
  lowStock,
}: {
  kpis: DashboardStats
  financial: FinancialSummary
  sales: SalesReportResponse
  orders: Order[]
  trips: TripRow[]
  lowStock: InventoryItemRow[]
}) {
  const latestSeries = sales.series.filter((row) => row.day)
  const latestRevenue = parseMoney(latestSeries.at(-1)?.revenue)
  const previousRevenue = parseMoney(latestSeries.at(-2)?.revenue)
  const revenueDelta =
    previousRevenue > 0 ? Math.round(((latestRevenue - previousRevenue) / previousRevenue) * 100) : null

  const processingCount = orders.filter((row) => row.status === 'processing').length
  const readyCount = orders.filter((row) => row.status === 'ready').length
  const receivedCount = orders.filter((row) => row.status === 'received').length
  const pendingPickups = trips.filter(
    (row) => row.trip_type === 'pickup' && row.status !== 'completed' && row.status !== 'cancelled',
  )
  const overduePickups = pendingPickups.filter((row) => new Date(row.scheduled_at).getTime() < Date.now())
  const lowStockPreview = lowStock
    .slice(0, 2)
    .map((row) => row.name)
    .join(', ')

  return (
    <motion.div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item}>
        <Card className="group border-border/80 p-5 transition-colors hover:border-primary/40">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Daily revenue</p>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <CreditCard className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">{formatCurrency(latestRevenue)}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5 text-primary" />
            {revenueDelta === null
              ? `Outstanding ${formatCurrency(financial.outstanding_invoice_total)}`
              : `${revenueDelta >= 0 ? '+' : ''}${revenueDelta}% vs previous day`}
          </p>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="group border-border/80 p-5 transition-colors hover:border-primary/40">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Active orders</p>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Package className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">{kpis.pending_orders}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {processingCount} processing, {readyCount} ready{receivedCount > 0 ? `, ${receivedCount} received` : ''}
          </p>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="group border-border/80 p-5 transition-colors hover:border-primary/40">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Pending pickups</p>
            <span className="rounded-lg bg-secondary p-2 text-secondary-foreground">
              <Truck className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">{pendingPickups.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overduePickups.length > 0 ? `${overduePickups.length} overdue` : 'All pickups on schedule'}
          </p>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="group border-destructive/30 p-5 transition-colors hover:border-destructive/50">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-destructive">Low stock alerts</p>
            <span className="rounded-lg bg-destructive/10 p-2 text-destructive">
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">{lowStock.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{lowStockPreview || 'Inventory levels look healthy'}</p>
        </Card>
      </motion.div>
    </motion.div>
  )
}
