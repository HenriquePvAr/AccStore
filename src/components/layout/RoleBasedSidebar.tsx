import {
  BarChart3,
  ClipboardList,
  Compass,
  FileText,
  FileSearch,
  Headphones,
  Home,
  MessageCircle,
  ReceiptText,
  Settings,
  Store,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import type { UserRole } from '../../auth/types'
import type { AppView } from '../../lib/navigation'
import { cn } from '../../lib/utils'
import { RoleBadge } from '../auth/RoleBadge'

interface SidebarItem {
  label: string
  view: AppView
  icon: LucideIcon
}

const publicItems: SidebarItem[] = [
  { label: 'Início', view: 'home', icon: Home },
  { label: 'Explorar', view: 'explore', icon: Compass },
]

const roleItems: Record<UserRole, SidebarItem[]> = {
  customer: [
    { label: 'Início', view: 'home', icon: Home },
    { label: 'Explorar', view: 'explore', icon: Compass },
    { label: 'Minhas compras', view: 'purchases', icon: ReceiptText },
    { label: 'Mensagens', view: 'messages', icon: MessageCircle },
    { label: 'Vender conta', view: 'sell', icon: Store },
    { label: 'Minhas propostas', view: 'myProposals', icon: FileText },
    { label: 'Suporte', view: 'support', icon: Headphones },
    { label: 'Configurações', view: 'settings', icon: Settings },
  ],
  seller: [
    { label: 'Início', view: 'home', icon: Home },
    { label: 'Explorar', view: 'explore', icon: Compass },
    { label: 'Meus anúncios', view: 'sellerListings', icon: Store },
    { label: 'Pedidos', view: 'orders', icon: ClipboardList },
    { label: 'Propostas recebidas', view: 'receivedProposals', icon: FileSearch },
    { label: 'Mensagens', view: 'messages', icon: MessageCircle },
    { label: 'Suporte', view: 'support', icon: Headphones },
    { label: 'Configurações', view: 'settings', icon: Settings },
  ],
  admin: [
    { label: 'Painel admin', view: 'adminDashboard', icon: BarChart3 },
    { label: 'Usuários', view: 'adminUsers', icon: UsersRound },
    { label: 'Anúncios', view: 'adminListings', icon: Store },
    { label: 'Pedidos', view: 'orders', icon: ClipboardList },
    { label: 'Propostas recebidas', view: 'adminProposals', icon: FileSearch },
    { label: 'Mensagens', view: 'messages', icon: MessageCircle },
    { label: 'Suporte', view: 'support', icon: Headphones },
    { label: 'Configurações', view: 'settings', icon: Settings },
  ],
}

interface RoleBasedSidebarProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

export function RoleBasedSidebar({ activeView, onNavigate }: RoleBasedSidebarProps) {
  const { user } = useAuth()
  const items = user ? roleItems[user.role] : publicItems

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-svh w-[276px] flex-col border-r border-[rgba(120,140,255,0.18)] bg-[#070B16]/96 px-4 py-4 shadow-[16px_0_70px_rgba(0,0,0,0.34)] backdrop-blur-xl lg:flex">
      <button type="button" className="flex items-center gap-3 px-1 py-1" onClick={() => onNavigate('home')}>
        <img src="/assets/accstore/logo-icon.png" alt="ACC Story" className="h-9 w-9 rounded-lg object-cover" />
        <span className="text-[20px] font-black text-white">
          ACC<span className="bg-gradient-to-r from-[#38BDF8] via-[#1463FF] to-[#53FF8F] bg-clip-text text-transparent"> Story</span>
        </span>
      </button>

      <div className="my-4 h-px bg-gradient-to-r from-transparent via-[rgba(120,140,255,0.2)] to-transparent" />

      <nav className="space-y-1 overflow-y-auto pr-1">
        {items.map((item) => {
          const isActive =
            activeView === item.view ||
            (activeView === 'details' && item.view === 'explore') ||
            (activeView === 'purchaseDetails' && item.view === 'purchases') ||
            (activeView === 'proposalAnalysis' && item.view === 'adminProposals') ||
            (activeView === 'receivedProposalDetails' && item.view === 'adminProposals') ||
            (activeView === 'receivedProposalDetails' && item.view === 'receivedProposals') ||
            ((activeView === 'supportNew' || activeView === 'supportDetails') && item.view === 'support') ||
            (activeView === 'adminAcquisition' && item.view === 'adminAcquisition')

          return (
            <button
              key={`${user?.role ?? 'public'}-${item.view}`}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={cn(
                'flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 text-left text-[13px] font-semibold transition duration-200',
                isActive
                  ? 'border-[#1463FF]/45 bg-gradient-to-r from-[#1463FF]/42 to-[#38BDF8]/18 text-white shadow-[0_0_16px_rgba(20,99,255,0.12)]'
                  : 'border-transparent text-slate-400 hover:border-[rgba(120,140,255,0.16)] hover:bg-[#101827]/62 hover:text-white',
              )}
            >
              <item.icon aria-hidden="true" className={cn('size-[18px] shrink-0', isActive ? 'text-blue-200' : 'text-slate-500')} />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-[rgba(120,140,255,0.16)] pt-3">
        {user ? (
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition hover:bg-[#101827]/62"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-slate-100 to-slate-600 text-sm font-black text-[#070B16]">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-white">{user.name}</span>
              <RoleBadge role={user.role} compact />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="flex min-h-11 w-full items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-sm font-black text-blue-100 transition hover:border-blue-300/55"
          >
            Entrar
          </button>
        )}
      </div>
    </aside>
  )
}
