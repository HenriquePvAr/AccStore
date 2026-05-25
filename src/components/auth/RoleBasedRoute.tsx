import type { UserRole } from '../../auth/types'
import { ProtectedRoute } from './ProtectedRoute'
import type { ReactNode } from 'react'

interface RoleBasedRouteProps {
  allowedRoles: UserRole[]
  children: ReactNode
}

export function RoleBasedRoute({ allowedRoles, children }: RoleBasedRouteProps) {
  return <ProtectedRoute allowedRoles={allowedRoles}>{children}</ProtectedRoute>
}
