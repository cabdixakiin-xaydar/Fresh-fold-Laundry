import { BarChart3, TrendingUp, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ApiError } from '@/api/client'
import * as analyticsService from '@/api/services/analyticsService'
import type {
  CustomersReportResponse,
  DashboardStats,
  FinancialSummary,
  OrdersReportResponse,
  RevenueBreakdownResponse,
  SalesReportResponse,
  ServicePopularityRow,
} from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatShortDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

type ReportTab = 'overview' | 'revenue' | 'orders' | 'customers'
type ChartPeriod = 'daily' | 'weekly' | 'monthly'

function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function periodLabel(p: ChartPeriod): string {
  if (p === 'daily') return 'Last 14 days'
  if (p === 'weekly') return 'Last 12 weeks'
  return 'Last 12 months'
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('overview')
  const [period, setPeriod] = useState<ChartPeriod>('daily')
  const [endDate, setEndDate] = useState(isoToday)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kpis, setKpis] = useState<DashboardStats | null>(null)
  const [financial, setFinancial] = useState<FinancialSummary | null>(null)
  const [sales, setSales] = useState<SalesReportResponse | null>(null)
  const [ordersReport, setOrdersReport] = useState<OrdersReportResponse | null>(null)
  const [customersReport, setCustomersReport] = useState<CustomersReportResponse | null>(null)
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdownResponse | null>(null)
  const [services, setServices] = useState<ServicePopularityRow[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [k, f, s, o, c, r, svc] = await Promise.all([
          analyticsService.fetchDashboardSnapshot(endDate),
          analyticsService.fetchFinancialSummary(endDate),
          analyticsService.fetchSalesReport(period, endDate),
          analyticsService.fetchOrdersReport(period, endDate),
          analyticsService.fetchCustomersReport(period, endDate),
          analyticsService.fetchRevenueBreakdown(period, endDate),
          analyticsService.fetchServicePopularity(endDate),
        ])
        if (!cancelled) {
          setKpis(k)
          setFinancial(f)
          setSales(s)
          setOrdersReport(o)
          setCustomersReport(c)
          setRevenueBreakdown(r)
          setServices(svc)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Failed to load reports')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [period, endDate])

  const salesChart = useMemo(
    () =>
      (sales?.series ?? []).map((row) => ({
        label: row.day ? formatShortDate(row.day) : '—',
        revenue: Number.parseFloat(row.revenue ?? '0') || 0,
        invoices: row.count,
      })),
    [sales],
  )

  const ordersChart = useMemo(
    () =>
      (ordersReport?.series ?? []).map((row) => ({
        label: row.day ? formatShortDate(row.day) : '—',
        orders: row.count,
        revenue: Number.parseFloat(row.revenue) || 0,
      })),
    [ordersReport],
  )

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'orders', label: 'Orders' },
    { id: 'customers', label: 'Customers' },
  ]

  if (loading && !kpis) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="m-6 border-destructive/40">
        <CardHeader>
          <CardTitle>Reports unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Revenue, orders, and customer insights — {periodLabel(period)} ending{' '}
            {formatShortDate(endDate)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as ChartPeriod)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily (14 days)</SelectItem>
              <SelectItem value="weekly">Weekly (~12 wks)</SelectItem>
              <SelectItem value="monthly">Monthly (~12 mo)</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && kpis && financial ? (
        <OverviewTab
          kpis={kpis}
          financial={financial}
          salesChart={salesChart}
          ordersSummary={ordersReport?.summary}
          customersReport={customersReport}
          services={services}
        />
      ) : null}

      {tab === 'revenue' && sales && revenueBreakdown ? (
        <RevenueTab salesChart={salesChart} breakdown={revenueBreakdown} financial={financial} />
      ) : null}

      {tab === 'orders' && ordersReport ? <OrdersTab report={ordersReport} chart={ordersChart} /> : null}

      {tab === 'customers' && customersReport ? <CustomersTab report={customersReport} /> : null}
    </div>
  )
}

function OverviewTab({
  kpis,
  financial,
  salesChart,
  ordersSummary,
  customersReport,
  services,
}: {
  kpis: DashboardStats
  financial: FinancialSummary
  salesChart: { label: string; revenue: number; invoices: number }[]
  ordersSummary?: OrdersReportResponse['summary']
  customersReport: CustomersReportResponse | null
  services: ServicePopularityRow[]
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total orders" value={String(kpis.total_orders)} icon={<BarChart3 className="size-4" />} />
        <StatCard label="Orders today" value={String(kpis.orders_today)} icon={<TrendingUp className="size-4" />} />
        <StatCard
          label="Paid revenue (all time)"
          value={formatCurrency(kpis.revenue_total)}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard label="Customers" value={String(kpis.customers_total)} icon={<Users className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Period snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Period order revenue" value={formatCurrency(ordersSummary?.total_revenue)} />
            <Row label="Average order value" value={formatCurrency(ordersSummary?.average_order_value)} />
            <Row label="Express orders" value={String(ordersSummary?.express_orders ?? 0)} />
            <Row label="Outstanding invoices" value={formatCurrency(financial.outstanding_invoice_total)} />
            <Row label="New customers (period)" value={String(customersReport?.new_customers ?? 0)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Popular services</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {services.slice(0, 8).map((s) => (
              <li key={s.service_type__code} className="flex justify-between text-sm">
                <span>{s.service_type__name}</span>
                <span className="font-semibold">{s.line_count} lines</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function RevenueTab({
  salesChart,
  breakdown,
  financial,
}: {
  salesChart: { label: string; revenue: number; invoices: number }[]
  breakdown: RevenueBreakdownResponse
  financial: FinancialSummary | null
}) {
  const statusRows = breakdown.by_payment_status
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Paid in period" value={formatCurrency(breakdown.paid_revenue)} />
        <StatCard label="All-time paid" value={formatCurrency(financial?.revenue_paid_invoices)} />
        <StatCard label="Outstanding" value={formatCurrency(financial?.outstanding_invoice_total)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice revenue over time</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By payment status</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Status</th>
                <th className="pb-2">Invoices</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map((row) => (
                <tr key={row.payment_status} className="border-b border-border/60">
                  <td className="py-2 capitalize">{row.payment_status}</td>
                  <td className="py-2">{row.count}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function OrdersTab({
  report,
  chart,
}: {
  report: OrdersReportResponse
  chart: { label: string; orders: number; revenue: number }[]
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders in period" value={String(report.summary.total_orders)} />
        <StatCard label="Revenue" value={formatCurrency(report.summary.total_revenue)} />
        <StatCard label="Avg order value" value={formatCurrency(report.summary.average_order_value)} />
        <StatCard label="Express" value={String(report.summary.express_orders)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders per day</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {report.by_status.map((row) => (
            <Badge key={row.status} variant="secondary" className="capitalize">
              {row.status.replace(/_/g, ' ')}: {row.count}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function CustomersTab({ report }: { report: CustomersReportResponse }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New (period)" value={String(report.new_customers)} />
        <StatCard label="Total customers" value={String(report.total_customers)} />
        <StatCard label="Gold tier" value={String(report.loyalty_tiers.gold)} />
        <StatCard label="Silver tier" value={String(report.loyalty_tiers.silver)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top customers by spend (period)</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Customer</th>
                <th className="pb-2">Orders</th>
                <th className="pb-2 text-right">Spend</th>
              </tr>
            </thead>
            <tbody>
              {report.top_customers.map((c) => (
                <tr key={c.customer_id} className="border-b border-border/60">
                  <td className="py-2">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email || '—'}</p>
                  </td>
                  <td className="py-2">{c.order_count}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(c.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
