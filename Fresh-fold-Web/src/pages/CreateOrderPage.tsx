import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ApiError } from '@/api/client'
import * as customerService from '@/api/services/customerService'
import * as orderService from '@/api/services/orderService'
import type { Customer, ServiceType } from '@/api/types'
import { formatCurrency } from '@/lib/formatters'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CustomerMode = 'existing' | 'new'

type ItemDraft = {
  serviceId: string
  quantity: string
  weight_kg: string
}

type NewCustomerDraft = {
  name: string
  phone: string
  email: string
  address: string
  preferences: string
  notes: string
}

const emptyItem = (): ItemDraft => ({
  serviceId: '',
  quantity: '1',
  weight_kg: '',
})

const emptyCustomer: NewCustomerDraft = {
  name: '',
  phone: '',
  email: '',
  address: '',
  preferences: '',
  notes: '',
}

export function CreateOrderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<ServiceType[]>([])
  const [customerMode, setCustomerMode] = useState<CustomerMode>('existing')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState<NewCustomerDraft>(emptyCustomer)
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [instructions, setInstructions] = useState('')
  const [isExpress, setIsExpress] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [c, s] = await Promise.all([customerService.listCustomers(), orderService.listServiceTypes()])
        if (!cancelled) {
          setCustomers(c)
          setServices(s.filter((x) => x.active))
          const presetCustomerId = searchParams.get('customer')
          if (presetCustomerId && c.some((customer) => String(customer.id) === presetCustomerId)) {
            setSelectedCustomerId(presetCustomerId)
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof ApiError ? e.message : 'Failed to load catalog')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const service = services.find((row) => String(row.id) === item.serviceId)
      if (!service) return sum
      const base = Number.parseFloat(service.base_price)
      if (!Number.isFinite(base)) return sum
      if (service.pricing_unit === 'kg') {
        const weight = Number.parseFloat(item.weight_kg || '0')
        return sum + (Number.isFinite(weight) ? base * weight : 0)
      }
      const quantity = Number.parseInt(item.quantity || '0', 10)
      return sum + (Number.isFinite(quantity) ? base * quantity : 0)
    }, 0)
  }, [items, services])

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
  }

  async function onSubmit() {
    setSubmitting(true)
    setSubmitError(null)

    try {
      let customerId = selectedCustomerId
      if (customerMode === 'existing') {
        if (!customerId) {
          setSubmitError('Select a customer or register a new walk-in customer.')
          return
        }
      } else {
        if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
          setSubmitError('Walk-in customer name and phone are required.')
          return
        }
        const createdCustomer = await customerService.createCustomer({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          email: newCustomer.email.trim() || undefined,
          address: newCustomer.address.trim() || undefined,
          preferences: newCustomer.preferences.trim() || undefined,
          notes: newCustomer.notes.trim() || undefined,
        })
        customerId = String(createdCustomer.id)
      }

      const payloadItems = items.map((item) => {
        const service = services.find((row) => String(row.id) === item.serviceId)
        if (!service) {
          throw new Error('Select a service for every line item.')
        }
        if (service.pricing_unit === 'kg') {
          if (!item.weight_kg || Number.parseFloat(item.weight_kg) <= 0) {
            throw new Error(`Enter a valid weight for ${service.name}.`)
          }
          return {
            service_type: service.id,
            weight_kg: item.weight_kg,
          }
        }
        const quantity = Number.parseInt(item.quantity, 10)
        if (!Number.isFinite(quantity) || quantity < 1) {
          throw new Error(`Enter a valid quantity for ${service.name}.`)
        }
        return {
          service_type: service.id,
          quantity,
        }
      })

      const order = await orderService.createOrder({
        customer: Number(customerId),
        is_express: isExpress,
        special_instructions: instructions.trim() || undefined,
        items: payloadItems,
      })
      navigate(`/orders/${order.id}`, { replace: true })
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not create order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/orders" className="font-medium text-primary hover:underline">
          ← Orders
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New In-Store Order</h1>
        <p className="text-sm text-muted-foreground">
          Register a walk-in customer or pick an existing customer, then build the order with one or more service lines.
        </p>
      </div>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Customer Intake</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button type="button" variant={customerMode === 'existing' ? 'default' : 'outline'} onClick={() => setCustomerMode('existing')}>
                  Existing Customer
                </Button>
                <Button type="button" variant={customerMode === 'new' ? 'default' : 'outline'} onClick={() => setCustomerMode('new')}>
                  Register Walk-In
                </Button>
              </div>

              {customerMode === 'existing' ? (
                <div className="space-y-2">
                  <Label htmlFor="customerId">Customer</Label>
                  <select
                    id="customerId"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedCustomerId}
                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                  >
                    <option value="">Select…</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} — {customer.phone}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer-name">Name</Label>
                    <Input
                      id="customer-name"
                      value={newCustomer.name}
                      onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone">Phone</Label>
                    <Input
                      id="customer-phone"
                      value={newCustomer.phone}
                      onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-email">Email</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-preferences">Preferences</Label>
                    <Input
                      id="customer-preferences"
                      value={newCustomer.preferences}
                      onChange={(event) => setNewCustomer((current) => ({ ...current, preferences: event.target.value }))}
                      placeholder="Cold wash, hypoallergenic, etc."
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="customer-address">Address</Label>
                    <textarea
                      id="customer-address"
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={newCustomer.address}
                      onChange={(event) => setNewCustomer((current) => ({ ...current, address: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="customer-notes">Notes</Label>
                    <textarea
                      id="customer-notes"
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={newCustomer.notes}
                      onChange={(event) => setNewCustomer((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Order Items</CardTitle>
              <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, emptyItem()])}>
                Add Line
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => {
                const service = services.find((row) => String(row.id) === item.serviceId)
                return (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-[1.5fr_0.8fr_auto]">
                      <div className="space-y-2">
                        <Label>Service</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={item.serviceId}
                          onChange={(event) =>
                            updateItem(index, {
                              serviceId: event.target.value,
                              quantity: '1',
                              weight_kg: '',
                            })
                          }
                        >
                          <option value="">Select…</option>
                          {services.map((serviceRow) => (
                            <option key={serviceRow.id} value={serviceRow.id}>
                              {serviceRow.name} ({formatCurrency(serviceRow.base_price)} / {serviceRow.pricing_unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>{service?.pricing_unit === 'kg' ? 'Weight (kg)' : 'Quantity'}</Label>
                        <Input
                          type="number"
                          min="0"
                          step={service?.pricing_unit === 'kg' ? '0.01' : '1'}
                          value={service?.pricing_unit === 'kg' ? item.weight_kg : item.quantity}
                          onChange={(event) =>
                            updateItem(index, service?.pricing_unit === 'kg' ? { weight_kg: event.target.value } : { quantity: event.target.value })
                          }
                        />
                      </div>

                      <div className="flex items-end">
                        <Button type="button" variant="ghost" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Order Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={isExpress} onChange={(event) => setIsExpress(event.target.checked)} />
                Express service
              </label>

              <div className="space-y-2">
                <Label htmlFor="instructions">Special instructions</Label>
                <textarea
                  id="instructions"
                  rows={4}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Estimated Total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(estimatedTotal)}</p>
              <p className="text-sm text-muted-foreground">Final totals will update from the backend after the order is created.</p>
              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
              <Button className="w-full" type="button" disabled={submitting} onClick={() => void onSubmit()}>
                {submitting ? 'Creating…' : 'Create Order'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
