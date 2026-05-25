import { MessageCircle, ShoppingCart, Store } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import type { AppView } from '../lib/navigation'
import { cn } from '../lib/utils'
import { UserMenu } from './auth/UserMenu'

interface TopbarProps {
  activeView: AppView
  cartCount: number
  onNavigate: (view: AppView) => void
  onSection: (sectionId: string) => void
}

const links = [
  { label: 'Explorar', action: 'explore' },
] as const

export function Topbar({ activeView, cartCount, onNavigate, onSection }: TopbarProps) {
  const { user } = useAuth()
  const sellActionView: AppView = user?.role === 'admin' ? 'adminListings' : user?.role === 'seller' ? 'sellerListings' : 'sell'
  const sellActionLabel = user?.role === 'admin' ? 'Anúncios' : user?.role === 'seller' ? 'Meus anúncios' : 'Vender conta'
  const cartActionView: AppView = user?.role === 'customer' ? 'purchases' : 'orders'

  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(120,140,255,0.16)] bg-[#070B16]/88 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-[1680px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-7">
        <button type="button" className="flex shrink-0 items-center" onClick={() => onNavigate('home')}>
          <img
            src="/assets/accstore/logo-icon.png"
            alt="ACCSTORE"
            className="h-8 w-8 rounded-md object-cover sm:hidden"
          />
          <img
            src="/assets/accstore/logo-horizontal.png"
            alt="ACCSTORE"
            className="hidden h-8 w-[158px] object-contain object-left mix-blend-screen sm:block lg:w-[178px]"
          />
        </button>

        <nav className="hidden h-full items-center gap-7 lg:flex">
          {links.map((link) => {
            const active = link.action === 'explore' && (activeView === 'explore' || activeView === 'details')
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => (link.action === 'explore' ? onNavigate('explore') : onSection(link.action))}
                className={cn(
                  'group relative h-full text-[13px] font-semibold text-slate-300 transition hover:text-white',
                  active && 'text-white',
                )}
              >
                {link.label}
                <span
                  className={cn(
                    'absolute bottom-0 left-0 h-0.5 rounded-full bg-gradient-to-r from-[#1463FF] to-[#38BDF8] transition-all duration-300 group-hover:w-full',
                    active ? 'w-full' : 'w-0',
                  )}
                />
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate(sellActionView)}
            className="hidden min-h-9 items-center gap-2 rounded-lg border border-[#38BDF8]/38 bg-[#101827]/30 px-3.5 text-[13px] font-semibold text-white transition hover:border-[#1463FF]/65 hover:bg-[#1463FF]/10 hover:shadow-[0_0_18px_rgba(20,99,255,0.16)] lg:inline-flex"
          >
            <Store aria-hidden="true" className="size-4" />
            {sellActionLabel}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('messages')}
            className="relative inline-flex size-9 items-center justify-center rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/35 text-slate-200 transition hover:border-[#1463FF]/60 hover:text-white"
            title="Mensagens"
          >
            <MessageCircle aria-hidden="true" className="size-[18px]" />
          </button>

          <UserMenu />

          <button
            type="button"
            onClick={() => onNavigate(cartActionView)}
            className="relative inline-flex size-9 items-center justify-center rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/35 text-slate-200 transition hover:border-[#1463FF]/60 hover:text-white"
            title="Carrinho"
          >
            <ShoppingCart aria-hidden="true" className="size-[18px]" />
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#1463FF] text-xs font-black text-white">
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  )
}
