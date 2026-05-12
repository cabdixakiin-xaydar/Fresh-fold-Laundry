import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Package, Truck } from 'lucide-react'

import type { InventoryItemRow, Order, TripRow } from '@/api/types'
import { formatRelativeTime } from '@/lib/formatters'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ActivityItem = {
  id: string
  icon: typeof Package
  tone: 'default' | 'danger' | 'muted'
  title: string
  time: string
  sortTime: number
}

export function ActivitySidebar({
  orders,
  lowStock,
  trips,
}: {
  orders: Order[]
  lowStock: InventoryItemRow[]
  trips: TripRow[]
}) {
  const items: ActivityItem[] = []

  orders.slice(0, 4).forEach((o) => {
    items.push({
      id: `o-${o.id}`,
      icon: CheckCircle2,
      tone: 'default',
      title: `${o.order_number} for ${o.customer_name} is ${o.status}.`,
      time: formatRelativeTime(o.updated_at),
      sortTime: new Date(o.updated_at).getTime(),
    })
  })

  lowStock.slice(0, 3).forEach((row) => {
    items.push({
      id: `s-${row.id}`,
      icon: AlertTriangle,
      tone: 'danger',
      title: `Low stock alert for ${row.name}.`,
      time: formatRelativeTime(row.updated_at),
      sortTime: new Date(row.updated_at).getTime(),
    })
  })

  trips.slice(0, 2).forEach((t) => {
    items.push({
      id: `t-${t.id}`,
      icon: Truck,
      tone: 'muted',
      title: `${t.trip_type === 'pickup' ? 'Pickup' : 'Delivery'} scheduled for ${t.order_number}.`,
      time: formatRelativeTime(t.scheduled_at),
      sortTime: new Date(t.scheduled_at).getTime(),
    })
  })

  const sorted = items.sort((a, b) => b.sortTime - a.sortTime).slice(0, 8)

  return (
    <Card className="flex h-full flex-col border-border/80">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <button type="button" className="text-xs font-semibold text-primary transition hover:underline">
          View All
        </button>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto pr-1">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          sorted.map((row, i) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className="flex gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0"
            >
              <div
                className={
                  row.tone === 'danger'
                    ? 'rounded-full bg-destructive/10 p-2 text-destructive'
                    : row.tone === 'muted'
                      ? 'rounded-full bg-muted p-2 text-muted-foreground'
                      : 'rounded-full bg-primary/10 p-2 text-primary'
                }
              >
                <row.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm leading-snug text-foreground">{row.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.time}</p>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
