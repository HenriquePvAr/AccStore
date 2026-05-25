import {
  BriefcaseBusiness,
  ChevronRight,
  FileSearch,
  FileText,
  MessageCircle,
  ReceiptText,
  Settings,
  Store,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import type { UserRole } from '../auth/types'
import type { AppView } from '../lib/navigation'
import { RoleBadge } from './auth/RoleBadge'

interface ProfileMenuItem {
  label: string
  description: string
  view: AppView
  icon: LucideIcon
}

const profileItems: Record<UserRole, ProfileMenuItem[]> = {
  customer: [
    { label: 'Minhas compras', description: 'Acompanhe suas compras', view: 'purchases', icon: BriefcaseBusiness },
    { label: 'Mensagens', description: 'Conversas com vendedores', view: 'messages', icon: MessageCircle },
    { label: 'Vender conta', description: 'Enviar proposta privada para ACCSTORE', view: 'sell', icon: Store },
    { label: 'Minhas propostas', description: 'Acompanhe contas enviadas para análise', view: 'myProposals', icon: FileText },
    { label: 'Configurações', description: 'Conta, segurança e preferências', view: 'settings', icon: Settings },
  ],
  seller: [
    { label: 'Meus anúncios', description: 'Gerencie anúncios publicados', view: 'sellerListings', icon: Store },
    { label: 'Pedidos', description: 'Pedidos relacionados aos seus anúncios', view: 'orders', icon: BriefcaseBusiness },
    { label: 'Propostas recebidas', description: 'Contas enviadas por clientes para análise', view: 'receivedProposals', icon: FileSearch },
    { label: 'Mensagens', description: 'Responda clientes interessados', view: 'messages', icon: MessageCircle },
    { label: 'Configurações', description: 'Conta, segurança e preferências', view: 'settings', icon: Settings },
  ],
  admin: [
    { label: 'Painel admin', description: 'Visão geral da operação', view: 'adminDashboard', icon: BriefcaseBusiness },
    { label: 'Propostas recebidas', description: 'Contas enviadas por clientes para análise', view: 'adminProposals', icon: FileSearch },
    { label: 'Usuários', description: 'Gerenciar usuários da plataforma', view: 'adminUsers', icon: UserRound },
    { label: 'Anúncios', description: 'Gerenciar contas publicadas', view: 'adminListings', icon: Store },
    { label: 'Pedidos', description: 'Acompanhar pedidos da plataforma', view: 'orders', icon: BriefcaseBusiness },
    { label: 'Mensagens', description: 'Conversas com clientes e vendedores', view: 'messages', icon: MessageCircle },
    { label: 'Configurações', description: 'Configurar plataforma', view: 'settings', icon: Settings },
  ],
}

interface ProfileMenuProps {
  onNavigate: (view: AppView) => void
}

export function ProfileMenu({ onNavigate }: ProfileMenuProps) {
  const { user } = useAuth()

  if (!user) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/92 p-6 text-center">
        <UserRound aria-hidden="true" className="mx-auto mb-4 size-10 text-slate-500" />
        <h1 className="text-2xl font-black text-white">Entre para acessar seu perfil</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Entre para ver suas compras, propostas e configurações.</p>
      </section>
    )
  }

  const items = profileItems[user.role]

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/92 p-5">
        <div className="flex items-center gap-4">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-slate-100 to-slate-600 text-[#060914]">
            <UserRound aria-hidden="true" className="size-10" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-white">{user.name}</h1>
            <p className="text-sm font-semibold text-blue-300">{user.verified ? 'Perfil verificado' : 'Perfil ativo'}</p>
            <span className="mt-3 block">
              <RoleBadge role={user.role} />
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/92">
        {items.map((item) => (
          <button
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
            className="flex min-h-20 w-full items-center justify-between gap-4 border-b border-white/10 px-5 text-left transition last:border-b-0 hover:bg-white/[0.05]"
          >
            <span className="flex items-center gap-4">
              <span className="flex size-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-100">
                <item.icon aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block font-bold text-white">{item.label}</span>
                <span className="mt-1 block text-sm text-slate-400">{item.description}</span>
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 text-slate-500" />
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/92 p-5">
        <div className="flex items-start gap-3">
          <ReceiptText aria-hidden="true" className="mt-0.5 size-5 text-sky-300" />
          <p className="text-sm leading-6 text-slate-300">
            Compras, pedidos e mensagens ficam centralizados para reduzir contato fora da plataforma.
          </p>
        </div>
      </div>
    </section>
  )
}
