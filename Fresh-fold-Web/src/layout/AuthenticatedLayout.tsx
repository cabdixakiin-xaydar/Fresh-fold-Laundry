import { useAuth } from '@/auth/AuthContext'
import { AppShell } from '@/layout/AppShell'
import { CustomerShell } from '@/layout/CustomerShell'

export function AuthenticatedLayout() {
  const { user } = useAuth()
  if (user?.role === 'customer') {
    return <CustomerShell />
  }
  return <AppShell />
}
