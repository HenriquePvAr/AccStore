import { BarChart3, ClipboardList, Compass, FileSearch, FileText, Headphones, Home, Store, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import type { UserRole } from '../auth/types'
import type { AppView } from '../lib/navigation'
import { cn } from '../lib/utils'

interface BottomNavItem {
  label: string
  view: AppView
  icon: LucideIcon
}

const publicBottomItems: BottomNavItem[] = [
  { label: 'Início', view: 'home', icon: Home },
  { label: 'Explorar', view: 'explore', icon: Compass },
  { label: 'Entrar', view: 'profile', icon: UserRound },
]

const roleBottomItems: Record<UserRole, BottomNavItem[]> = {
  customer: [
  { label: 'Início', view: 'home', icon: Home },
  { label: 'Explorar', view: 'explore', icon: Compass },
  { label: 'Vender', view: 'sell', icon: Store },
  { label: 'Propostas', view: 'myProposals', icon: FileText },
  { label: 'Suporte', view: 'support', icon: Headphones },
  ],
  seller: [
    { label: 'Início', view: 'home', icon: Home },
    { label: 'Meus anúncios', view: 'sellerListings', icon: Compass },
    { label: 'Pedidos', view: 'orders', icon: ClipboardList },
    { label: 'Recebidas', view: 'receivedProposals', icon: FileSearch },
    { label: 'Suporte', view: 'support', icon: Headphones },
  ],
  admin: [
    { label: 'Dashboard', view: 'adminDashboard', icon: BarChart3 },
    { label: 'Anúncios', view: 'adminListings', icon: Store },
    { label: 'Propostas', view: 'adminProposals', icon: FileSearch },
    { label: 'Usuários', view: 'adminUsers', icon: UserRound },
    { label: 'Suporte', view: 'support', icon: Headphones },
  ],
}

interface BottomNavProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

export function BottomNav({ activeView, onNavigate }: BottomNavProps) {
  const { user } = useAuth()
  const bottomItems = user ? roleBottomItems[user.role] : publicBottomItems

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(120,140,255,0.18)] bg-[#070B16]/96 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {bottomItems.map((item) => {
          const active =
            activeView === item.view ||
            (activeView === 'details' && item.view === 'explore') ||
            (activeView === 'proposalAnalysis' && item.view === 'adminProposals') ||
            (activeView === 'receivedProposalDetails' && item.view === 'adminProposals') ||
            (activeView === 'receivedProposalDetails' && item.view === 'receivedProposals') ||
            ((activeView === 'supportNew' || activeView === 'supportDetails') && item.view === 'support') ||
            (['purchases', 'purchaseDetails', 'messages', 'sell', 'balance', 'settings'].includes(activeView) &&
              item.view === 'profile')

          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition',
                active ? 'text-[#60A5FA]' : 'text-slate-400 hover:bg-[#101827]/70 hover:text-white',
              )}
            >
              <item.icon aria-hidden="true" className={cn('size-5', active && 'fill-blue-500/15')} />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
