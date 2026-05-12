import {
  AlertTriangle,
  Bell,
  Filter,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  Search,
  Star,
  UserPlus,
} from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '@/api/client'
import * as customerService from '@/api/services/customerService'
import type { Customer, CustomerDetail, CustomerTransaction } from '@/api/types'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type EditorMode = 'view' | 'create' | 'edit'

type CustomerDraft = {
  name: string
  phone: string
  email: string
  address: string
  preferences: string
  notes: string
}

const emptyDraft: CustomerDraft = {
  name: '',
  phone: '',
  email: '',
  address: '',
  preferences: '',
  notes: '',
}

const stitchCustomerImages = [
  '/stitch-customer-eleanor-thumb.jpg',
  null,
  '/stitch-customer-sarah.jpg',
  null,
  '/stitch-customer-jessica.jpg',
] as const

function customerCode(customer: Customer): string {
  return `CUST-${String(customer.id).padStart(5, '0')}`
}

function sinceLabel(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function loyaltyTier(points: number): 'Gold Member' | 'Silver Member' | 'Regular' {
  if (points >= 100) return 'Gold Member'
  if (points >= 50) return 'Silver Member'
  return 'Regular'
}

function tierClasses(points: number): string {
  const tier = loyaltyTier(points)
  if (tier === 'Gold Member') return 'bg-amber-50 text-amber-900 border-amber-200'
  if (tier === 'Silver Member') return 'bg-slate-100 text-slate-800 border-slate-200'
  return 'bg-muted text-muted-foreground border-border'
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function splitTokens(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function avatarForCustomer(customer: Customer, index: number): string | null {
  if (customer.id === 1) return '/stitch-customer-eleanor-profile.jpg'
  return stitchCustomerImages[index % stitchCustomerImages.length]
}

export function CustomersPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Customer[]>([])
  const [customerCount, setCustomerCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [mode, setMode] = useState<EditorMode>('view')
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [loyaltyFilter, setLoyaltyFilter] = useState<'all' | 'gold' | 'silver' | 'regular'>('all')
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(queryInput.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [queryInput])

  useEffect(() => {
    setPage(1)
  }, [loyaltyFilter, query])

  async function loadCustomers(
    activeQuery: string,
    activePage: number,
    activeTier: 'all' | 'gold' | 'silver' | 'regular',
  ) {
    setLoadError(null)
    setLoading(true)
    try {
      const response = await customerService.listCustomersPage({
        q: activeQuery || undefined,
        tier: activeTier !== 'all' ? activeTier : undefined,
        page: activePage,
      })
      setRows(response.results)
      setCustomerCount(response.count)
      setSelectedId((current) => {
        if (current && response.results.some((customer) => customer.id === current)) return current
        return response.results[0]?.id ?? null
      })
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCustomers(query, page, loyaltyFilter)
  }, [loyaltyFilter, page, query])

  const filteredRows = useMemo(() => rows, [rows])

  useEffect(() => {
    if (mode === 'create') return
    if (filteredRows.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredRows.some((customer) => customer.id === selectedId)) {
      setSelectedId(filteredRows[0].id)
    }
  }, [filteredRows, mode, selectedId])

  useEffect(() => {
    if (!selectedId || mode === 'create') {
      setSelectedCustomer(null)
      setTransactions([])
      return
    }
    let cancelled = false
    setDetailsLoading(true)
    setDetailsError(null)
    ;(async () => {
      try {
        const [customer, customerTransactions] = await Promise.all([
          customerService.getCustomer(selectedId),
          customerService.getCustomerTransactions(selectedId),
        ])
        if (!cancelled) {
          setSelectedCustomer(customer)
          setTransactions(customerTransactions)
        }
      } catch (e) {
        if (!cancelled) {
          setDetailsError(e instanceof ApiError ? e.message : 'Failed to load customer details')
        }
      } finally {
        if (!cancelled) setDetailsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, selectedId])

  useEffect(() => {
    if (mode === 'create') {
      setDraft(emptyDraft)
      setFormError(null)
      return
    }
    if (mode === 'edit' && selectedCustomer) {
      setDraft({
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        email: selectedCustomer.email ?? '',
        address: selectedCustomer.address ?? '',
        preferences: selectedCustomer.preferences ?? '',
        notes: selectedCustomer.notes ?? '',
      })
      setFormError(null)
    }
  }, [mode, selectedCustomer])

  function onDraftChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target
    setDraft((current) => ({ ...current, [name]: value }))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.name.trim() || !draft.phone.trim()) {
      setFormError('Name and phone are required.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (mode === 'create') {
        const created = await customerService.createCustomer({
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim() || undefined,
          address: draft.address.trim() || undefined,
          preferences: draft.preferences.trim() || undefined,
          notes: draft.notes.trim() || undefined,
        })
        await loadCustomers(query, page, loyaltyFilter)
        setSelectedId(created.id)
        setMode('view')
      } else if (mode === 'edit' && selectedId) {
        await customerService.updateCustomer(selectedId, {
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim() || undefined,
          address: draft.address.trim() || undefined,
          preferences: draft.preferences.trim() || undefined,
          notes: draft.notes.trim() || undefined,
        })
        await loadCustomers(query, page, loyaltyFilter)
        setMode('view')
      }
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Could not save customer')
    } finally {
      setSaving(false)
    }
  }

  const selectedRow = filteredRows.find((customer) => customer.id === selectedId) ?? rows.find((customer) => customer.id === selectedId) ?? null
  const selectedRowIndex = filteredRows.findIndex((customer) => customer.id === selectedRow?.id)
  const activeCustomer = selectedCustomer ?? selectedRow
  const preferenceTags = splitTokens(activeCustomer?.preferences ?? '')
  const noteTags = splitTokens(activeCustomer?.notes ?? '')
  const maxPage = Math.max(1, Math.ceil(customerCount / 25))
  const startRow = customerCount === 0 ? 0 : (page - 1) * 25 + 1
  const endRow = Math.min(page * 25, customerCount)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <header className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-8 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="rounded-full pl-9"
              placeholder="Search customers, orders..."
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="relative rounded-full p-2 text-muted-foreground transition hover:bg-muted" aria-label="Notifications">
              <Bell className="size-5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
            </button>
            <button type="button" className="rounded-full p-2 text-muted-foreground transition hover:bg-muted" aria-label="Help">
              <HelpCircle className="size-5" />
            </button>
            <img
              src="/stitch-customer-manager.jpg"
              alt="Manager profile"
              className="hidden size-9 rounded-full border object-cover sm:block"
            />
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Customer Directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your customer base, track preferences, and view transaction histories.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <Button variant="outline" className="gap-2" onClick={() => setShowFilters((value) => !value)}>
            <Filter className="size-4" />
            Filters
          </Button>
          <Button
            className="gap-2"
            onClick={() => {
              setMode('create')
            }}
          >
            <UserPlus className="size-4" />
            Add New Customer
          </Button>
        </div>
      </div>

      {showFilters ? (
        <div className="flex flex-wrap gap-3">
          <Select value={loyaltyFilter} onValueChange={(value) => setLoyaltyFilter(value as typeof loyaltyFilter)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by loyalty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All loyalty tiers</SelectItem>
              <SelectItem value="gold">Gold members</SelectItem>
              <SelectItem value="silver">Silver members</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="overflow-hidden border-border/80 lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-4">
            <CardTitle className="text-xl">All Customers</CardTitle>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Total: {customerCount}</span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading customers…</p>
            ) : loadError ? (
              <p className="p-6 text-sm text-destructive">{loadError}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-14" />
                    <TableHead>Customer Details</TableHead>
                    <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="text-right">Status / Loyalty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                        No customers matched the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((customer, index) => {
                      const isSelected = mode !== 'create' && customer.id === selectedRow?.id
                      const imageSrc = avatarForCustomer(customer, index)
                      return (
                        <TableRow
                          key={customer.id}
                          className={cn(
                            'cursor-pointer border-l-2 transition-colors',
                            isSelected ? 'border-l-primary bg-primary/5 hover:bg-primary/10' : 'border-l-transparent',
                          )}
                          onClick={() => {
                            setSelectedId(customer.id)
                            setMode('view')
                          }}
                        >
                          <TableCell className="text-center">
                            {imageSrc ? (
                              <img src={imageSrc} alt={customer.name} className="mx-auto size-10 rounded-full border object-cover" />
                            ) : (
                              <div className="mx-auto flex size-10 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-muted-foreground">
                                {initials(customer.name)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold">{customer.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {customerCode(customer)} • Since {sinceLabel(customer.created_at)}
                            </p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <p className="text-sm">{customer.phone}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{customer.email || 'No email on file'}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium', tierClasses(customer.loyalty_points))}>
                              {loyaltyTier(customer.loyalty_points) !== 'Regular' ? <Star className="size-3.5 fill-current" /> : null}
                              {loyaltyTier(customer.loyalty_points)}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
            {!loading && !loadError ? (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Showing {startRow}-{endRow} of {customerCount} customers
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
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-4">
          <Card className="overflow-hidden border-border/80">
            {mode === 'create' || mode === 'edit' ? (
              <>
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle>{mode === 'create' ? 'Add New Customer' : 'Edit Customer'}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input name="name" value={draft.name} onChange={onDraftChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <Input name="phone" value={draft.phone} onChange={onDraftChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input name="email" type="email" value={draft.email} onChange={onDraftChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Address</label>
                      <textarea
                        name="address"
                        rows={3}
                        value={draft.address}
                        onChange={onDraftChange}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preferences</label>
                      <textarea
                        name="preferences"
                        rows={3}
                        value={draft.preferences}
                        onChange={onDraftChange}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Comma-separated laundry preferences"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes</label>
                      <textarea
                        name="notes"
                        rows={3}
                        value={draft.notes}
                        onChange={onDraftChange}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Customer notes, alerts, or instructions"
                      />
                    </div>
                    {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? 'Saving…' : mode === 'create' ? 'Create Customer' : 'Save Changes'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setMode('view')}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </>
            ) : detailsLoading ? (
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Loading customer details…</p>
              </CardContent>
            ) : detailsError ? (
              <CardContent className="p-6">
                <p className="text-sm text-destructive">{detailsError}</p>
              </CardContent>
            ) : activeCustomer ? (
              <>
                <CardContent className="border-b bg-muted/20 p-6 text-center">
                  {avatarForCustomer(activeCustomer, selectedRowIndex >= 0 ? selectedRowIndex : 0) ? (
                    <img
                      src={avatarForCustomer(activeCustomer, selectedRowIndex >= 0 ? selectedRowIndex : 0) ?? undefined}
                      alt={activeCustomer.name}
                      className="mx-auto mb-3 size-20 rounded-full border-2 border-background object-cover shadow-sm"
                    />
                  ) : (
                    <div className="mx-auto mb-3 flex size-20 items-center justify-center rounded-full border-2 border-background bg-muted text-lg font-semibold text-muted-foreground shadow-sm">
                      {initials(activeCustomer.name)}
                    </div>
                  )}
                  <h3 className="text-2xl font-bold">{activeCustomer.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {customerCode(activeCustomer)} • {loyaltyTier(activeCustomer.loyalty_points)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setMode('edit')}>
                      Edit Profile
                    </Button>
                    <Button className="flex-1" onClick={() => navigate(`/orders/new?customer=${activeCustomer.id}`)}>
                      New Order
                    </Button>
                  </div>
                </CardContent>

                <CardContent className="space-y-4 p-4">
                  <div className="rounded-lg border bg-card p-4">
                    <h4 className="mb-3 border-b pb-2 text-sm font-semibold text-muted-foreground">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Phone className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">{activeCustomer.phone}</p>
                          <p className="text-xs text-muted-foreground">Mobile</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">{activeCustomer.email || 'No email on file'}</p>
                          <p className="text-xs text-muted-foreground">Primary Email</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm whitespace-pre-line">{activeCustomer.address || 'No address on file'}</p>
                          <p className="text-xs text-muted-foreground">Home Address</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-4">
                    <h4 className="mb-3 border-b pb-2 text-sm font-semibold text-muted-foreground">Laundry Preferences</h4>
                    <div className="flex flex-wrap gap-2">
                      {preferenceTags.map((tag) => (
                        <span key={tag} className="rounded border bg-secondary/20 px-2.5 py-1 text-xs text-secondary-foreground">
                          {tag}
                        </span>
                      ))}
                      {noteTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs text-destructive"
                        >
                          <AlertTriangle className="size-3.5" />
                          {tag}
                        </span>
                      ))}
                      {preferenceTags.length === 0 && noteTags.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No preferences recorded yet.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-4">
                    <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Recent Transactions</h4>
                    <div className="space-y-2">
                      {transactions.map((transaction, index) => (
                        <div key={`${transaction.type}-${transaction.reference}-${index}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold">{transaction.reference}</p>
                            <p className="text-xs text-muted-foreground">{new Date(transaction.occurred_at).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCurrency(transaction.amount)}</p>
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {transaction.type} · {transaction.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {transactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No transaction history recorded for this customer yet.</p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Select a customer to view their profile.</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
