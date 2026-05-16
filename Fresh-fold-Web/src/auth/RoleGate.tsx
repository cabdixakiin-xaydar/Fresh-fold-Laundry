import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { canAccessPath, homePathForRole } from '@/auth/roles'

export function RoleGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return null
  }

  if (!canAccessPath(user.role, location.pathname)) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return children
}
