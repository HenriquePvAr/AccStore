import type { AppView } from '../lib/navigation'
import type { UserRole } from './types'

export interface RouteAccess {
  public?: boolean
  roles?: UserRole[]
  view: AppView
}

export const viewPathMap: Record<AppView, string> = {
  home: '/',
  explore: '/explorar',
  favorites: '/explorar',
  purchases: '/minhas-compras',
  purchaseDetails: '/minhas-compras',
  messages: '/mensagens',
  support: '/suporte',
  supportNew: '/suporte/novo',
  supportDetails: '/suporte',
  orders: '/pedidos',
  sell: '/vender-conta',
  myProposals: '/minhas-propostas',
  receivedProposals: '/propostas-recebidas',
  receivedProposalDetails: '/propostas-recebidas',
  sellerListings: '/meus-anuncios',
  adminDashboard: '/admin',
  adminListings: '/admin/anuncios',
  adminProposals: '/admin/propostas',
  adminAcquisition: '/admin/aquisicao',
  proposalAnalysis: '/admin/propostas/analise',
  adminUsers: '/admin/usuarios',
  adminSellers: '/admin/vendedores',
  adminPayments: '/admin/pagamentos',
  adminReports: '/admin/relatorios',
  balance: '/admin/pagamentos',
  settings: '/configuracoes',
  profile: '/perfil',
  terms: '/termos',
  details: '/detalhes',
}

export const routeAccess: Record<string, RouteAccess> = {
  '/': { public: true, view: 'home' },
  '/explorar': { public: true, view: 'explore' },
  '/login': { public: true, view: 'home' },
  '/cadastro': { public: true, view: 'home' },
  '/acesso-negado': { public: true, view: 'home' },
  '/termos': { public: true, view: 'terms' },
  '/detalhes': { public: true, view: 'details' },

  '/favoritos': { public: true, view: 'explore' },
  '/minhas-compras': { roles: ['customer', 'seller', 'admin'], view: 'purchases' },
  '/pedidos': { roles: ['seller', 'admin'], view: 'orders' },
  '/mensagens': { roles: ['customer', 'seller', 'admin'], view: 'messages' },
  '/suporte': { roles: ['customer', 'seller', 'admin'], view: 'support' },
  '/suporte/novo': { roles: ['customer'], view: 'supportNew' },
  '/vender-conta': { roles: ['customer', 'seller', 'admin'], view: 'sell' },
  '/minhas-propostas': { roles: ['customer', 'seller', 'admin'], view: 'myProposals' },
  '/propostas-recebidas': { roles: ['seller', 'admin'], view: 'receivedProposals' },
  '/saldo': { roles: ['admin'], view: 'adminPayments' },
  '/configuracoes': { roles: ['customer', 'seller', 'admin'], view: 'settings' },
  '/perfil': { roles: ['customer', 'seller', 'admin'], view: 'profile' },

  '/meus-anuncios': { roles: ['seller', 'admin'], view: 'sellerListings' },
  '/admin': { roles: ['admin'], view: 'adminDashboard' },
  '/admin/anuncios': { roles: ['admin'], view: 'adminListings' },
  '/admin/contas': { roles: ['admin'], view: 'adminListings' },
  '/admin/propostas': { roles: ['admin'], view: 'adminProposals' },
  '/admin/propostas/analise': { roles: ['admin'], view: 'proposalAnalysis' },
  '/admin/aquisicao': { roles: ['admin'], view: 'adminAcquisition' },
  '/admin/pedidos': { roles: ['admin'], view: 'orders' },
  '/admin/mensagens': { roles: ['admin'], view: 'messages' },
  '/admin/usuarios': { roles: ['admin'], view: 'adminUsers' },
  '/admin/vendedores': { roles: ['admin'], view: 'adminSellers' },
  '/admin/pagamentos': { roles: ['admin'], view: 'adminPayments' },
  '/admin/relatorios': { roles: ['admin'], view: 'adminReports' },
  '/admin/configuracoes': { roles: ['admin'], view: 'settings' },
}

export function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }

  return pathname
}

export function getRouteAccess(pathname: string) {
  const normalizedPath = normalizePath(pathname)

  if (normalizedPath.startsWith('/propostas-recebidas/')) {
    return { roles: ['seller', 'admin'], view: 'receivedProposalDetails' } satisfies RouteAccess
  }

  if (normalizedPath.startsWith('/minhas-compras/')) {
    return { roles: ['customer', 'seller', 'admin'], view: 'purchaseDetails' } satisfies RouteAccess
  }

  if (normalizedPath.startsWith('/suporte/') && normalizedPath !== '/suporte/novo') {
    return { roles: ['customer', 'seller', 'admin'], view: 'supportDetails' } satisfies RouteAccess
  }

  if (normalizedPath.startsWith('/admin/propostas/') && normalizedPath !== '/admin/propostas/analise') {
    return { roles: ['admin'], view: 'receivedProposalDetails' } satisfies RouteAccess
  }

  return routeAccess[normalizedPath] ?? routeAccess['/']
}

export function getPathForView(view: AppView, role?: UserRole) {
  if (view === 'adminProposals') {
    return '/admin/propostas'
  }

  if (view === 'proposalAnalysis') {
    return '/admin/propostas/analise'
  }

  if (view === 'receivedProposals' || view === 'receivedProposalDetails') {
    return '/propostas-recebidas'
  }

  if (view === 'support' || view === 'supportDetails') {
    return '/suporte'
  }

  if (view === 'settings' && role === 'admin') {
    return '/admin/configuracoes'
  }

  if ((view === 'orders' || view === 'messages') && role === 'admin') {
    return `/admin/${view === 'orders' ? 'pedidos' : 'mensagens'}`
  }

  return viewPathMap[view]
}
