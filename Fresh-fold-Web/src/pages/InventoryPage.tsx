import { AlertTriangle, Boxes, Plus, Search, TrendingUp, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { ApiError } from '@/api/client'
import * as inventoryService from '@/api/services/inventoryService'
import type { InventoryItemRow, StockMovement, Supplier } from '@/api/types'
import { formatRelativeTime } from '@/lib/formatters'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItemRow[]>([])
  const [visibleItems, setVisibleItems] = useState<InventoryItemRow[]>([])
  const [lowStock, setLowStock] = useState<InventoryItemRow[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [itemCount, setItemCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null)
  const [itemMode, setItemMode] = useState<'create' | 'edit'>('create')
  const [supplierMode, setSupplierMode] = useState<'create' | 'edit'>('create')
  const [itemDraft, setItemDraft] = useState({
    name: '',
    sku: '',
    quantity: '0',
    unit: 'unit',
    low_stock_threshold: '0',
    supplier: '',
  })
  const [supplierDraft, setSupplierDraft] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjust'>('out')
  const [movementQuantity, setMovementQuantity] = useState('1')
  const [movementNote, setMovementNote] = useState('')
  const [itemError, setItemError] = useState<string | null>(null)
  const [supplierError, setSupplierError] = useState<string | null>(null)
  const [movementError, setMovementError] = useState<string | null>(null)
  const [itemSubmitting, setItemSubmitting] = useState(false)
  const [supplierSubmitting, setSupplierSubmitting] = useState(false)
  const [movementSubmitting, setMovementSubmitting] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(queryInput.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [queryInput])

  useEffect(() => {
    setPage(1)
  }, [query, supplierFilter])

  async function loadData(activeQuery: string, activePage: number, activeSupplierFilter: string) {
    setLoading(true)
    setError(null)
    try {
      const [itemsResponse, visibleResponse, lowStockResponse, suppliersResponse, movementResponse] = await Promise.all([
        inventoryService.listItems({
          q: activeQuery || undefined,
          supplier: activeSupplierFilter !== 'all' ? activeSupplierFilter : undefined,
        }),
        inventoryService.listItemsPage({
          q: activeQuery || undefined,
          supplier: activeSupplierFilter !== 'all' ? activeSupplierFilter : undefined,
          page: activePage,
        }),
        inventoryService.listLowStock({
          q: activeQuery || undefined,
          supplier: activeSupplierFilter !== 'all' ? activeSupplierFilter : undefined,
        }),
        inventoryService.listSuppliers(),
        inventoryService.listStockMovements(),
      ])
      setItems(itemsResponse)
      setVisibleItems(visibleResponse.results)
      setItemCount(visibleResponse.count)
      setLowStock(lowStockResponse)
      setSuppliers(suppliersResponse)
      setMovements(movementResponse)
      if (!selectedItem && itemsResponse[0]) {
        setSelectedItem(String(itemsResponse[0].id))
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData(query, page, supplierFilter)
    // selectedItem is intentionally excluded to avoid resetting user choice on reloads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, supplierFilter])

  useEffect(() => {
    const activeItem = items.find((item) => String(item.id) === selectedItem)
    if (itemMode === 'edit' && activeItem) {
      setItemDraft({
        name: activeItem.name,
        sku: activeItem.sku,
        quantity: activeItem.quantity,
        unit: activeItem.unit,
        low_stock_threshold: activeItem.low_stock_threshold,
        supplier: activeItem.supplier != null ? String(activeItem.supplier) : '',
      })
    }
  }, [itemMode, items, selectedItem])

  useEffect(() => {
    const activeSupplier = suppliers.find((supplier) => supplier.id === selectedSupplier)
    if (supplierMode === 'edit' && activeSupplier) {
      setSupplierDraft({
        name: activeSupplier.name,
        contact_name: activeSupplier.contact_name || '',
        phone: activeSupplier.phone || '',
        email: activeSupplier.email || '',
        address: activeSupplier.address || '',
        notes: activeSupplier.notes || '',
      })
    }
  }, [selectedSupplier, supplierMode, suppliers])

  const topSuppliers = useMemo(() => {
    const counts = new Map<number, number>()
    items.forEach((item) => {
      if (item.supplier != null) {
        counts.set(item.supplier, (counts.get(item.supplier) ?? 0) + 1)
      }
    })
    return suppliers
      .map((supplier) => ({ ...supplier, itemCount: counts.get(supplier.id) ?? 0 }))
      .sort((a, b) => b.itemCount - a.itemCount)
  }, [items, suppliers])

  const weeklyUsage = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000
    return movements
      .filter((movement) => movement.movement_type === 'out' && new Date(movement.created_at).getTime() >= threshold)
      .reduce((sum, movement) => sum + Number.parseFloat(movement.quantity), 0)
  }, [movements])

  async function onSubmitMovement() {
    if (!selectedItem) return
    setMovementSubmitting(true)
    setMovementError(null)
    try {
      await inventoryService.createStockMovement({
        item: Number(selectedItem),
        movement_type: movementType,
        quantity: movementQuantity,
        note: movementNote || undefined,
      })
      setMovementNote('')
      setMovementQuantity('1')
      await loadData(query, page, supplierFilter)
    } catch (e) {
      setMovementError(e instanceof ApiError ? e.message : 'Could not record stock movement')
    } finally {
      setMovementSubmitting(false)
    }
  }

  async function onSaveItem() {
    setItemSubmitting(true)
    setItemError(null)
    try {
      if (!itemDraft.name.trim() || !itemDraft.sku.trim()) {
        setItemError('Item name and SKU are required.')
        return
      }
      if (itemMode === 'create') {
        const created = await inventoryService.createItem({
          name: itemDraft.name.trim(),
          sku: itemDraft.sku.trim(),
          quantity: itemDraft.quantity,
          unit: itemDraft.unit.trim() || 'unit',
          low_stock_threshold: itemDraft.low_stock_threshold,
          supplier: itemDraft.supplier ? Number(itemDraft.supplier) : null,
        })
        setSelectedItem(String(created.id))
        setItemMode('edit')
      } else if (selectedItem) {
        await inventoryService.updateItem(Number(selectedItem), {
          name: itemDraft.name.trim(),
          sku: itemDraft.sku.trim(),
          quantity: itemDraft.quantity,
          unit: itemDraft.unit.trim() || 'unit',
          low_stock_threshold: itemDraft.low_stock_threshold,
          supplier: itemDraft.supplier ? Number(itemDraft.supplier) : null,
        })
      }
      await loadData(query, page, supplierFilter)
    } catch (e) {
      setItemError(e instanceof ApiError ? e.message : 'Could not save inventory item')
    } finally {
      setItemSubmitting(false)
    }
  }

  async function onDeleteItem(itemId: number) {
    if (!window.confirm('Delete this inventory item?')) return
    setItemError(null)
    try {
      await inventoryService.deleteItem(itemId)
      if (String(itemId) === selectedItem) {
        setSelectedItem('')
        setItemMode('create')
        setItemDraft({
          name: '',
          sku: '',
          quantity: '0',
          unit: 'unit',
          low_stock_threshold: '0',
          supplier: '',
        })
      }
      await loadData(query, page, supplierFilter)
    } catch (e) {
      setItemError(e instanceof ApiError ? e.message : 'Could not delete inventory item')
    }
  }

  async function onSaveSupplier() {
    setSupplierSubmitting(true)
    setSupplierError(null)
    try {
      if (!supplierDraft.name.trim()) {
        setSupplierError('Supplier name is required.')
        return
      }
      if (supplierMode === 'create') {
        const created = await inventoryService.createSupplier({
          name: supplierDraft.name.trim(),
          contact_name: supplierDraft.contact_name.trim() || undefined,
          phone: supplierDraft.phone.trim() || undefined,
          email: supplierDraft.email.trim() || undefined,
          address: supplierDraft.address.trim() || undefined,
          notes: supplierDraft.notes.trim() || undefined,
        })
        setSelectedSupplier(created.id)
        setSupplierMode('edit')
      } else if (selectedSupplier) {
        await inventoryService.updateSupplier(selectedSupplier, {
          name: supplierDraft.name.trim(),
          contact_name: supplierDraft.contact_name.trim() || undefined,
          phone: supplierDraft.phone.trim() || undefined,
          email: supplierDraft.email.trim() || undefined,
          address: supplierDraft.address.trim() || undefined,
          notes: supplierDraft.notes.trim() || undefined,
        })
      }
      await loadData(query, page, supplierFilter)
    } catch (e) {
      setSupplierError(e instanceof ApiError ? e.message : 'Could not save supplier')
    } finally {
      setSupplierSubmitting(false)
    }
  }

  async function onDeleteSupplier(supplierId: number) {
    if (!window.confirm('Delete this supplier? Inventory items will remain and lose their supplier link.')) return
    setSupplierError(null)
    try {
      await inventoryService.deleteSupplier(supplierId)
      if (supplierId === selectedSupplier) {
        setSelectedSupplier(null)
        setSupplierMode('create')
        setSupplierDraft({
          name: '',
          contact_name: '',
          phone: '',
          email: '',
          address: '',
          notes: '',
        })
      }
      await loadData(query, page, supplierFilter)
    } catch (e) {
      setSupplierError(e instanceof ApiError ? e.message : 'Could not delete supplier')
    }
  }

  const maxPage = Math.max(1, Math.ceil(itemCount / 25))
  const startRow = itemCount === 0 ? 0 : (page - 1) * 25 + 1
  const endRow = Math.min(page * 25, itemCount)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Inventory &amp; Supplies</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor stock levels, manage suppliers, and run full stock operations.</p>
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
          <div className="relative min-w-[260px] md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="pl-9"
              placeholder="Search inventory..."
            />
          </div>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-full md:w-56">
              <SelectValue placeholder="All suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suppliers</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-start">
          <AlertTriangle className="mt-0.5 size-5 text-destructive" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">Low Stock Alerts ({lowStock.length})</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {lowStock.length > 0
                ? `${lowStock.map((item) => item.name).join(', ')} are below their minimum thresholds.`
                : 'All tracked supplies are currently above their low-stock thresholds.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Current Stock Levels</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{itemCount} tracked items</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setItemMode('create')
                    setItemDraft({
                      name: '',
                      sku: '',
                      quantity: '0',
                      unit: 'unit',
                      low_stock_threshold: '0',
                      supplier: supplierFilter !== 'all' ? supplierFilter : '',
                    })
                  }}
                >
                  <Plus className="size-4" />
                  New Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="p-6 text-sm text-muted-foreground">Loading inventory…</p>
              ) : error ? (
                <p className="p-6 text-sm text-destructive">{error}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="pl-5">Item Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="p-6 text-center text-sm text-muted-foreground">
                          No inventory items matched the current search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleItems.map((item) => (
                        <TableRow key={item.id} className={selectedItem === String(item.id) ? 'bg-primary/5' : undefined}>
                          <TableCell className="pl-5 font-medium">{item.name}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.supplier_name || 'Unassigned'}</TableCell>
                          <TableCell className={item.is_low_stock ? 'font-semibold text-destructive' : 'font-medium'}>
                            {item.quantity}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            <Badge variant={item.is_low_stock ? 'destructive' : 'secondary'}>
                              {item.is_low_stock ? 'Low Stock' : 'In Stock'}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="link"
                                className="px-0"
                                onClick={() => {
                                  setSelectedItem(String(item.id))
                                  setItemMode('edit')
                                }}
                              >
                                Edit
                              </Button>
                              <Button type="button" variant="link" className="px-0 text-destructive" onClick={() => void onDeleteItem(item.id)}>
                                Delete
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
                  Showing {startRow}-{endRow} of {itemCount} items
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
        </div>

        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Supplier Management</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSupplierMode('create')
                  setSelectedSupplier(null)
                  setSupplierDraft({
                    name: '',
                    contact_name: '',
                    phone: '',
                    email: '',
                    address: '',
                    notes: '',
                  })
                }}
              >
                <Truck className="size-4" />
                New Supplier
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {topSuppliers.length === 0 ? <p className="text-sm text-muted-foreground">No supplier records yet.</p> : null}
              {topSuppliers.map((supplier) => (
                <div key={supplier.id} className="rounded-lg border px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {supplier.itemCount} item{supplier.itemCount === 1 ? '' : 's'} supplied
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0"
                        onClick={() => {
                          setSelectedSupplier(supplier.id)
                          setSupplierMode('edit')
                        }}
                      >
                        Edit
                      </Button>
                      <Button type="button" variant="link" className="h-auto px-0 text-destructive" onClick={() => void onDeleteSupplier(supplier.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Weekly Usage</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{weeklyUsage.toFixed(0)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">stock units recorded this week</p>
                </div>
                <TrendingUp className="size-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{itemMode === 'create' ? 'Create Inventory Item' : 'Edit Inventory Item'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Item Name</p>
                <Input value={itemDraft.name} onChange={(e) => setItemDraft((current) => ({ ...current, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SKU</p>
                <Input value={itemDraft.sku} onChange={(e) => setItemDraft((current) => ({ ...current, sku: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantity</p>
                  <Input value={itemDraft.quantity} onChange={(e) => setItemDraft((current) => ({ ...current, quantity: e.target.value }))} type="number" min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit</p>
                  <Input value={itemDraft.unit} onChange={(e) => setItemDraft((current) => ({ ...current, unit: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Low Stock Threshold</p>
                  <Input
                    value={itemDraft.low_stock_threshold}
                    onChange={(e) => setItemDraft((current) => ({ ...current, low_stock_threshold: e.target.value }))}
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Supplier</p>
                  <Select value={itemDraft.supplier || 'none'} onValueChange={(value) => setItemDraft((current) => ({ ...current, supplier: value === 'none' ? '' : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={String(supplier.id)}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {itemError ? <p className="text-sm text-destructive">{itemError}</p> : null}
              <Button className="w-full" onClick={() => void onSaveItem()} disabled={itemSubmitting}>
                {itemSubmitting ? 'Saving…' : itemMode === 'create' ? 'Create Item' : 'Save Item'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{supplierMode === 'create' ? 'Create Supplier' : 'Edit Supplier'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Supplier Name</p>
                <Input value={supplierDraft.name} onChange={(e) => setSupplierDraft((current) => ({ ...current, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact Name</p>
                <Input value={supplierDraft.contact_name} onChange={(e) => setSupplierDraft((current) => ({ ...current, contact_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
                  <Input value={supplierDraft.phone} onChange={(e) => setSupplierDraft((current) => ({ ...current, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
                  <Input type="email" value={supplierDraft.email} onChange={(e) => setSupplierDraft((current) => ({ ...current, email: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address</p>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                  value={supplierDraft.address}
                  onChange={(e) => setSupplierDraft((current) => ({ ...current, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                  value={supplierDraft.notes}
                  onChange={(e) => setSupplierDraft((current) => ({ ...current, notes: e.target.value }))}
                />
              </div>
              {supplierError ? <p className="text-sm text-destructive">{supplierError}</p> : null}
              <Button className="w-full" onClick={() => void onSaveSupplier()} disabled={supplierSubmitting}>
                {supplierSubmitting ? 'Saving…' : supplierMode === 'create' ? 'Create Supplier' : 'Save Supplier'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stock Movement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Item</p>
                <Select value={selectedItem || 'none'} onValueChange={(value) => setSelectedItem(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select an item</SelectItem>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Movement Type</p>
                <Select value={movementType} onValueChange={(value) => setMovementType(value as typeof movementType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Movement type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stock In</SelectItem>
                    <SelectItem value="out">Stock Out</SelectItem>
                    <SelectItem value="adjust">Adjust to Exact Quantity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {movementType === 'adjust' ? 'New Quantity' : 'Quantity'}
                </p>
                <Input value={movementQuantity} onChange={(e) => setMovementQuantity(e.target.value)} type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Note</p>
                <Input value={movementNote} onChange={(e) => setMovementNote(e.target.value)} placeholder="Optional movement note" />
              </div>
              {movementError ? <p className="text-sm text-destructive">{movementError}</p> : null}
              <Button className="w-full" onClick={() => void onSubmitMovement()} disabled={movementSubmitting || !selectedItem}>
                {movementSubmitting ? 'Saving…' : 'Record Stock Movement'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Movements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {movements.slice(0, 4).map((movement) => (
                <div key={movement.id} className="flex items-start gap-3 rounded-lg border px-3 py-3">
                  <Boxes className="mt-0.5 size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      {movement.item_name || 'Item'} · {movement.movement_type === 'out' ? 'Stock out' : movement.movement_type === 'in' ? 'Stock in' : 'Adjustment'} ·{' '}
                      {movement.quantity}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {movement.note || 'No note'} · {formatRelativeTime(movement.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {movements.length === 0 ? <p className="text-sm text-muted-foreground">No stock movements yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
