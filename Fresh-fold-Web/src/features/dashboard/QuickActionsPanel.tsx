import { motion } from 'framer-motion'
import { CirclePlus, FileText, Route, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const actions = [
  { label: 'New Order', icon: CirclePlus, to: '/orders/new' },
  { label: 'Register Customer', icon: UserPlus, to: '/customers' },
  { label: 'Create Invoice', icon: FileText, to: '/orders' },
  { label: 'Assign Route', icon: Route, to: '/orders' },
] as const

export function QuickActionsPanel() {
  const navigate = useNavigate()

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a, i) => (
            <motion.button
              key={a.label}
              type="button"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.04 * i }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(a.to)}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4 text-center text-xs font-semibold shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <a.icon className="size-5 text-primary" />
              {a.label}
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
