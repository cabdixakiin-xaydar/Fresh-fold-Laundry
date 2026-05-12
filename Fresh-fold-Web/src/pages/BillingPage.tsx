import {
  Calculator,
  Download,
  FileText,
  Filter,
  Mail,
  Plus,
  Printer,
  Search,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError } from '@/api/client'
import * as billingService from '@/api/services/billingService'
import * as orderService from '@/api/services/orderService'
import type { Invoice, Order } from '@/api/types'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function paymentVariant(status: string): 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'warning'
    default:
      return 'destructive'
  }
}

function paymentLabel(status: string): string {
  if (status === 'partial') return 'Partial'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function dayKey(value: string): string {
  return value.slice(0, 10)
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [invoiceCount, setInvoiceCount] = useState(0)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [calculatorCustomerQuery, setCalculatorCustomerQuery] = useState('')
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile' | 'other'>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(queryInput.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [queryInput])

  useEffect(() => {
    setPage(1)
  }, [paymentStatus, query])

  async function loadData(activeQuery: string, activeStatus: string, activePage: number) {
    setLoading(true)
    setError(null)
    try {
      const [filteredInvoices, baselineInvoices, orderRows] = await Promise.all([
        billingService.listInvoicesPage({
          q: activeQuery || undefined,
          payment_status: activeStatus !== 'all' ? activeStatus : undefined,
          page: activePage,
        }),
        billingService.listInvoices(),
        orderService.listOrders(),
      ])
      setInvoices(filteredInvoices.results)
      setInvoiceCount(filteredInvoices.count)
      setAllInvoices(baselineInvoices)
      setOrders(orderRows)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData(query, paymentStatus, page)
  }, [page, paymentStatus, query])

  const openOrders = useMemo(() => {
    const invoicedOrderIds = new Set(allInvoices.map((invoice) => invoice.order))
    return orders.filter((order) => !invoicedOrderIds.has(order.id))
  }, [allInvoices, orders])

  const filteredOpenOrders = useMemo(() => {
    const normalized = calculatorCustomerQuery.trim().toLowerCase()
    if (!normalized) return openOrders
    return openOrders.filter((order) =>
      [order.customer_name, order.order_number].some((value) => value.toLowerCase().includes(normalized)),
    )
  }, [calculatorCustomerQuery, openOrders])

  useEffect(() => {
    if (!filteredOpenOrders.some((order) => String(order.id) === selectedOrderId)) {
      setSelectedOrderId(filteredOpenOrders[0] ? String(filteredOpenOrders[0].id) : '')
    }
  }, [filteredOpenOrders, selectedOrderId])

  const selectedOrder = openOrders.find((order) => String(order.id) === selectedOrderId)
  const selectedLines = selectedOrder?.items ?? []
  const selectedInvoice = useMemo(
    () => allInvoices.find((invoice) => invoice.id === selectedInvoiceId) ?? invoices[0] ?? null,
    [allInvoices, invoices, selectedInvoiceId],
  )

  useEffect(() => {
    if (!selectedInvoiceId && invoices[0]) {
      setSelectedInvoiceId(invoices[0].id)
    }
    if (selectedInvoiceId && !allInvoices.some((invoice) => invoice.id === selectedInvoiceId) && invoices[0]) {
      setSelectedInvoiceId(invoices[0].id)
    }
  }, [allInvoices, invoices, selectedInvoiceId])

  useEffect(() => {
    if (!selectedInvoice) {
      setPaymentAmount('')
      return
    }
    const remaining = Math.max(parseAmount(selectedInvoice.total) - parseAmount(selectedInvoice.amount_paid), 0)
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : '')
  }, [selectedInvoiceId, selectedInvoice])

  const metrics = useMemo(() => {
    const now = new Date()
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthKey = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`

    const currentMonthInvoices = allInvoices.filter((invoice) => dayKey(invoice.issued_at).startsWith(currentMonthKey))
    const previousMonthInvoices = allInvoices.filter((invoice) => dayKey(invoice.issued_at).startsWith(previousMonthKey))

    const totalRevenue = currentMonthInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.total), 0)
    const previousRevenue = previousMonthInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.total), 0)
    const revenueTrend = previousRevenue > 0 ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100) : 0

    const pendingInvoices = allInvoices.filter((invoice) => invoice.payment_status !== 'paid')
    const outstanding = pendingInvoices.reduce(
      (sum, invoice) => sum + Math.max(parseAmount(invoice.total) - parseAmount(invoice.amount_paid), 0),
      0,
    )
    const issuedToday = allInvoices.filter((invoice) => dayKey(invoice.issued_at) === dayKey(new Date().toISOString())).length

    return {
      totalRevenue,
      previousRevenue,
      revenueTrend,
      outstanding,
      pendingCount: pendingInvoices.length,
      issuedToday,
    }
  }, [allInvoices])

  function exportInvoices() {
    const rows = [
      ['Invoice ID', 'Order', 'Customer', 'Date', 'Amount', 'Status'],
      ...invoices.map((invoice) => [
        invoice.invoice_number,
        invoice.order_number,
        invoice.customer_name,
        shortDate(invoice.issued_at),
        invoice.total,
        paymentLabel(invoice.payment_status),
      ]),
    ]
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'fresh-fold-invoices.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function openReceipt(invoiceId: number, targetWindow: Window | null) {
    try {
      const blob = await billingService.downloadReceiptPdf(invoiceId)
      const url = URL.createObjectURL(blob)
      if (targetWindow) {
        targetWindow.location.href = url
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      targetWindow?.close()
      setError(e instanceof ApiError ? e.message : 'Could not open receipt PDF')
    }
  }

  function emailInvoice(invoice: Invoice) {
    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number}`)
    const body = encodeURIComponent(
      `Invoice ${invoice.invoice_number} for ${invoice.customer_name}.\nOrder: ${invoice.order_number}\nAmount: ${formatCurrency(invoice.total)}`,
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  async function onCreateInvoice() {
    if (!selectedOrder) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await billingService.createInvoiceFromOrder({ order_id: selectedOrder.id, notes: invoiceNotes || undefined })
      setInvoiceNotes('')
      setSelectedOrderId('')
      await loadData(query, paymentStatus, page)
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Could not create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  async function onRecordPayment() {
    if (!selectedInvoice) return
    setPaymentSubmitting(true)
    setPaymentError(null)
    try {
      await billingService.createPayment({
        invoice: selectedInvoice.id,
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentReference || undefined,
      })
      setPaymentReference('')
      await loadData(query, paymentStatus, page)
    } catch (e) {
      setPaymentError(e instanceof ApiError ? e.message : 'Could not record payment')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const startRow = invoiceCount === 0 ? 0 : (page - 1) * 25 + 1
  const endRow = Math.min(page * 25, invoiceCount)
  const maxPage = Math.max(1, Math.ceil(invoiceCount / 25))
  const selectedInvoiceBalance = selectedInvoice
    ? Math.max(parseAmount(selectedInvoice.total) - parseAmount(selectedInvoice.amount_paid), 0)
    : 0

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Billing &amp; Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage customer billing, view invoice history, and generate new receipts.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <Button variant="outline" className="gap-2" onClick={exportInvoices}>
            <Download className="size-4" />
            Export
          </Button>
          <Button
            className="gap-2"
            onClick={() => {
              if (!selectedOrderId && filteredOpenOrders[0]) setSelectedOrderId(String(filteredOpenOrders[0].id))
              document.getElementById('billing-quick-calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <Plus className="size-4" />
            New Invoice
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative min-w-[260px] md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className="pl-9"
            placeholder="Search invoices..."
          />
        </div>
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex h-9 w-10 items-center justify-center rounded-md border text-muted-foreground">
          <Filter className="size-4" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue (This Month)</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{formatCurrency(metrics.totalRevenue)}</p>
              <p className="mt-1 text-xs text-primary">
                {metrics.revenueTrend >= 0 ? '+' : ''}
                {metrics.revenueTrend}% vs last month
              </p>
            </div>
            <Wallet className="size-5 text-primary" />
          </div>
        </Card>
        <Card className="border-border/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unpaid / Pending</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{formatCurrency(metrics.outstanding)}</p>
              <p className="mt-1 text-xs text-amber-700">{metrics.pendingCount} invoices need follow-up</p>
            </div>
            <FileText className="size-5 text-amber-700" />
          </div>
        </Card>
        <Card className="border-border/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invoices Generated Today</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{metrics.issuedToday}</p>
              <p className="mt-1 text-xs text-muted-foreground">{allInvoices.length} invoices in total</p>
            </div>
            <FileText className="size-5 text-primary" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              <span className="text-xs text-muted-foreground">{invoiceCount} total invoices</span>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="p-6 text-sm text-muted-foreground">Loading invoices…</p>
              ) : error ? (
                <p className="p-6 text-sm text-destructive">{error}</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="pl-5">Invoice ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="pr-5 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                            No invoices matched the current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoices.map((invoice) => (
                          <TableRow
                            key={invoice.id}
                            className={cn('group cursor-pointer', selectedInvoice?.id === invoice.id && 'bg-primary/5')}
                            onClick={() => setSelectedInvoiceId(invoice.id)}
                          >
                            <TableCell className="pl-5 font-medium">{invoice.invoice_number}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex size-6 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold text-muted-foreground">
                                  {initials(invoice.customer_name)}
                                </div>
                                <span>{invoice.customer_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{shortDate(invoice.issued_at)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(invoice.total)}</TableCell>
                            <TableCell>
                              <Badge variant={paymentVariant(invoice.payment_status)}>{paymentLabel(invoice.payment_status)}</Badge>
                            </TableCell>
                            <TableCell className="pr-5 text-right">
                              <div className="flex justify-end gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                                <button
                                  type="button"
                                  className="rounded p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    const receiptWindow = window.open('', '_blank', 'noopener,noreferrer')
                                    void openReceipt(invoice.id, receiptWindow)
                                  }}
                                  aria-label={`Print ${invoice.invoice_number}`}
                                >
                                  <Printer className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  className="rounded p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    emailInvoice(invoice)
                                  }}
                                  aria-label={`Email ${invoice.invoice_number}`}
                                >
                                  <Mail className="size-4" />
                                </button>
                                <Button variant="link" asChild className="px-0">
                                  <Link to={`/orders/${invoice.order}`}>View</Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                    <span>
                      Showing {startRow}-{endRow} of {invoiceCount} invoices
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
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-border/80" id="billing-quick-calculator">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="size-4 text-primary" />
                Quick Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer (Optional)</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={calculatorCustomerQuery}
                    onChange={(e) => setCalculatorCustomerQuery(e.target.value)}
                    className="pl-9"
                    placeholder="Search or add new..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open Order</p>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredOpenOrders.map((order) => (
                      <SelectItem key={order.id} value={String(order.id)}>
                        {order.order_number} · {order.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border bg-muted/10 p-4">
                <div className="mb-3 flex items-center justify-between border-b pb-3">
                  <span className="text-sm font-semibold">Service Items</span>
                  <Link to="/orders/new" className="text-sm font-medium text-primary hover:underline">
                    Add
                  </Link>
                </div>
                {selectedOrder && selectedLines.length > 0 ? (
                  <div className="space-y-3">
                    {selectedLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Service Type</p>
                          <div className="mt-1 rounded-md border bg-background px-2 py-1.5 text-sm">
                            {line.service_type_name}
                          </div>
                        </div>
                        <div className="w-20">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {line.weight_kg ? 'Qty/Lbs' : 'Qty'}
                          </p>
                          <div className="mt-1 rounded-md border bg-background px-2 py-1.5 text-sm">
                            {line.weight_kg || line.quantity}
                          </div>
                        </div>
                        <div className="pb-2 text-right text-sm font-medium">{formatCurrency(line.line_total)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {filteredOpenOrders.length === 0
                      ? 'No uninvoiced orders match this customer search.'
                      : 'Select an open order to preview its billable items.'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                  placeholder="Optional invoice notes"
                />
              </div>

              {selectedOrder ? (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                    <span>Tax</span>
                    <span>{formatCurrency(selectedOrder.tax_amount)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                    <span className={cn('text-primary', parseAmount(selectedOrder.discount_amount) <= 0 && 'text-muted-foreground')}>
                      Add Discount
                    </span>
                    <span>-{formatCurrency(selectedOrder.discount_amount)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <span className="font-semibold">Total Due</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              ) : null}

              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
              <Button className="w-full" onClick={() => void onCreateInvoice()} disabled={!selectedOrder || submitting}>
                {submitting ? 'Generating…' : 'Generate Invoice'}
              </Button>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold">Record Payment</p>
                {selectedInvoice ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                      <p className="font-medium">{selectedInvoice.invoice_number}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{selectedInvoice.customer_name}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Remaining balance: <span className="font-semibold text-foreground">{formatCurrency(selectedInvoiceBalance)}</span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</p>
                      <Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} type="number" min="0" step="0.01" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Method</p>
                      <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="mobile">Mobile money</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference</p>
                      <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Optional receipt or transaction ref" />
                    </div>
                    {paymentError ? <p className="text-sm text-destructive">{paymentError}</p> : null}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void onRecordPayment()}
                      disabled={!selectedInvoice || selectedInvoiceBalance <= 0 || paymentSubmitting}
                    >
                      {paymentSubmitting ? 'Saving Payment…' : 'Record Payment'}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Select an invoice from the table to record a payment.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
