import { LogOut, Shirt } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CustomerShell() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      <header className="border-b border-[#e0e3e5] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-2 text-[#0058bc]">
            <Shirt className="size-7" />
            <span className="text-lg font-bold tracking-tight">Fresh-Fold</span>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive ? 'bg-[#0058bc] text-white' : 'text-[#414755] hover:bg-[#eceef0]',
                )
              }
            >
              My Account
            </NavLink>
            <Button variant="secondary" size="sm" type="button" onClick={() => void logout()}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <p className="mb-6 text-sm text-[#414755]">
          Signed in as <span className="font-semibold text-[#191c1e]">{user?.email || user?.username}</span>
        </p>
        <Outlet />
      </div>
    </div>
  )
}
