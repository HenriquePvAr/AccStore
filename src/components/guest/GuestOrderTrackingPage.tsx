import { AlertCircle, Copy, QrCode, RefreshCcw, ShieldCheck, ShoppingBag } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatBRL, formatDateTime } from '../../lib/format'
import { cn } from '../../lib/utils'
import { getGuestOrderByToken } from '../../services/ordersService'
import { copyPixCode, createGuestAsaasPayment, type AsaasPaymentResult } from '../../services/paymentsService'
import type { DeliveryStatus, Order, OrderStatus, PaymentStatus } from '../../services/types'

interface GuestOrderTrackingPageProps {
  token: string | null
}

const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Pedido criado',
  processing: 'Em preparação',
  payment_review: 'Pagamento em análise',
  delivery: 'Aguardando entrega',
  completed: 'Entregue',
  dispute: 'Em atendimento',
  cancelled: 'Cancelado',
}

const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pagamento aprovado',
  analysis: 'Pagamento em análise',
  failed: 'Pagamento recusado',
  expired: 'Pagamento expirado',
  refunded: 'Reembolsado',
  cancelled: 'Pagamento cancelado',
}

const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  pending: 'Aguardando entrega',
  in_progress: 'Em preparação',
  delivered: 'Entregue',
  disputed: 'Em atendimento',
  cancelled: 'Cancelado',
}

export function GuestOrderTrackingPage({ token }: GuestOrderTrackingPageProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [payment, setPayment] = useState<AsaasPaymentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingPix, setGeneratingPix] = useState(false)
  const [copyNotice, setCopyNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadOrder = useCallback(async () => {
    if (!token) {
      setError('Link de acompanhamento inválido.')
      setLoading(false)
      return
    }

    setError(null)
    const nextOrder = await getGuestOrderByToken(token)
    setOrder(nextOrder)
    setPayment({
      orderId: nextOrder.id,
      paymentStatus: nextOrder.paymentStatus,
      paymentUrl: nextOrder.paymentUrl,
      pixQrCode: nextOrder.pixQrCode,
      pixCopyPaste: nextOrder.pixCopyPaste,
      expiresAt: nextOrder.expiresAt,
    })
  }, [token])

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        await loadOrder()
      } catch {
        if (active) {
          setError('Pedido não encontrado ou link expirado.')
          setOrder(null)
          setPayment(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [loadOrder])

  const refresh = async () => {
    setRefreshing(true)
    try {
      await loadOrder()
    } catch {
      setError('Não foi possível atualizar o pedido agora.')
    } finally {
      setRefreshing(false)
    }
  }

  const generatePix = async () => {
    if (!order?.guestToken) return

    setGeneratingPix(true)
    setError(null)

    try {
      const nextPayment = await createGuestAsaasPayment(order.id, order.guestToken)
      setPayment(nextPayment)
      await refresh()
    } catch {
      setError('Não foi possível gerar o Pix agora.')
    } finally {
      setGeneratingPix(false)
    }
  }

  if (loading) {
    return <TrackingState title="Carregando pedido..." />
  }

  if (error && !order) {
    return <TrackingState title="Não foi possível abrir este pedido" description={error} />
  }

  if (!order) {
    return <TrackingState title="Pedido não encontrado" description="Confira se o link está completo." />
  }

  const thumbnail = order.account?.coverMediaUrl || order.account?.media.find((item) => item.isCover)?.url || order.account?.media[0]?.url
  const hasPix = Boolean(payment?.pixQrCode || payment?.pixCopyPaste || payment?.paymentUrl)

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="acc-surface p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-200">
              <ShoppingBag aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">Acompanhar pedido</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Guarde este link para acompanhar seu pedido.</p>
            </div>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={refreshing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white transition hover:border-blue-400/40 disabled:opacity-60">
            <RefreshCcw aria-hidden="true" className="size-4" />
            {refreshing ? 'Atualizando...' : 'Atualizar status'}
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="acc-surface p-5">
          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
            {thumbnail ? (
              <img src={thumbnail} alt={order.account?.title ?? 'Conta comprada'} className="aspect-video w-full rounded-lg border border-white/10 object-cover md:aspect-square" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-white/10 bg-[#101827] md:aspect-square">
                <ShoppingBag aria-hidden="true" className="size-9 text-slate-600" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-300">Pedido {order.orderCode}</p>
              <h2 className="mt-2 text-2xl font-black text-white">{order.account?.title ?? 'Conta ACCSTORE'}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{order.account?.publicDescription}</p>
              <p className="mt-4 text-3xl font-black text-white">{formatBRL(order.amount)}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">Criado em {formatDateTime(order.createdAt)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatusCard label="Pedido" value={orderStatusLabels[order.status]} tone={statusTone(order.status)} />
            <StatusCard label="Pagamento" value={paymentStatusLabels[order.paymentStatus]} tone={paymentTone(order.paymentStatus)} />
            <StatusCard label="Entrega" value={deliveryStatusLabels[order.deliveryStatus]} tone={deliveryTone(order.deliveryStatus)} />
          </div>

          {order.paymentStatus !== 'paid' ? (
            <p className="mt-5 rounded-lg border border-amber-400/18 bg-amber-500/10 p-3 text-sm font-bold text-amber-100">Aguardando pagamento para seguir com a entrega.</p>
          ) : (
            <p className="mt-5 rounded-lg border border-emerald-400/18 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">Pagamento aprovado. A equipe segue com a entrega.</p>
          )}
        </section>

        <aside className="space-y-4">
          {hasPix && payment ? (
            <PixPanel
              payment={payment}
              copyNotice={copyNotice}
              onCopyPix={async () => {
                if (!payment.pixCopyPaste) return
                await copyPixCode(payment.pixCopyPaste)
                setCopyNotice('Código Pix copiado.')
              }}
            />
          ) : (
            <section className="acc-safe-panel p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck aria-hidden="true" className="mt-1 size-6 text-emerald-300" />
                <div>
                  <h2 className="text-lg font-black text-white">Pagamento Pix</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">Gere o Pix para concluir seu pedido.</p>
                </div>
              </div>
              <button type="button" onClick={() => void generatePix()} disabled={generatingPix} className="acc-button-primary mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 text-sm font-black transition disabled:opacity-60">
                <QrCode aria-hidden="true" className="size-4" />
                {generatingPix ? 'Gerando...' : 'Gerar Pix'}
              </button>
            </section>
          )}

          <section className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-5">
            <div className="flex gap-3">
              <AlertCircle aria-hidden="true" className="mt-1 size-5 shrink-0 text-blue-300" />
              <p className="text-sm leading-6 text-slate-300">Os dados de acesso da conta só ficam disponíveis após liberação pela equipe.</p>
            </div>
          </section>
        </aside>
      </div>

      <Link to="/explorar" className="inline-flex text-sm font-black text-blue-300 transition hover:text-white">
        Voltar para explorar
      </Link>
    </section>
  )
}

function PixPanel({ payment, copyNotice, onCopyPix }: { payment: AsaasPaymentResult; copyNotice: string | null; onCopyPix: () => Promise<void> }) {
  const qrCodeSrc = payment.pixQrCode ? (payment.pixQrCode.startsWith('data:image') ? payment.pixQrCode : `data:image/png;base64,${payment.pixQrCode}`) : undefined

  return (
    <section className="acc-safe-panel p-5">
      <div className="flex items-center gap-3">
        <ShieldCheck aria-hidden="true" className="size-6 text-emerald-300" />
        <h2 className="text-lg font-black text-white">Pagamento Pix</h2>
      </div>

      {qrCodeSrc ? (
        <div className="mt-4 rounded-lg border border-emerald-200/30 bg-white p-3">
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-700">
            <QrCode aria-hidden="true" className="size-4" />
            QR Code Pix
          </div>
          <img src={qrCodeSrc} alt="QR Code Pix" className="mx-auto size-48 object-contain" />
        </div>
      ) : null}

      {payment.pixCopyPaste ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Pix copia e cola</p>
          <p className="mt-2 max-h-24 overflow-y-auto rounded-lg border border-white/10 bg-[#070B16] p-3 text-xs leading-5 text-slate-300">{payment.pixCopyPaste}</p>
          <button type="button" onClick={() => void onCopyPix()} className="acc-button-primary mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 text-sm font-black transition">
            <Copy aria-hidden="true" className="size-4" />
            Copiar código Pix
          </button>
          {copyNotice ? <p className="mt-2 text-sm font-bold text-emerald-300">{copyNotice}</p> : null}
        </div>
      ) : null}

      {payment.paymentUrl ? (
        <a href={payment.paymentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#1463FF] px-4 text-sm font-black text-white transition hover:bg-[#1D74FF]">
          Abrir pagamento
        </a>
      ) : null}
    </section>
  )
}

function StatusCard({ label, value, tone }: { label: string; value: string; tone: 'info' | 'success' | 'warning' | 'danger' }) {
  return (
    <div className="rounded-lg border border-[rgba(120,140,255,0.12)] bg-[#070B16]/38 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={cn(
          'mt-1 text-sm font-black',
          tone === 'info' && 'text-blue-200',
          tone === 'success' && 'text-emerald-200',
          tone === 'warning' && 'text-amber-200',
          tone === 'danger' && 'text-rose-200',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function TrackingState({ title, description }: { title: string; description?: string }) {
  return (
    <section className="mx-auto flex min-h-72 max-w-3xl flex-col items-center justify-center rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-8 text-center">
      <ShoppingBag aria-hidden="true" className="mb-3 size-10 text-slate-600" />
      <h1 className="text-xl font-black text-white">{title}</h1>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p> : null}
    </section>
  )
}

function statusTone(status: OrderStatus) {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'payment_review' || status === 'dispute') return 'warning'
  return 'info'
}

function paymentTone(status: PaymentStatus) {
  if (status === 'paid') return 'success'
  if (status === 'failed' || status === 'expired' || status === 'cancelled') return 'danger'
  if (status === 'pending' || status === 'analysis') return 'warning'
  return 'info'
}

function deliveryTone(status: DeliveryStatus) {
  if (status === 'delivered') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'pending' || status === 'in_progress') return 'warning'
  return 'info'
}
