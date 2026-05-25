import { BadgeCheck, ClipboardCheck, ClipboardList, Copy, ExternalLink, MessageCircle, RotateCcw, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { formatBRL, formatDateTime } from '../../lib/format'
import { cn } from '../../lib/utils'
import { formatWhatsAppDisplay, getWhatsAppUrl } from '../../lib/whatsapp'
import { getAllOrders, getSellerOrders, getUserOrders } from '../../services/ordersService'
import type { DeliveryStatus, Order, OrderStatus, PaymentStatus } from '../../services/types'

type OrderTab = 'Todos' | 'Em andamento' | 'Entregues' | 'Em análise' | 'Cancelados'

const orderTabs: OrderTab[] = ['Todos', 'Em andamento', 'Entregues', 'Em análise', 'Cancelados']

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pedido criado',
  processing: 'Em preparação',
  payment_review: 'Em análise',
  delivery: 'Aguardando entrega',
  completed: 'Concluído',
  dispute: 'Em atendimento',
  cancelled: 'Cancelado',
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

function tabForOrder(order: Order): Exclude<OrderTab, 'Todos'> {
  if (order.status === 'completed') return 'Entregues'
  if (order.status === 'cancelled') return 'Cancelados'
  if (order.status === 'payment_review' || order.status === 'dispute') return 'Em análise'
  return 'Em andamento'
}

export function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'Todos os status' | OrderStatus>('Todos os status')
  const [activeTab, setActiveTab] = useState<OrderTab>('Todos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadOrders() {
      if (!user) {
        setOrders([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data =
          user.role === 'admin'
            ? await getAllOrders()
            : user.role === 'seller'
              ? await getSellerOrders(user.id)
              : await getUserOrders(user.id)

        if (active) {
          setOrders(data)
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Erro ao carregar pedidos.')
          setOrders([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadOrders()

    return () => {
      active = false
    }
  }, [user])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        [
          order.orderCode,
          order.account?.title,
          order.seller?.fullName,
          order.buyer?.fullName,
          order.guestName,
          order.guestWhatsapp,
          order.guestEmail,
          paymentLabels[order.paymentStatus],
          deliveryLabels[order.deliveryStatus],
          statusLabels[order.status],
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
      const matchesStatus = status === 'Todos os status' || order.status === status
      const matchesTab = activeTab === 'Todos' || tabForOrder(order) === activeTab

      return matchesSearch && matchesStatus && matchesTab
    })
  }, [activeTab, orders, search, status])

  const clearFilters = () => {
    setSearch('')
    setStatus('Todos os status')
    setActiveTab('Todos')
  }

  return (
    <section className="space-y-4">
      <PageHeader />

      <section className="acc-surface p-4">
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(280px,1fr)_240px_auto]">
          <label className="flex min-h-11 items-center rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/64 px-3 transition focus-within:border-blue-400/55">
            <Search aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
            <span className="sr-only">Buscar pedidos</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por pedido, conta ou usuário..."
              className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as 'Todos os status' | OrderStatus)}
            className="min-h-11 rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#0B1222] px-4 text-sm font-semibold text-slate-200 outline-none transition focus:border-blue-400/55"
          >
            <option>Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/56 px-4 text-sm font-black text-white transition hover:border-blue-400/45 hover:bg-[#13213B]"
          >
            <RotateCcw aria-hidden="true" className="size-4 text-slate-300" />
            Limpar filtros
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {orderTabs.map((tab) => {
            const isActive = activeTab === tab
            const count = tab === 'Todos' ? orders.length : orders.filter((order) => tabForOrder(order) === tab).length
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-bold transition',
                  isActive
                    ? 'border-[#1463FF]/60 bg-[#1463FF]/14 text-blue-200 shadow-[0_0_18px_rgba(20,99,255,0.12)]'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-blue-400/35 hover:text-white',
                )}
              >
                {tab}
                <span className={cn('flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black', isActive ? 'bg-[#1463FF] text-white' : 'bg-[#101827] text-slate-300')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="acc-surface overflow-hidden">
        {loading ? <State title="Carregando pedidos..." /> : null}
        {error ? <State title="Erro ao carregar dados. Tente novamente." description={error} /> : null}
        {!loading && !error && filteredOrders.length === 0 ? <State title="Nenhum pedido encontrado" description="Ainda não há pedidos reais para este filtro." /> : null}

        {!loading && !error && filteredOrders.length > 0 ? (
          <div className="divide-y divide-[rgba(120,140,255,0.12)]">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : null}
      </section>
    </section>
  )
}

function PageHeader() {
  return (
    <div className="acc-surface p-5">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-200">
          <ClipboardList aria-hidden="true" className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Pedidos</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Acompanhe compras, entregas e conversas relacionadas aos seus pedidos.
          </p>
        </div>
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const thumbnail = order.account?.coverMediaUrl || order.account?.media.find((item) => item.isCover)?.url || order.account?.media[0]?.url
  const buyerName = order.isGuest ? order.guestName || 'Cliente sem cadastro' : order.buyer?.fullName || 'Cliente'
  const otherParty = order.seller?.fullName ? `${buyerName} / ${order.seller.fullName}` : buyerName
  const whatsappUrl = order.guestWhatsapp ? getWhatsAppUrl(order.guestWhatsapp) : null

  return (
    <article className="p-4 transition hover:bg-[#101827]/62">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {thumbnail ? (
            <img src={thumbnail} alt={`Thumbnail da ${order.account?.title ?? 'conta'}`} className="size-14 shrink-0 rounded-lg border border-white/10 object-cover" />
          ) : (
            <div className="size-14 shrink-0 rounded-lg border border-white/10 bg-[#101827]" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">{order.orderCode}</span>
              <button type="button" className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.06] hover:text-blue-200" title={`Copiar ${order.orderCode}`}>
                <Copy aria-hidden="true" className="size-3.5" />
              </button>
            </div>
            <h3 className="mt-1 text-base font-black text-white">{order.account?.title ?? 'Conta removida'}</h3>
            <p className="mt-1 text-sm font-medium text-slate-400">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        <p className="text-lg font-black text-white sm:text-right">{formatBRL(order.amount)}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[rgba(120,140,255,0.12)] bg-[#070B16]/38 p-3">
          <p className="text-xs font-black uppercase tracking-[0.04em] text-slate-500">Participantes</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-semibold text-slate-200">{otherParty}</span>
            <ShieldCheck aria-hidden="true" className="size-4 text-blue-300" />
          </div>
          {order.isGuest ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
              {order.guestWhatsapp ? <span>{formatWhatsAppDisplay(order.guestWhatsapp)}</span> : null}
              {order.guestEmail ? <span>{order.guestEmail}</span> : null}
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-emerald-400/24 bg-emerald-500/10 px-2.5 text-xs font-black text-emerald-100 transition hover:border-emerald-300"
                >
                  <MessageCircle aria-hidden="true" className="size-3.5" />
                  Chamar no WhatsApp
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-[rgba(120,140,255,0.12)] bg-[#070B16]/38 p-3">
          <p className="text-xs font-black uppercase tracking-[0.04em] text-slate-500">Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge label={statusLabels[order.status]} tone={orderTone(order.status)} />
            <StatusBadge label={paymentLabels[order.paymentStatus]} tone={paymentTone(order.paymentStatus)} />
            <StatusBadge label={deliveryLabels[order.deliveryStatus]} tone={deliveryTone(order.deliveryStatus)} />
          </div>
          {order.paymentStatus !== 'paid' ? (
            <p className="mt-3 rounded-lg border border-amber-400/18 bg-amber-500/10 p-3 text-xs font-bold text-amber-200">
              Aguardando confirmação de pagamento.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function StatusBadge({ label, tone }: { label: string; tone: 'info' | 'success' | 'warning' | 'danger' }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-black',
        tone === 'info' && 'border-sky-400/22 bg-sky-500/12 text-sky-300',
        tone === 'success' && 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300',
        tone === 'warning' && 'border-amber-400/22 bg-amber-500/12 text-amber-300',
        tone === 'danger' && 'border-rose-400/22 bg-rose-500/12 text-rose-300',
      )}
    >
      <BadgeCheck aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  )
}

function orderTone(status: OrderStatus) {
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

function State({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
      <ClipboardCheck aria-hidden="true" className="mb-3 size-9 text-slate-600" />
      <h2 className="text-lg font-black text-white">{title}</h2>
      {description ? <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  )
}
