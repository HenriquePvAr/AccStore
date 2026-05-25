export type UserRole = 'customer' | 'seller' | 'admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  verified?: boolean
  createdAt: string
}

export const roleLabels: Record<UserRole, string> = {
  customer: 'Cliente',
  seller: 'Vendedor autorizado',
  admin: 'Administrador',
}

export const roleHomePath: Record<UserRole, string> = {
  customer: '/explorar',
  seller: '/meus-anuncios',
  admin: '/admin/propostas',
}
