import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'

import type { SalesReportResponse } from '@/api/types'
import { formatCurrency } from '@/lib/formatters'

type Point = { label: string; revenue: number; orders: number }

function toChartData(sales: SalesReportResponse): Point[] {
  return sales.series
    .filter((row) => row.day)
    .map((row) => ({
      label: new Date(row.day as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      revenue: Number.parseFloat(row.revenue ?? '0') || 0,
      orders: row.count,
    }))
}

export function RevenueTrendChart({ sales }: { sales: SalesReportResponse }) {
  const data = toChartData(sales)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="h-72 w-full"
    >
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No invoice data in this range yet. Create invoices to see revenue trends.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} className="text-xs text-muted-foreground" />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
              }}
              formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
            />
            <Bar
              dataKey="revenue"
              radius={[6, 6, 0, 0]}
              fill="hsl(211 100% 37%)"
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}
