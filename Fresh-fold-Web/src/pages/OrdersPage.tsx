import { Search, ShoppingBag, Sparkles, Tags, WashingMachine } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ApiError } from '@/api/client'
import * as orderService from '@/api/services/orderService'
import type { Order, ServiceType } from '@/api/types'
import { formatCurrency, formatRelativeTime } from '@/lib/formatters'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function statusVariant(status: string): 'secondary' | 'success' | 'warning' | 'outline' {
  switch (status) {
    case 'ready':
      return 'success'
    case 'processing':
      return 'warning'
    case 'received':
      return 'secondary'
    default:
      return 'outline'
  }
}

function titleCaseStatus(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getServiceSummary(order: Order): string {
  const names = [...new Set((order.items ?? []).map((item) => item.service_type_name).filter(Boolean))]
  if (names.length === 0) return 'Service mix pending'
  if (names.length === 1) return names[0]
  return `${names[0]} +${names.length - 1} more`
}

function getItemSummary(order: Order): string {
  const totalQuantity = (order.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0)
  const totalWeight = (order.items ?? []).reduce((sum, item) => sum + Number.parseFloat(item.weight_kg ?? '0'), 0)
  if (totalWeight > 0) return `${totalWeight.toFixed(totalWeight % 1 === 0 ? 0 : 1)} lbs`
  if (totalQuantity > 0) return `${totalQuantity} items`
  return 'Pending item details'
}

function getCustomerSubtext(order: Order): string {
  if (order.is_express) return 'Express service'
  if (order.special_instructions) return order.special_instructions
  return `Updated ${formatRelativeTime(order.updated_at)}`
}

export function OrdersPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Order[]>([])
  const [allRows, setAllRows] = useState<Order[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [serviceType, setServiceType] = useState('all')
  const [statusSavingId, setStatusSavingId] = useState<number | null>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(queryInput.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [queryInput])

  useEffect(() => {
    setPage(1)
  }, [query, serviceType, status])

  async function loadOrders(activePage: number, activeQuery: string, activeStatus: string, activeServiceType: string) {
    setLoading(true)
    setError(null)
    try {
      const [filtered, baseline, services] = await Promise.all([
        orderService.listOrdersPage({
          q: activeQuery || undefined,
          status: activeStatus !== 'all' ? activeStatus : undefined,
          service_type: activeServiceType !== 'all' ? activeServiceType : undefined,
          page: activePage,
        }),
        orderService.listOrders(),
        orderService.listServiceTypes(),
      ])
      setRows(filtered.results)
      setRowCount(filtered.count)
      setAllRows(baseline)
      setServiceTypes(services)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders(page, query, status, serviceType)
  }, [page, query, serviceType, status])

  const stats = useMemo(() => {
    const total = allRows.length
    const processing = allRows.filter((row) => row.status === 'processing').length
    const ready = allRows.filter((row) => row.status === 'ready').length
    const express = allRows.filter((row) => row.is_express).length
    return { total, processing, ready, express }
  }, [allRows])
  const maxPage = Math.max(1, Math.ceil(rowCount / 25))
  const startRow = rowCount === 0 ? 0 : (page - 1) * 25 + 1
  const endRow = Math.min(page * 25, rowCount)

  async function onQuickStatusChange(orderId: number, nextStatus: string) {
    setStatusSavingId(orderId)
    setError(null)
    try {
      await orderService.updateOrderStatus(orderId, nextStatus)
      await loadOrders(page, query, status, serviceType)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update order status')
    } finally {
      setStatusSavingId(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Order Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and track all active laundry orders.</p>
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
          <div className="relative min-w-[260px] flex-1 md:w-72 md:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search orders, customers..."
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {serviceTypes.map((service) => (
                <SelectItem key={service.id} value={String(service.id)}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Total Orders</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{stats.total}</p>
              <p className="mt-1 text-xs text-primary">All orders in the system</p>
            </div>
            <ShoppingBag className="size-5 text-primary" />
          </div>
        </Card>
        <Card className="border-border/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Processing</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{stats.processing}</p>
              <p className="mt-1 text-xs text-amber-700">In machines now</p>
            </div>
            <WashingMachine className="size-5 text-amber-700" />
          </div>
        </Card>
        <Card className="border-border/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Ready For Pickup</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{stats.ready}</p>
              <p className="mt-1 text-xs text-emerald-700">Awaiting customers</p>
            </div>
            <Tags className="size-5 text-emerald-700" />
          </div>
        </Card>
        <Card className="border-destructive/30 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Express / Overdue</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-destructive">{stats.express}</p>
              <p className="mt-1 text-xs text-muted-foreground">Priority handling orders</p>
            </div>
            <Sparkles className="size-5 text-destructive" />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/80">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading orders…</p>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : (
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-5">Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Items/Weight</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-6 text-center text-sm text-muted-foreground">
                      No orders matched the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((order) => (
                    <TableRow
                      key={order.id}
                      className={order.is_express ? 'border-l-4 border-l-destructive/80' : undefined}
                    >
                      <TableCell className="pl-5 font-semibold text-primary">{order.order_number}</TableCell>
                      <TableCell>
                        <div className="min-w-[180px]">
                          <p className="font-medium text-foreground">{order.customer_name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{getCustomerSubtext(order)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getServiceSummary(order)}</TableCell>
                      <TableCell>{order.source === 'in_store' ? 'In-store' : 'Web'}</TableCell>
                      <TableCell>{getItemSummary(order)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Badge variant={statusVariant(order.status)}>{titleCaseStatus(order.status)}</Badge>
                          <select
                            className="flex h-8 w-full min-w-[130px] rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={order.status}
                            disabled={statusSavingId === order.id}
                            onChange={(event) => void onQuickStatusChange(order.id, event.target.value)}
                          >
                            <option value="received">Received</option>
                            <option value="processing">Processing</option>
                            <option value="ready">Ready</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        </div>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="link" asChild className="px-0">
                            <Link to={`/orders/${order.id}`}>View</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {!loading && !error ? (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              Showing {startRow}-{endRow} of {rowCount} orders
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded p-1 text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ‹
              </button>
              <span className="px-2 text-xs">
                Page {page} of {maxPage}
              </span>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                disabled={page >= maxPage}
                onClick={() => setPage((current) => Math.min(maxPage, current + 1))}
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => navigate('/orders/new')}>Create New Order</Button>
      </div>
    </div>
  )
}
