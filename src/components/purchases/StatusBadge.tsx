import { CheckCircle2, Clock3, ShieldAlert, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { OrderStatus } from '../../services/types'

interface StatusBadgeProps {
  status: OrderStatus
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pedido criado',
  processing: 'Em preparação',
  payment_review: 'Pagamento em análise',
  delivery: 'Aguardando entrega',
  completed: 'Concluído',
  dispute: 'Em atendimento',
  cancelled: 'Cancelado',
}

const statusStyles: Record<OrderStatus, string> = {
  pending: 'border-sky-400/18 bg-sky-500/12 text-sky-300',
  processing: 'border-blue-400/18 bg-blue-500/12 text-blue-300',
  payment_review: 'border-amber-400/18 bg-amber-500/12 text-amber-300',
  delivery: 'border-sky-400/18 bg-sky-500/12 text-sky-300',
  completed: 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300',
  dispute: 'border-amber-400/18 bg-amber-500/12 text-amber-300',
  cancelled: 'border-rose-400/18 bg-rose-500/12 text-rose-300',
}

const statusIcons = {
  pending: Clock3,
  processing: Clock3,
  payment_review: ShieldAlert,
  delivery: Clock3,
  completed: CheckCircle2,
  dispute: ShieldAlert,
  cancelled: XCircle,
} as const

export function StatusBadge({ status }: StatusBadgeProps) {
  const Icon = statusIcons[status]

  return (
    <span className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold', statusStyles[status])}>
      <Icon aria-hidden="true" className="size-3.5" />
      {statusLabels[status]}
    </span>
  )
}
