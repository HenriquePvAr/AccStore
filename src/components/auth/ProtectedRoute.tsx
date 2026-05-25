import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import type { UserRole } from '../../auth/types'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { session, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-svh bg-[#070B16] p-8 text-slate-300">Carregando sua conta...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles?.length && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/acesso-negado" replace />
  }

  return children
}
