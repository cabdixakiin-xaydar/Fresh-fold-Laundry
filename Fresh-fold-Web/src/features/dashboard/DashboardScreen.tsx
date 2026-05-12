import { Bell, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

import { ActivitySidebar } from './ActivitySidebar'
import type { ChartPeriod } from './dashboard-store'
import { useDashboardStore } from './dashboard-store'
import { DashboardSearchBar } from './DashboardSearchBar'
import { KpiCards } from './KpiCards'
import { QuickActionsPanel } from './QuickActionsPanel'
import { RecentOrdersTableSection } from './RecentOrdersTableSection'
import { RevenueTrendChart } from './RevenueTrendChart'
import { ServicePopularitySection } from './ServicePopularitySection'
import { useDashboardBundle } from './useDashboardBundle'

function isoDate(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function shiftIsoDate(value: string, offsetDays: number): string {
  const d = new Date(`${value}T00:00:00`)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function periodLabel(p: ChartPeriod): string {
  switch (p) {
    case 'daily':
      return 'This Week'
    case 'weekly':
      return 'This Quarter'
    case 'monthly':
      return 'This Year'
    default:
      return p
  }
}

export function DashboardScreen() {
  const { user } = useAuth()
  const chartPeriod = useDashboardStore((s) => s.chartPeriod)
  const setChartPeriod = useDashboardStore((s) => s.setChartPeriod)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => isoDate())
  const { data, loading, error } = useDashboardBundle(chartPeriod, { query: search, date: selectedDate })

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(new Date(`${selectedDate}T00:00:00`)),
    [selectedDate],
  )

  if (loading && !data) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Dashboard unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive">{error ?? 'Unknown error'}</CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 md:px-8 md:py-8">
      <header className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-8 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <DashboardSearchBar onSubmit={setSearch} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative rounded-full p-2 text-muted-foreground transition hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
            </button>
            <button
              type="button"
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
              aria-label="Help"
            >
              <HelpCircle className="size-5" />
            </button>
            <div className="ml-1 hidden items-center gap-3 rounded-full border bg-card px-3 py-1.5 shadow-sm sm:flex">
              <img
                src="/stitch-admin-user.jpg"
                alt="Manager profile"
                className="size-9 rounded-full border object-cover"
              />
              <div className="leading-tight">
                <p className="text-sm font-semibold">{user?.first_name || user?.username || 'Admin User'}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Executive Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of today&apos;s operations and financial health.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card px-1 py-1 shadow-sm">
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Previous day"
            onClick={() => setSelectedDate((value) => shiftIsoDate(value, -1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-2 text-sm font-semibold">{todayLabel}</span>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Next day"
            onClick={() => setSelectedDate((value) => shiftIsoDate(value, 1))}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <KpiCards
        kpis={data.kpis}
        financial={data.financial}
        sales={data.sales}
        orders={data.orders}
        trips={data.trips}
        lowStock={data.lowStock}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/80">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
              <CardTitle className="text-base">Revenue Trends</CardTitle>
              <Select value={chartPeriod} onValueChange={(v) => setChartPeriod(v as ChartPeriod)}>
                <SelectTrigger className="h-9 w-[160px] rounded-lg">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{periodLabel('daily')}</SelectItem>
                  <SelectItem value="weekly">{periodLabel('weekly')}</SelectItem>
                  <SelectItem value="monthly">{periodLabel('monthly')}</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <RevenueTrendChart sales={data.sales} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ServicePopularitySection rows={data.services} />
            <QuickActionsPanel />
          </div>

          <RecentOrdersTableSection orders={data.recentOrders} query={search} />
        </div>

        <div className="lg:col-span-1">
          <ActivitySidebar orders={data.recentOrders} lowStock={data.lowStock} trips={data.trips} />
        </div>
      </div>
    </div>
  )
}
