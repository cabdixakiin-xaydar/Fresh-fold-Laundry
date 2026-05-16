import type { User } from '@/api/types'

export type AppRole = User['role']

const STAFF_ROLES: AppRole[] = ['admin', 'cashier', 'worker', 'driver']

export function isStaffRole(role: string): boolean {
  return STAFF_ROLES.includes(role as AppRole)
}

export function homePathForRole(role: string): string {
  switch (role) {
    case 'admin':
    case 'cashier':
      return '/dashboard'
    case 'worker':
    case 'driver':
      return '/orders'
    case 'customer':
      return '/profile'
    default:
      return '/dashboard'
  }
}

export type NavItem = {
  to: string
  label: string
}

export function navItemsForRole(role: string): NavItem[] {
  switch (role) {
    case 'admin':
      return [
        { to: '/dashboard', label: 'Executive Dashboard' },
        { to: '/reports', label: 'Reports & Analytics' },
        { to: '/orders', label: 'Order Hub' },
        { to: '/customers', label: 'Customer Directory' },
        { to: '/users', label: 'User Management' },
        { to: '/inventory', label: 'Inventory Tracker' },
        { to: '/billing', label: 'Billing & Invoices' },
      ]
    case 'cashier':
      return [
        { to: '/dashboard', label: 'Executive Dashboard' },
        { to: '/reports', label: 'Reports & Analytics' },
        { to: '/orders', label: 'Order Hub' },
        { to: '/customers', label: 'Customer Directory' },
        { to: '/billing', label: 'Billing & Invoices' },
      ]
    case 'worker':
      return [{ to: '/orders', label: 'Order Hub' }]
    case 'driver':
      return [{ to: '/orders', label: 'Delivery & Orders' }]
    default:
      return []
  }
}

export function canAccessPath(role: string, pathname: string): boolean {
  if (role === 'customer') {
    return pathname === '/profile' || pathname.startsWith('/orders/')
  }
  if (role === 'worker') {
    return (
      pathname === '/orders' ||
      pathname === '/orders/new' ||
      /^\/orders\/\d+$/.test(pathname)
    )
  }
  if (role === 'driver') {
    return pathname === '/orders' || /^\/orders\/\d+$/.test(pathname)
  }
  if (role === 'cashier') {
    return !pathname.startsWith('/inventory') && !pathname.startsWith('/users')
  }
  if (role === 'admin') {
    return true
  }
  return !pathname.startsWith('/reports') && !pathname.startsWith('/users')
}
