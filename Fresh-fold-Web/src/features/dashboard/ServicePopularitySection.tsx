import { motion } from 'framer-motion'

import type { ServicePopularityRow } from '@/api/types'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function normalize(rows: ServicePopularityRow[]): Array<ServicePopularityRow & { pct: number }> {
  const total = rows.reduce((s, r) => s + r.line_count, 0) || 1
  return rows.map((r) => ({ ...r, pct: Math.round((r.line_count / total) * 100) }))
}

const barColors = ['bg-primary', 'bg-slate-400', 'bg-slate-300', 'bg-indigo-400', 'bg-teal-400']

export function ServicePopularitySection({ rows }: { rows: ServicePopularityRow[] }) {
  const data = normalize(rows).slice(0, 5)

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Service Popularity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No order lines yet.</p>
        ) : (
          data.map((row, i) => (
            <motion.div
              key={row.service_type__code}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="mb-1 flex justify-between text-xs font-medium">
                <span>{row.service_type__name}</span>
                <span className="font-semibold">{row.pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${barColors[i % barColors.length]}`}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
