import { Eye, Search, UserPlus } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'

import { ApiError } from '@/api/client'
import * as userService from '@/api/services/userService'
import type { User, UserDetail } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatShortDate } from '@/lib/formatters'

type AccountFilter = 'all' | 'staff' | 'customer'
type PanelMode = 'list' | 'create' | 'detail'

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'worker', label: 'Worker' },
  { value: 'driver', label: 'Driver' },
  { value: 'customer', label: 'Customer' },
] as const

function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

function displayName(user: User): string {
  const full = `${user.first_name} ${user.last_name}`.trim()
  return full || user.username
}

const emptyCreate = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
  role: 'worker',
  is_active: true,
}

export function UsersPage() {
  const [rows, setRows] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [panel, setPanel] = useState<PanelMode>('list')
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createDraft, setCreateDraft] = useState(emptyCreate)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(queryInput.trim()), 250)
    return () => window.clearTimeout(t)
  }, [queryInput])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const list = await userService.listUsers({
          q: query || undefined,
          account_type: accountFilter === 'all' ? undefined : accountFilter,
          role: roleFilter === 'all' ? undefined : roleFilter,
          is_active:
            activeFilter === 'all' ? undefined : activeFilter === 'active',
        })
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof ApiError ? e.message : 'Failed to load users')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [query, accountFilter, roleFilter, activeFilter])

  async function openDetail(id: number) {
    setPanel('detail')
    setDetailLoading(true)
    setFormError(null)
    try {
      const data = await userService.getUser(id)
      setDetail(data)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Failed to load user')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function onCreateSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await userService.createUser({
        username: createDraft.username,
        email: createDraft.email,
        password: createDraft.password,
        first_name: createDraft.first_name,
        last_name: createDraft.last_name,
        phone: createDraft.phone,
        role: createDraft.role,
        is_active: createDraft.is_active,
      })
      setCreateDraft(emptyCreate)
      setPanel('list')
      const list = await userService.listUsers({
        q: query || undefined,
        account_type: accountFilter === 'all' ? undefined : accountFilter,
        role: roleFilter === 'all' ? undefined : roleFilter,
      })
      setRows(list)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not create user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Staff accounts and customer portal users — filter by role or account type.
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setPanel('create')
            setFormError(null)
            setCreateDraft(emptyCreate)
          }}
        >
          <UserPlus className="size-4" />
          Add New User
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader className="space-y-4">
            <CardTitle className="text-base">All users</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, email, username…"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                />
              </div>
              <Select value={accountFilter} onValueChange={(v) => setAccountFilter(v as AccountFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading users…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No users match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <p className="font-medium">{displayName(user)}</p>
                          <p className="text-xs text-muted-foreground">{user.email || user.username}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {user.account_type ?? (user.role === 'customer' ? 'customer' : 'staff')}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{roleLabel(user.role)}</TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'success' : 'secondary'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="gap-1"
                            onClick={() => void openDetail(user.id)}
                          >
                            <Eye className="size-3.5" />
                            View detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-base">
              {panel === 'create' ? 'New user' : panel === 'detail' ? 'User detail' : 'Select a user'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formError ? <p className="mb-3 text-sm text-destructive">{formError}</p> : null}

            {panel === 'list' ? (
              <p className="text-sm text-muted-foreground">
                Click <strong>View detail</strong> on a row, or use <strong>Add New User</strong> to create an account.
              </p>
            ) : null}

            {panel === 'create' ? (
              <form className="space-y-3" onSubmit={(e) => void onCreateSubmit(e)}>
                <Field label="Username" required>
                  <Input
                    value={createDraft.username}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, username: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Email" required>
                  <Input
                    type="email"
                    value={createDraft.email}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, email: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Password" required>
                  <Input
                    type="password"
                    value={createDraft.password}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, password: e.target.value }))}
                    minLength={8}
                    required
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="First name">
                    <Input
                      value={createDraft.first_name}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, first_name: e.target.value }))}
                    />
                  </Field>
                  <Field label="Last name">
                    <Input
                      value={createDraft.last_name}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, last_name: e.target.value }))}
                    />
                  </Field>
                </div>
                <Field label="Phone">
                  <Input
                    value={createDraft.phone}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, phone: e.target.value }))}
                  />
                </Field>
                <Field label="Role" required>
                  <Select
                    value={createDraft.role}
                    onValueChange={(v) => setCreateDraft((d) => ({ ...d, role: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createDraft.is_active}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, is_active: e.target.checked }))}
                  />
                  Active account
                </label>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Creating…' : 'Create user'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setPanel('list')}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}

            {panel === 'detail' ? (
              detailLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : detail ? (
                <UserDetailPanel detail={detail} onClose={() => setPanel('list')} />
              ) : (
                <p className="text-sm text-muted-foreground">User not found.</p>
              )
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function UserDetailPanel({ detail, onClose }: { detail: UserDetail; onClose: () => void }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-lg font-bold">{displayName(detail)}</p>
        <p className="text-muted-foreground">@{detail.username}</p>
      </div>
      <DetailRow label="Email" value={detail.email || '—'} />
      <DetailRow label="Phone" value={detail.phone || '—'} />
      <DetailRow label="Account type" value={detail.account_type ?? '—'} />
      <DetailRow label="Role" value={roleLabel(detail.role)} />
      <DetailRow label="Status" value={detail.is_active ? 'Active' : 'Inactive'} />
      <DetailRow label="Staff flag" value={detail.is_staff ? 'Yes' : 'No'} />
      <DetailRow label="Joined" value={formatShortDate(detail.date_joined)} />
      <DetailRow
        label="Last login"
        value={detail.last_login ? new Date(detail.last_login).toLocaleString() : 'Never'}
      />
      {detail.customer_id ? (
        <DetailRow label="Customer profile ID" value={`#${detail.customer_id}`} />
      ) : null}
      {detail.customer_profile ? (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="font-semibold">Linked customer profile</p>
          <DetailRow label="Name" value={detail.customer_profile.name} />
          <DetailRow label="Loyalty points" value={String(detail.customer_profile.loyalty_points)} />
          <DetailRow label="Address" value={detail.customer_profile.address || '—'} />
        </div>
      ) : null}
      <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
        Close
      </Button>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}
        {required ? ' *' : ''}
      </Label>
      {children}
    </div>
  )
}
