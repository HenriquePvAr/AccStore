import { Eye, ShieldCheck } from 'lucide-react'
import { formatBRL } from '../lib/format'
import { cn } from '../lib/utils'
import type { Account } from '../services/types'
import { AccountArtwork } from './AccountArtwork'

interface AccountCardProps {
  account: Account
  layout?: 'grid' | 'list'
  onSelect: (account: Account) => void
}

const typeColor: Record<Account['category'], string> = {
  Básica: 'text-slate-300 border-slate-400/20 bg-slate-400/8',
  Intermediária: 'text-emerald-200 border-emerald-300/20 bg-emerald-300/8',
  Avançada: 'text-blue-200 border-blue-300/20 bg-blue-300/8',
  Premium: 'text-sky-200 border-sky-300/20 bg-sky-300/8',
  Rara: 'text-sky-200 border-sky-300/20 bg-sky-300/8',
  Completa: 'text-blue-200 border-blue-300/20 bg-blue-300/8',
}

export function AccountCard({ account, layout = 'grid', onSelect }: AccountCardProps) {
  const isExploreList = layout === 'list'
  const statusLabel = account.status === 'published' ? 'Disponível' : account.status

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(account)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onSelect(account)
        }
      }}
      className={cn(
        'group overflow-hidden rounded-lg border border-[rgba(136,166,255,0.16)] bg-[linear-gradient(145deg,rgba(16,24,39,0.96),rgba(7,11,22,0.92))] text-left shadow-[0_14px_44px_rgba(0,0,0,0.24)] outline-none transition duration-300 hover:-translate-y-1 hover:border-[#1495FF]/55 hover:shadow-[0_20px_60px_rgba(0,112,209,0.14)] focus:border-[#1495FF]/70',
        isExploreList && 'grid grid-cols-[116px_1fr] sm:block',
      )}
    >
      <div className={cn('relative', isExploreList && 'min-h-[164px] sm:min-h-0')}>
        <AccountArtwork account={account} className={cn('rounded-none border-0', isExploreList && 'h-full sm:h-auto')} />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/78 via-black/16 to-transparent p-3">
          <span className="acc-badge border-emerald-300/22 bg-emerald-400/[0.14] text-emerald-100">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            {statusLabel}
          </span>
          {account.gameName ? (
            <span className="max-w-[58%] truncate rounded-full border border-white/12 bg-black/42 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur">
              {account.gameName}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex h-full flex-col gap-3 p-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-black leading-tight text-white">{account.title}</h3>
          <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-[18px] text-slate-400">{account.publicDescription}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={cn('acc-badge', typeColor[account.category])}>{account.category}</span>
          {account.region ? <span className="acc-badge border-white/10 bg-white/[0.045] text-slate-300">{account.region}</span> : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[rgba(136,166,255,0.12)] pt-3">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-500">Preço</p>
            <p className="acc-money text-[19px] font-black tracking-tight text-white">{formatBRL(account.price)}</p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onSelect(account)
            }}
            className="acc-button-primary inline-flex min-h-9 shrink-0 items-center gap-2 px-3.5 text-xs font-black transition"
            title="Ver detalhes"
          >
            <Eye aria-hidden="true" className="size-4" />
            Ver detalhes
          </button>
        </div>
      </div>
    </article>
  )
}
