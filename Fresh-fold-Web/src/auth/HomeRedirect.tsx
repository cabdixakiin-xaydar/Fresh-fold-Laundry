import { Navigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { homePathForRole } from '@/auth/roles'

export function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return null
  return <Navigate to={homePathForRole(user.role)} replace />
}
