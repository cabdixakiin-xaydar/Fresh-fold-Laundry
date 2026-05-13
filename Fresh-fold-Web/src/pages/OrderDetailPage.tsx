import { useEffect, useMemo, useState } from 'react'
import { FileText, Printer } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ApiError } from '@/api/client'
import * as billingService from '@/api/services/billingService'
import * as customerService from '@/api/services/customerService'
import * as orderService from '@/api/services/orderService'
import type { Customer, Order, ServiceType } from '@/api/types'
import { formatCurrency, formatShortDate } from '@/lib/formatters'
import { openReceiptPdfInNewTab, printReceiptPdf } from '@/lib/receiptPdf'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ItemDraft = {
  id: number
  service_type: number
  quantity: string
  weight_kg: string
}

type NewItemDraft = {
  service_type: string
  quantity: string
  weight_kg: string
}

const emptyNewItem: NewItemDraft = {
  service_type: '',
  quantity: '1',
  weight_kg: '',
}

function invoicePaymentBadgeVariant(status: string): 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'warning'
    default:
      return 'destructive'
  }
}

export function OrderDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const orderId = Number(id)
  const [order, setOrder] = useState<Order | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<ServiceType[]>([])
  const [orderCustomerId, setOrderCustomerId] = useState('')
  const [orderInstructions, setOrderInstructions] = useState('')
  const [orderStatus, setOrderStatus] = useState('received')
  const [isExpress, setIsExpress] = useState(false)
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>([])
  const [newItem, setNewItem] = useState<NewItemDraft>(emptyNewItem)
  const [error, setError] = useState<string | null>(null)
  const [savingHeader, setSavingHeader] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [itemActionId, setItemActionId] = useState<number | null>(null)
  const [addingItem, setAddingItem] = useState(false)
  const [deletingOrder, setDeletingOrder] = useState(false)
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'mobile' | 'other'>('cash')
  const [payReference, setPayReference] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  const statusOptions = ['received', 'processing', 'ready', 'delivered']

  const selectedNewItemService = services.find((service) => String(service.id) === newItem.service_type)

  const draftTotal = useMemo(() => {
    return itemDrafts.reduce((sum, draft) => {
      const service = services.find((row) => row.id === draft.service_type)
      if (!service) return sum
      const base = Number.parseFloat(service.base_price)
      if (service.pricing_unit === 'kg') {
        return sum + base * Number.parseFloat(draft.weight_kg || '0')
      }
      return sum + base * Number.parseFloat(draft.quantity || '0')
    }, 0)
  }, [itemDrafts, services])

  const invoice = order?.invoice ?? null

  useEffect(() => {
    if (!invoice) {
      setPayAmount('')
      return
    }
    const total = Number.parseFloat(invoice.total)
    const paid = Number.parseFloat(invoice.amount_paid)
    const remaining = Math.max((Number.isFinite(total) ? total : 0) - (Number.isFinite(paid) ? paid : 0), 0)
    setPayAmount(remaining > 0 ? remaining.toFixed(2) : '')
  }, [invoice?.id, invoice?.total, invoice?.amount_paid])

  function syncDrafts(nextOrder: Order) {
    setOrder(nextOrder)
    setOrderCustomerId(String(nextOrder.customer))
    setOrderInstructions(nextOrder.special_instructions || '')
    setOrderStatus(nextOrder.status)
    setIsExpress(nextOrder.is_express)
    setItemDrafts(
      (nextOrder.items ?? []).map((item) => ({
        id: item.id,
        service_type: item.service_type,
        quantity: String(item.quantity),
        weight_kg: item.weight_kg ?? '',
      })),
    )
  }

  async function loadOrderData() {
    const [loadedOrder, loadedCustomers, loadedServices] = await Promise.all([
      orderService.getOrder(orderId),
      customerService.listCustomers(),
      orderService.listServiceTypes(),
    ])
    setCustomers(loadedCustomers)
    setServices(loadedServices.filter((service) => service.active))
    syncDrafts(loadedOrder)
  }

  useEffect(() => {
    if (!Number.isFinite(orderId)) return
    let cancelled = false
    ;(async () => {
      try {
        const [loadedOrder, loadedCustomers, loadedServices] = await Promise.all([
          orderService.getOrder(orderId),
          customerService.listCustomers(),
          orderService.listServiceTypes(),
        ])
        if (!cancelled) {
          setCustomers(loadedCustomers)
          setServices(loadedServices.filter((service) => service.active))
          syncDrafts(loadedOrder)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Order not found')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (!Number.isFinite(orderId)) {
    return <p className="p-6 text-sm text-muted-foreground">Invalid order id.</p>
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Link to="/orders" className="text-sm font-medium text-primary hover:underline">
              Back to orders
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!order) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  }

  const lines = order.items ?? []

  async function onSaveHeader() {
    setSavingHeader(true)
    setError(null)
    try {
      const updated = await orderService.updateOrder(orderId, {
        customer: Number(orderCustomerId),
        special_instructions: orderInstructions || '',
        is_express: isExpress,
      })
      syncDrafts(updated)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update order')
    } finally {
      setSavingHeader(false)
    }
  }

  async function onSaveStatus() {
    setSavingStatus(true)
    setError(null)
    try {
      const updated = await orderService.updateOrderStatus(orderId, orderStatus)
      syncDrafts(updated)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update order status')
    } finally {
      setSavingStatus(false)
    }
  }

  async function onUpdateItem(draft: ItemDraft) {
    setItemActionId(draft.id)
    setError(null)
    try {
      const service = services.find((row) => row.id === draft.service_type)
      if (!service) throw new Error('Select a valid service type.')
      if (service.pricing_unit === 'kg' && (!draft.weight_kg || Number.parseFloat(draft.weight_kg) <= 0)) {
        throw new Error(`Enter a valid weight for ${service.name}.`)
      }
      if (service.pricing_unit !== 'kg' && (!draft.quantity || Number.parseInt(draft.quantity, 10) < 1)) {
        throw new Error(`Enter a valid quantity for ${service.name}.`)
      }
      await orderService.updateOrderItem(draft.id, {
        service_type: draft.service_type,
        quantity: service.pricing_unit === 'kg' ? undefined : Number.parseInt(draft.quantity, 10),
        weight_kg: service.pricing_unit === 'kg' ? draft.weight_kg : null,
      })
      await loadOrderData()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not update line item')
    } finally {
      setItemActionId(null)
    }
  }

  async function onDeleteItem(itemId: number) {
    setItemActionId(itemId)
    setError(null)
    try {
      await orderService.deleteOrderItem(itemId)
      await loadOrderData()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete line item')
    } finally {
      setItemActionId(null)
    }
  }

  async function onAddItem() {
    setAddingItem(true)
    setError(null)
    try {
      if (!newItem.service_type) {
        throw new Error('Select a service before adding a new line.')
      }
      if (!selectedNewItemService) {
        throw new Error('Selected service is no longer available.')
      }
      if (selectedNewItemService.pricing_unit === 'kg' && (!newItem.weight_kg || Number.parseFloat(newItem.weight_kg) <= 0)) {
        throw new Error(`Enter a valid weight for ${selectedNewItemService.name}.`)
      }
      if (selectedNewItemService.pricing_unit !== 'kg' && (!newItem.quantity || Number.parseInt(newItem.quantity, 10) < 1)) {
        throw new Error(`Enter a valid quantity for ${selectedNewItemService.name}.`)
      }
      await orderService.createOrderItem({
        order: orderId,
        service_type: Number(newItem.service_type),
        quantity: selectedNewItemService.pricing_unit === 'kg' ? undefined : Number.parseInt(newItem.quantity, 10),
        weight_kg: selectedNewItemService.pricing_unit === 'kg' ? newItem.weight_kg : null,
      })
      setNewItem(emptyNewItem)
      await loadOrderData()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not add line item')
    } finally {
      setAddingItem(false)
    }
  }

  async function onDeleteOrder() {
    if (!window.confirm('Delete this order? This cannot be undone.')) return
    setDeletingOrder(true)
    setError(null)
    try {
      await orderService.deleteOrder(orderId)
      navigate('/orders', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete order')
      setDeletingOrder(false)
    }
  }

  async function onCreateInvoiceFromOrder() {
    setCreatingInvoice(true)
    setBillingError(null)
    try {
      await billingService.createInvoiceFromOrder({ order_id: orderId, notes: invoiceNotes || undefined })
      setInvoiceNotes('')
      await loadOrderData()
    } catch (e) {
      setBillingError(e instanceof ApiError ? e.message : 'Could not create invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  async function onRecordInvoicePayment() {
    if (!invoice) return
    setPaySubmitting(true)
    setBillingError(null)
    try {
      await billingService.createPayment({
        invoice: invoice.id,
        amount: payAmount,
        method: payMethod,
        reference: payReference || undefined,
      })
      setPayReference('')
      await loadOrderData()
    } catch (e) {
      setBillingError(e instanceof ApiError ? e.message : 'Could not record payment')
    } finally {
      setPaySubmitting(false)
    }
  }

  async function onViewReceiptPdf() {
    if (!invoice || invoice.payment_status !== 'paid') return
    setBillingError(null)
    try {
      const blob = await billingService.downloadReceiptPdf(invoice.id)
      openReceiptPdfInNewTab(blob)
    } catch (e) {
      setBillingError(e instanceof ApiError ? e.message : 'Could not open receipt')
    }
  }

  async function onPrintReceiptPdf() {
    if (!invoice || invoice.payment_status !== 'paid') return
    setBillingError(null)
    try {
      const blob = await billingService.downloadReceiptPdf(invoice.id)
      printReceiptPdf(blob)
    } catch (e) {
      setBillingError(e instanceof ApiError ? e.message : 'Could not print receipt')
    }
  }

  const payRemaining = invoice
    ? Math.max(Number.parseFloat(invoice.total) - Number.parseFloat(invoice.amount_paid), 0)
    : 0

  const canPrintFinalReceipt = invoice?.payment_status === 'paid'

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <Link to="/orders" className="text-sm font-medium text-primary hover:underline">
        ← Orders
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
        <Badge variant="secondary" className="capitalize">
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Name:</span> {order.customer_name}
            </p>
            <p>
              <span className="font-semibold">Phone:</span> {order.customer_phone || '—'}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {order.customer_email || '—'}
            </p>
            <p>
              <span className="font-semibold">Address:</span> {order.customer_address || '—'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Source:</span> {order.source === 'in_store' ? 'In-store walk-in / staff created' : 'Web booking'}
            </p>
            <p>
              <span className="font-semibold">Created:</span> {formatShortDate(order.created_at)}
            </p>
            <p>
              <span className="font-semibold">Subtotal:</span> {formatCurrency(order.subtotal)}
            </p>
            <p>
              <span className="font-semibold">Tax:</span> {formatCurrency(order.tax_amount)}
            </p>
            <p>
              <span className="font-semibold">Total:</span> {formatCurrency(order.total)}
            </p>
            <p>
              <span className="font-semibold">Draft line estimate:</span> {formatCurrency(draftTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">Order Controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={orderCustomerId}
              onChange={(event) => setOrderCustomerId(event.target.value)}
            >
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} — {customer.phone}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <div className="flex gap-2">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={orderStatus}
                onChange={(event) => setOrderStatus(event.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" disabled={savingStatus} onClick={() => void onSaveStatus()}>
                {savingStatus ? 'Saving…' : 'Update'}
              </Button>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Special Instructions</label>
            <textarea
              rows={4}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={orderInstructions}
              onChange={(event) => setOrderInstructions(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isExpress} onChange={(event) => setIsExpress(event.target.checked)} />
            Express service
          </label>
          <div className="md:col-span-2">
            <Button type="button" disabled={savingHeader} onClick={() => void onSaveHeader()}>
              {savingHeader ? 'Saving Changes…' : 'Save Order Details'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Qty / Weight</TableHead>
                <TableHead>Line</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const draft = itemDrafts.find((item) => item.id === line.id)
                const service = services.find((row) => row.id === draft?.service_type)
                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <select
                        className="flex h-9 w-full min-w-[180px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={draft?.service_type ?? line.service_type}
                        onChange={(event) =>
                          setItemDrafts((current) =>
                            current.map((item) =>
                              item.id === line.id
                                ? {
                                    ...item,
                                    service_type: Number(event.target.value),
                                    quantity: '1',
                                    weight_kg: '',
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        {services.map((serviceRow) => (
                          <option key={serviceRow.id} value={serviceRow.id}>
                            {serviceRow.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step={service?.pricing_unit === 'kg' ? '0.01' : '1'}
                        value={service?.pricing_unit === 'kg' ? draft?.weight_kg ?? '' : draft?.quantity ?? ''}
                        onChange={(event) =>
                          setItemDrafts((current) =>
                            current.map((item) =>
                              item.id === line.id
                                ? service?.pricing_unit === 'kg'
                                  ? { ...item, weight_kg: event.target.value }
                                  : { ...item, quantity: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>{formatCurrency(line.line_total)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={itemActionId === line.id || !draft}
                          onClick={() => draft && void onUpdateItem(draft)}
                        >
                          Save
                        </Button>
                        <Button type="button" variant="destructive" disabled={itemActionId === line.id} onClick={() => void onDeleteItem(line.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-semibold">Add Another Line Item</p>
            <div className="grid gap-4 md:grid-cols-[1.5fr_0.8fr_auto]">
              <div className="space-y-2">
                <label className="text-sm font-medium">Service</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={newItem.service_type}
                  onChange={(event) =>
                    setNewItem({
                      service_type: event.target.value,
                      quantity: '1',
                      weight_kg: '',
                    })
                  }
                >
                  <option value="">Select…</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{selectedNewItemService?.pricing_unit === 'kg' ? 'Weight (kg)' : 'Quantity'}</label>
                <Input
                  type="number"
                  min="0"
                  step={selectedNewItemService?.pricing_unit === 'kg' ? '0.01' : '1'}
                  value={selectedNewItemService?.pricing_unit === 'kg' ? newItem.weight_kg : newItem.quantity}
                  onChange={(event) =>
                    setNewItem((current) =>
                      selectedNewItemService?.pricing_unit === 'kg'
                        ? { ...current, weight_kg: event.target.value }
                        : { ...current, quantity: event.target.value }
                    )
                  }
                />
              </div>
              <div className="flex items-end">
                <Button type="button" disabled={addingItem} onClick={() => void onAddItem()}>
                  {addingItem ? 'Adding…' : 'Add Line'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Invoice &amp; payment</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link to={invoice ? `/billing?invoice=${invoice.id}&focus=payment` : '/billing'}>Open billing hub</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {billingError ? <p className="text-sm text-destructive">{billingError}</p> : null}

          {!invoice ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Generate an invoice from this order&apos;s current totals. You can then record payments and print a PDF
                receipt.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Invoice notes (optional)</label>
                <textarea
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={invoiceNotes}
                  onChange={(event) => setInvoiceNotes(event.target.value)}
                  placeholder="e.g. corporate PO number, billing contact…"
                />
              </div>
              <Button type="button" disabled={creatingInvoice} onClick={() => void onCreateInvoiceFromOrder()}>
                {creatingInvoice ? 'Creating…' : 'Generate invoice'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold">{invoice.invoice_number}</p>
                <Badge variant={invoicePaymentBadgeVariant(invoice.payment_status)} className="capitalize">
                  {invoice.payment_status}
                </Badge>
                <span className="text-xs text-muted-foreground">Issued {formatShortDate(invoice.issued_at)}</span>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="font-medium text-muted-foreground">Subtotal:</span> {formatCurrency(invoice.subtotal)}
                </p>
                <p>
                  <span className="font-medium text-muted-foreground">Tax:</span> {formatCurrency(invoice.tax_amount)}
                </p>
                <p>
                  <span className="font-medium text-muted-foreground">Discount:</span> −{formatCurrency(invoice.discount_amount)}
                </p>
                <p>
                  <span className="font-medium text-muted-foreground">Total:</span> {formatCurrency(invoice.total)}
                </p>
                <p className="sm:col-span-2">
                  <span className="font-medium text-muted-foreground">Amount paid:</span> {formatCurrency(invoice.amount_paid)}
                  <span className="text-muted-foreground"> · </span>
                  <span className="font-medium">Balance: {formatCurrency(payRemaining)}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={!canPrintFinalReceipt}
                  title={
                    canPrintFinalReceipt ? 'View PDF receipt' : 'Record payment in Billing until the balance is zero.'
                  }
                  onClick={() => void onViewReceiptPdf()}
                >
                  <FileText className="size-4" />
                  View receipt PDF
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="gap-2"
                  disabled={!canPrintFinalReceipt}
                  title={
                    canPrintFinalReceipt ? 'Print receipt' : 'Record payment in Billing until the balance is zero.'
                  }
                  onClick={() => void onPrintReceiptPdf()}
                >
                  <Printer className="size-4" />
                  Print receipt
                </Button>
                {!canPrintFinalReceipt && invoice ? (
                  <Button variant="secondary" size="sm" asChild>
                    <Link to={`/billing?invoice=${invoice.id}&focus=payment`}>Go to payment</Link>
                  </Button>
                ) : null}
              </div>
              {!canPrintFinalReceipt && invoice ? (
                <p className="text-xs text-muted-foreground">
                  Final receipt PDF is available after the invoice is fully paid. Use Go to payment to open Billing.
                </p>
              ) : null}

              {invoice.payments.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium">Payments</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.payments.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-muted-foreground">{formatShortDate(row.paid_at)}</TableCell>
                          <TableCell className="capitalize">{row.method.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{row.reference || '—'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

              {payRemaining > 0 ? (
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm font-semibold">Record payment</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</label>
                      <Input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Method</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="mobile">Mobile money</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reference</label>
                      <Input
                        value={payReference}
                        onChange={(e) => setPayReference(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <Button type="button" className="mt-3" disabled={paySubmitting || !payAmount} onClick={() => void onRecordInvoicePayment()}>
                    {paySubmitting ? 'Saving…' : 'Record payment'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Invoice fully paid.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="destructive" disabled={deletingOrder} onClick={() => void onDeleteOrder()}>
            {deletingOrder ? 'Deleting…' : 'Delete Order'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
