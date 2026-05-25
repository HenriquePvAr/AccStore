import { FileText, MessageCircle } from 'lucide-react'
import { formatBRL, formatDateTime } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { DeliveryStatus, Order, PaymentStatus } from '../../services/types'
import { StatusBadge } from './StatusBadge'

interface PurchaseRowProps {
  purchase: Order
  conversationLoading: boolean
  onOpenDetails: (orderId: string) => void
  onStartConversation: (orderId: string) => void
}

const paymentLabels: Record<PaymentStatus, string> = {
  pending: 'Pagamento pendente',
  paid: 'Pagamento aprovado',
  analysis: 'Pagamento em análise',
  failed: 'Pagamento recusado',
  expired: 'Pagamento expirado',
  refunded: 'Reembolsado',
  cancelled: 'Pagamento cancelado',
}

const deliveryLabels: Record<DeliveryStatus, string> = {
  pending: 'Aguardando entrega',
  in_progress: 'Em preparação',
  delivered: 'Entregue',
  disputed: 'Em atendimento',
  cancelled: 'Cancelado',
}

export function PurchaseRow({ purchase, conversationLoading, onOpenDetails, onStartConversation }: PurchaseRowProps) {
  const account = purchase.account
  const thumbnail = account?.coverMediaUrl || account?.media.find((item) => item.isCover)?.url || account?.media[0]?.url
  const sellerName = purchase.seller?.fullName || account?.seller?.fullName || 'ACCSTORE'

  return (
    <article className="rounded-lg border border-[rgba(136,166,255,0.14)] bg-white/[0.025] p-4 transition hover:border-[rgba(20,149,255,0.38)] hover:bg-white/[0.045]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 gap-3">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`Imagem da ${account?.title ?? 'conta comprada'}`}
              className="h-20 w-24 shrink-0 rounded-lg border border-white/10 object-cover"
            />
          ) : (
            <div className="h-20 w-24 shrink-0 rounded-lg border border-white/10 bg-[#101827]" />
          )}

          <div className="min-w-0">
            <p className="truncate text-base font-black text-white">{account?.title ?? 'Conta comprada'}</p>
            <p className="mt-1 text-sm font-semibold text-slate-400">Vendedor: {sellerName}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Pedido {purchase.orderCode} · {formatDateTime(purchase.createdAt)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:min-w-72 lg:items-end">
          <p className="acc-money text-xl font-black text-emerald-300">{formatBRL(purchase.amount)}</p>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <StatusBadge status={purchase.status} />
            <MiniBadge label={paymentLabels[purchase.paymentStatus]} tone={purchase.paymentStatus === 'paid' ? 'success' : purchase.paymentStatus === 'cancelled' ? 'danger' : 'info'} />
            <MiniBadge label={deliveryLabels[purchase.deliveryStatus]} tone={purchase.deliveryStatus === 'delivered' ? 'success' : purchase.deliveryStatus === 'cancelled' ? 'danger' : 'info'} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-[rgba(80,130,255,0.12)] pt-4 sm:flex-row sm:justify-end">
        {purchase.paymentStatus === 'pending' && (purchase.paymentUrl || purchase.pixCopyPaste || purchase.pixQrCode) ? (
          <button
            type="button"
            onClick={() => onOpenDetails(purchase.id)}
            className="acc-button-commerce inline-flex min-h-10 items-center justify-center px-4 text-xs font-black transition"
          >
            Pagar agora
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onOpenDetails(purchase.id)}
          className="acc-button-secondary inline-flex min-h-10 items-center justify-center gap-2 px-4 text-xs font-black transition"
        >
          <FileText aria-hidden="true" className="size-4" />
          Ver detalhes
        </button>
        <button
          type="button"
          onClick={() => onStartConversation(purchase.id)}
          disabled={conversationLoading}
          className="acc-button-primary inline-flex min-h-10 items-center justify-center gap-2 px-4 text-xs font-black transition disabled:opacity-60"
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          {conversationLoading ? 'Abrindo...' : 'Falar com vendedor'}
        </button>
      </div>
    </article>
  )
}

function MiniBadge({ label, tone }: { label: string; tone: 'info' | 'success' | 'danger' }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center rounded-lg border px-2.5 text-xs font-bold',
        tone === 'success' && 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300',
        tone === 'danger' && 'border-rose-400/18 bg-rose-500/12 text-rose-300',
        tone === 'info' && 'border-sky-400/18 bg-sky-500/12 text-sky-300',
      )}
    >
      {label}
    </span>
  )
}
