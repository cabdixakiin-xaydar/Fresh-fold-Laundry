import {
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Receipt,
  Settings,
  Shirt,
  Truck,
  Users,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
  { to: '/orders', label: 'Order Hub', icon: Package },
  { to: '/customers', label: 'Customer Directory', icon: Users },
  { to: '/inventory', label: 'Inventory Tracker', icon: Truck },
  { to: '/billing', label: 'Billing & Invoices', icon: Receipt },
] as const

export function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card px-3 py-4 shadow-sm md:flex">
        <div className="flex items-center gap-2 px-2 pb-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shirt className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">Fresh-Fold</p>
            <p className="text-xs text-muted-foreground">Laundry management</p>
          </div>
        </div>

        <Button className="mb-4 w-full rounded-lg shadow-sm" asChild>
          <NavLink to="/orders/new" className="gap-2">
            <Plus className="size-4" />
            Create New Order
          </NavLink>
        </Button>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t pt-3">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" type="button" disabled>
            <Settings className="size-4" />
            Settings
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" type="button" disabled>
            <CircleHelp className="size-4" />
            Support
          </Button>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            <p className="font-semibold">{user?.username}</p>
            <p className="text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <Button variant="secondary" className="w-full" type="button" onClick={() => void logout()}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
