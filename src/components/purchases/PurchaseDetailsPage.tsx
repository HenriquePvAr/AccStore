import { ArrowLeft, CalendarDays, Copy, CreditCard, Headphones, MessageCircle, PackageCheck, QrCode, ReceiptText, ShieldCheck, Store } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatBRL, formatDateTime } from '../../lib/format'
import { cn } from '../../lib/utils'
import { startOrderConversation } from '../../services/messagesService'
import { getOrderById } from '../../services/ordersService'
import { copyPixCode, createAsaasPayment } from '../../services/paymentsService'
import { getOpenSupportTicketForOrder } from '../../services/supportService'
import type { DeliveryStatus, Order, PaymentStatus } from '../../services/types'
import { StatusBadge } from './StatusBadge'

interface PurchaseDetailsPageProps {
  orderId: string | null
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

export function PurchaseDetailsPage({ orderId }: PurchaseDetailsPageProps) {
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conversationLoading, setConversationLoading] = useState(false)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportError, setSupportError] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [copyNotice, setCopyNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadOrder() {
      if (!orderId) {
        setError('Compra não encontrada.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await getOrderById(orderId)
        if (active) {
          setOrder(data)
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar os detalhes desta compra.')
          setOrder(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadOrder()

    return () => {
      active = false
    }
  }, [orderId])

  const openConversation = async () => {
    if (!order) return

    setConversationLoading(true)
    setConversationError(null)

    try {
      const conversation = await startOrderConversation(order.id)
      navigate(`/mensagens?conversationId=${conversation.id}`)
    } catch {
      setConversationError('Não foi possível iniciar a conversa agora.')
    } finally {
      setConversationLoading(false)
    }
  }

  const openSupport = async () => {
    if (!order) return

    setSupportLoading(true)
    setSupportError(null)

    try {
      const ticket = await getOpenSupportTicketForOrder(order.id)
      navigate(ticket ? `/suporte/${ticket.id}` : `/suporte/novo?orderId=${order.id}`)
    } catch {
      setSupportError('Não foi possível abrir o suporte desta compra agora.')
    } finally {
      setSupportLoading(false)
    }
  }

  const refreshOrder = async () => {
    if (!order) return
    const updated = await getOrderById(order.id)
    setOrder(updated)
  }

  const generatePayment = async () => {
    if (!order) return

    setPaymentLoading(true)
    setPaymentError(null)
    setPaymentNotice(null)

    try {
      const payment = await createAsaasPayment(order.id)
      setOrder((current) =>
        current
          ? {
              ...current,
              paymentStatus: payment.paymentStatus,
              paymentUrl: payment.paymentUrl,
              pixQrCode: payment.pixQrCode,
              pixCopyPaste: payment.pixCopyPaste,
              expiresAt: payment.expiresAt,
            }
          : current,
      )
      await refreshOrder().catch(() => undefined)
      setPaymentNotice('Pagamento gerado. A confirmação é automática após o pagamento.')
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : 'Não foi possível gerar o pagamento agora.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const copyPix = async () => {
    if (!order?.pixCopyPaste) return
    await copyPixCode(order.pixCopyPaste)
    setCopyNotice('Código Pix copiado.')
  }

  if (loading) {
    return <State title="Carregando detalhes da compra..." />
  }

  if (error || !order) {
    return (
      <State
        title="Compra não encontrada"
        description={error ?? 'Volte para suas compras e tente novamente.'}
        actionLabel="Voltar para minhas compras"
        onAction={() => navigate('/minhas-compras')}
      />
    )
  }

  const account = order.account
  const thumbnail = account?.coverMediaUrl || account?.media.find((item) => item.isCover)?.url || account?.media[0]?.url
  const sellerName = order.seller?.fullName || account?.seller?.fullName || 'ACCSTORE'

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <div className="rounded-2xl border border-[rgba(80,130,255,0.16)] bg-[linear-gradient(135deg,rgba(11,18,34,0.96),rgba(7,11,22,0.9))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
        <button
          type="button"
          onClick={() => navigate('/minhas-compras')}
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-slate-200 transition hover:border-[#1463FF]/50 hover:bg-[#101827]/70 hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para minhas compras
        </button>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-blue-300">Detalhes da compra</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{order.orderCode}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Acompanhe o pagamento, entrega e atendimento desta compra.
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <InfoSection title="Resumo do pedido" icon={ReceiptText}>
            <InfoGrid>
              <InfoItem label="Pedido" value={order.orderCode} />
              <InfoItem label="Valor" value={formatBRL(order.amount)} />
              <InfoItem label="Data da compra" value={formatDateTime(order.createdAt)} />
              <InfoItem label="Vendedor" value={sellerName} />
            </InfoGrid>
          </InfoSection>

          <InfoSection title="Conta comprada" icon={Store}>
            <div className="flex gap-4">
              {thumbnail ? (
                <img src={thumbnail} alt={`Imagem da ${account?.title ?? 'conta comprada'}`} className="h-24 w-32 shrink-0 rounded-lg border border-white/10 object-cover" />
              ) : (
                <div className="h-24 w-32 shrink-0 rounded-lg border border-white/10 bg-[#101827]" />
              )}
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-white">{account?.title ?? 'Conta comprada'}</h2>
                {account?.publicDescription ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{account.publicDescription}</p> : null}
              </div>
            </div>
          </InfoSection>

          <InfoSection title="Pagamento" icon={CreditCard}>
            <div className="space-y-4">
              <MiniBadge label={paymentLabels[order.paymentStatus]} tone={order.paymentStatus === 'paid' ? 'success' : ['cancelled', 'failed', 'expired'].includes(order.paymentStatus) ? 'danger' : 'info'} />
              {paymentNotice ? <p className="rounded-lg border border-emerald-400/22 bg-emerald-500/12 p-3 text-sm font-bold text-emerald-100">{paymentNotice}</p> : null}
              {paymentError ? <p className="rounded-lg border border-rose-400/22 bg-rose-500/12 p-3 text-sm font-bold text-rose-100">{paymentError}</p> : null}
              {order.paymentStatus === 'pending' ? (
                <PaymentBox
                  order={order}
                  loading={paymentLoading}
                  copyNotice={copyNotice}
                  onGenerate={() => void generatePayment()}
                  onCopyPix={() => void copyPix()}
                  onRefresh={() => void refreshOrder()}
                />
              ) : null}
            </div>
          </InfoSection>

          <InfoSection title="Entrega" icon={PackageCheck}>
            <div className="space-y-3">
              <MiniBadge label={deliveryLabels[order.deliveryStatus]} tone={order.deliveryStatus === 'delivered' ? 'success' : order.deliveryStatus === 'cancelled' ? 'danger' : 'info'} />
              <p className="rounded-lg border border-blue-400/16 bg-blue-500/10 p-3 text-sm leading-6 text-blue-100">
                Os dados da conta serão liberados após confirmação do pagamento e validação da equipe.
              </p>
            </div>
          </InfoSection>
        </div>

        <aside className="space-y-5">
          <InfoSection title="Suporte" icon={Headphones}>
            <p className="text-sm leading-6 text-slate-400">
              Use a conversa vinculada ao pedido para falar com o vendedor ou com a equipe da ACCSTORE.
            </p>
            {conversationError ? <p className="mt-3 rounded-lg border border-rose-400/22 bg-rose-500/12 p-3 text-sm font-bold text-rose-100">{conversationError}</p> : null}
            {supportError ? <p className="mt-3 rounded-lg border border-rose-400/22 bg-rose-500/12 p-3 text-sm font-bold text-rose-100">{supportError}</p> : null}
            <button
              type="button"
              onClick={() => void openConversation()}
              disabled={conversationLoading}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1463FF] px-4 text-sm font-black text-white shadow-[0_0_18px_rgba(20,99,255,0.18)] transition hover:bg-[#1D74FF] disabled:opacity-60"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              {conversationLoading ? 'Abrindo conversa...' : 'Falar com vendedor'}
            </button>
            <button
              type="button"
              onClick={() => void openSupport()}
              disabled={supportLoading}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-400/28 bg-blue-500/10 px-4 text-sm font-black text-blue-100 transition hover:border-blue-300 disabled:opacity-60"
            >
              <Headphones aria-hidden="true" className="size-4" />
              {supportLoading ? 'Abrindo suporte...' : 'Solicitar suporte'}
            </button>
          </InfoSection>

          <InfoSection title="Segurança" icon={ShieldCheck}>
            <p className="text-sm leading-6 text-slate-400">
              Dados sensíveis da conta não são exibidos nesta tela. A entrega acontece apenas dentro do fluxo seguro da plataforma.
            </p>
          </InfoSection>
        </aside>
      </div>
    </section>
  )
}

function InfoSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="acc-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon aria-hidden="true" className="size-5 text-blue-300" />
        <h2 className="text-lg font-black text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function PaymentBox({
  order,
  loading,
  copyNotice,
  onGenerate,
  onCopyPix,
  onRefresh,
}: {
  order: Order
  loading: boolean
  copyNotice: string | null
  onGenerate: () => void
  onCopyPix: () => void
  onRefresh: () => void
}) {
  const qrCodeSrc = order.pixQrCode
    ? order.pixQrCode.startsWith('data:image')
      ? order.pixQrCode
      : `data:image/png;base64,${order.pixQrCode}`
    : undefined
  const hasPaymentData = Boolean(order.paymentUrl || order.pixQrCode || order.pixCopyPaste)

  if (!hasPaymentData) {
    return (
      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        className="acc-button-primary inline-flex min-h-11 w-full items-center justify-center px-4 text-sm font-black transition disabled:opacity-60"
      >
        {loading ? 'Gerando Pix...' : 'Gerar Pix'}
      </button>
    )
  }

  return (
    <div className="acc-safe-panel space-y-3 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-400/[0.12] text-emerald-200">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-sm font-black text-white">Pagamento seguro via Pix</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">A confirmação é automática após o pagamento.</p>
        </div>
      </div>

      {qrCodeSrc ? (
        <div className="rounded-lg border border-emerald-200/30 bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-700">
            <QrCode aria-hidden="true" className="size-4" />
            QR Code Pix
          </div>
          <img src={qrCodeSrc} alt="QR Code Pix" className="mx-auto size-48 object-contain" />
        </div>
      ) : null}

      {order.pixCopyPaste ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Pix copia e cola</p>
          <p className="mt-2 max-h-24 overflow-y-auto rounded-lg border border-white/10 bg-[#070B16] p-3 text-xs leading-5 text-slate-300">
            {order.pixCopyPaste}
          </p>
          <button
            type="button"
            onClick={onCopyPix}
            className="acc-button-primary mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 text-sm font-black transition"
          >
            <Copy aria-hidden="true" className="size-4" />
            Copiar código Pix
          </button>
          {copyNotice ? <p className="mt-2 text-sm font-bold text-emerald-300">{copyNotice}</p> : null}
        </div>
      ) : null}

      {order.paymentUrl ? (
        <a
          href={order.paymentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#1463FF] px-4 text-sm font-black text-white transition hover:bg-[#1D74FF]"
        >
          Abrir pagamento
        </a>
      ) : null}

      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-black text-slate-200 transition hover:border-blue-400/40 hover:text-white"
      >
        Atualizar status
      </button>
    </div>
  )
}

function InfoGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
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

function State({ title, description, actionLabel, onAction }: { title: string; description?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-[rgba(80,130,255,0.16)] bg-[#0B1222]/70 p-8 text-center">
      <CalendarDays aria-hidden="true" className="mb-4 size-10 text-slate-500" />
      <h2 className="text-xl font-black text-white">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1463FF] px-5 text-sm font-black text-white shadow-[0_0_18px_rgba(20,99,255,0.18)] transition hover:bg-[#1D74FF]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
