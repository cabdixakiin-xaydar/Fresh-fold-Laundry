import { Gift, Package, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError } from '@/api/client'
import * as customerService from '@/api/services/customerService'
import { listOrders } from '@/api/services/orderService'
import type { CustomerDetail, Order } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  received: 'bg-blue-50 text-blue-800',
  processing: 'bg-amber-50 text-amber-900',
  ready: 'bg-emerald-50 text-emerald-900',
  delivered: 'bg-slate-100 text-slate-800',
  cancelled: 'bg-red-50 text-red-800',
}

export function CustomerProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<CustomerDetail | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [me, myOrders] = await Promise.all([
          customerService.getMyCustomerProfile(),
          listOrders(),
        ])
        if (!cancelled) {
          setProfile(me)
          setOrders(myOrders)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load your profile')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (loading) {
    return <p className="text-[#414755]">Loading your account…</p>
  }

  if (error || !profile) {
    return <p className="text-red-600">{error ?? 'Profile not found'}</p>
  }

  const tier =
    profile.loyalty_points >= 100 ? 'Gold' : profile.loyalty_points >= 50 ? 'Silver' : 'Regular'

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#191c1e]">{profile.name}</h1>
        <p className="mt-1 text-[#414755]">{profile.email || user?.email}</p>
        {profile.phone ? <p className="text-sm text-[#414755]">{profile.phone}</p> : null}
        {profile.address ? (
          <p className="mt-3 text-sm text-[#414755]">
            <span className="font-medium text-[#191c1e]">Address: </span>
            {profile.address}
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Star className="size-5 text-[#0058bc]" />}
          label="Loyalty points"
          value={String(profile.loyalty_points)}
          hint={`${tier} member`}
        />
        <StatCard
          icon={<Package className="size-5 text-[#0058bc]" />}
          label="Total orders"
          value={String(orders.length)}
          hint="On your account"
        />
        <StatCard
          icon={<Gift className="size-5 text-[#0058bc]" />}
          label="Rewards tier"
          value={tier}
          hint="Based on points"
        />
      </div>

      <section className="rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#191c1e]">Your orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-[#414755]">No orders yet. Book a pickup from our website to get started.</p>
        ) : (
          <ul className="divide-y divide-[#e0e3e5]">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <Link to={`/orders/${order.id}`} className="font-semibold text-[#0058bc] hover:underline">
                    {order.order_number}
                  </Link>
                  <p className="text-sm text-[#414755]">
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                    {' · '}${order.total}
                  </p>
                  {order.special_instructions ? (
                    <p className="mt-1 text-xs text-[#414755]">{order.special_instructions}</p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold capitalize',
                    statusStyles[order.status] ?? 'bg-[#eceef0] text-[#414755]',
                  )}
                >
                  {order.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {profile.loyalty_transactions.length > 0 ? (
        <section className="rounded-xl border border-[#e0e3e5] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#191c1e]">Loyalty activity</h2>
          <ul className="space-y-2 text-sm">
            {profile.loyalty_transactions.slice(0, 8).map((tx) => (
              <li key={tx.id} className="flex justify-between gap-4 border-b border-[#eceef0] py-2 last:border-0">
                <span className="text-[#414755]">{tx.reason || 'Points adjustment'}</span>
                <span className={cn('font-semibold', tx.points_change >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                  {tx.points_change >= 0 ? '+' : ''}
                  {tx.points_change}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-[#e0e3e5] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#414755]">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-[#191c1e]">{value}</p>
      <p className="text-xs text-[#717786]">{hint}</p>
    </div>
  )
}
