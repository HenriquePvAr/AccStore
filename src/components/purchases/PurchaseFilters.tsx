import { CalendarDays, ChevronDown, Search } from 'lucide-react'
import type { OrderStatus } from '../../services/types'

const purchaseStatusOptions: Array<{ value: 'Todos os status' | OrderStatus; label: string }> = [
  { value: 'Todos os status', label: 'Todos os status' },
  { value: 'pending', label: 'Pedido criado' },
  { value: 'processing', label: 'Em preparação' },
  { value: 'payment_review', label: 'Pagamento em análise' },
  { value: 'delivery', label: 'Aguardando entrega' },
  { value: 'completed', label: 'Concluído' },
  { value: 'dispute', label: 'Em atendimento' },
  { value: 'cancelled', label: 'Cancelado' },
]

interface PurchaseFiltersProps {
  search: string
  status: 'Todos os status' | OrderStatus
  period: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: 'Todos os status' | OrderStatus) => void
  onPeriodChange: (value: string) => void
  onClear: () => void
}

export function PurchaseFilters({
  search,
  status,
  period,
  onSearchChange,
  onStatusChange,
  onPeriodChange,
  onClear,
}: PurchaseFiltersProps) {
  return (
    <div className="rounded-2xl border border-[rgba(80,130,255,0.16)] bg-[#0B1222]/70 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.18)]">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.85fr_auto]">
        <label className="flex min-h-12 items-center rounded-lg border border-[rgba(80,130,255,0.18)] bg-[#070B16]/62 px-3 transition focus-within:border-[#1495FF]/55">
          <span className="sr-only">Buscar compra</span>
          <Search aria-hidden="true" className="mr-3 size-5 shrink-0 text-slate-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por conta ou pedido..."
            className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">Status</span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as 'Todos os status' | OrderStatus)}
            className="min-h-12 w-full appearance-none rounded-lg border border-[rgba(80,130,255,0.18)] bg-[#070B16]/62 px-4 pr-10 text-sm font-semibold text-slate-100 outline-none transition hover:border-[rgba(80,130,255,0.32)] focus:border-[#1495FF]/55"
          >
            {purchaseStatusOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#0B1222] text-white">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        </label>

        <label className="flex min-h-12 items-center rounded-lg border border-[rgba(80,130,255,0.18)] bg-[#070B16]/62 px-3 transition focus-within:border-[#1495FF]/55">
          <span className="sr-only">Período</span>
          <input
            value={period}
            onChange={(event) => onPeriodChange(event.target.value)}
            placeholder="Período"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500"
          />
          <CalendarDays aria-hidden="true" className="ml-3 size-4 shrink-0 text-slate-400" />
        </label>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(80,130,255,0.18)] bg-[#070B16]/40 px-5 text-sm font-bold text-slate-300 transition hover:border-[#1495FF]/50 hover:text-white"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  )
}
