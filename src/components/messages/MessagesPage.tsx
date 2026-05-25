import {
  BadgeDollarSign,
  CheckCheck,
  ClipboardList,
  Eye,
  FileText,
  MessageCircle,
  PackageCheck,
  Search,
  Send,
  ShieldCheck,
  Tag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import type { AuthUser } from '../../auth/types'
import { formatBRL, formatDateTime, initials } from '../../lib/format'
import { proposalStatusLabels } from '../../lib/proposalStatus'
import { cn } from '../../lib/utils'
import {
  getAllConversations,
  getConversationMessages,
  getUserConversations,
  markConversationAsRead,
  sendMessage,
} from '../../services/messagesService'
import type { Account, Conversation, DeliveryStatus, Message, OrderStatus, PaymentStatus } from '../../services/types'

interface MessagesPageProps {
  onOpenAccount?: (account: Account) => void
}

const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Pedido criado',
  processing: 'Em preparação',
  payment_review: 'Pagamento em análise',
  delivery: 'Aguardando entrega',
  completed: 'Concluído',
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

export function MessagesPage({ onOpenAccount }: MessagesPageProps) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedConversationId = searchParams.get('conversationId')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadConversations() {
      if (!user) {
        setConversations([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = user.role === 'admin' ? await getAllConversations() : await getUserConversations(user.id)
        if (active) {
          setConversations(data)
          setSelectedId((current) => {
            if (requestedConversationId && data.some((conversation) => conversation.id === requestedConversationId)) {
              return requestedConversationId
            }

            if (current && data.some((conversation) => conversation.id === current)) {
              return current
            }

            return data[0]?.id ?? null
          })
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Erro ao carregar conversas.')
          setConversations([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadConversations()

    return () => {
      active = false
    }
  }, [requestedConversationId, user])

  useEffect(() => {
    let active = true

    async function loadMessages() {
      if (!selectedId) {
        setMessages([])
        return
      }

      try {
        setMessagesLoading(true)
        const data = await getConversationMessages(selectedId)
        await markConversationAsRead(selectedId)
        if (active) {
          setMessages(data)
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Erro ao carregar mensagens.')
          setMessages([])
        }
      } finally {
        if (active) {
          setMessagesLoading(false)
        }
      }
    }

    void loadMessages()

    return () => {
      active = false
    }
  }, [selectedId])

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) ?? null

  const handleSelectConversation = (conversationId: string) => {
    setSelectedId(conversationId)
    setSearchParams({ conversationId })
  }

  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return conversations.filter((conversation) => {
      if (!normalizedQuery) {
        return true
      }

      return [
        conversation.buyer?.fullName,
        conversation.seller?.fullName,
        conversation.account?.title,
        conversation.id,
        conversation.lastMessage,
        conversation.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [conversations, query])

  const handleSendMessage = async (text: string) => {
    if (!user || !selectedConversation) {
      return
    }

    const created = await sendMessage({
      conversationId: selectedConversation.id,
      senderId: user.id,
      body: text,
    })
    setMessages((current) => [...current, { ...created, sender: undefined }])
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversation.id
          ? { ...conversation, lastMessage: text, lastMessageAt: new Date().toISOString() }
          : conversation,
      ),
    )
  }

  return (
    <section className="space-y-3">
      <div className="acc-surface p-5">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-200">
            <MessageCircle aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">Mensagens</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Converse sobre suas compras, propostas e atendimento.
            </p>
          </div>
        </div>
      </div>

      {loading ? <State title="Carregando conversas..." /> : null}
      {error ? <State title="Erro ao carregar dados. Tente novamente." description={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-3 lg:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[390px_minmax(0,1fr)_360px]">
          <ConversationList
            conversations={visibleConversations}
            totalConversations={conversations.length}
            selectedId={selectedConversation?.id ?? ''}
            query={query}
            onQueryChange={setQuery}
            onSelect={handleSelectConversation}
          />

          <ChatPanel
            conversation={selectedConversation}
            messages={messages}
            loading={messagesLoading}
            onSendMessage={handleSendMessage}
          />

          <ConversationDetails conversation={selectedConversation} className="lg:col-span-2 2xl:col-span-1" onOpenAccount={onOpenAccount} />
        </div>
      ) : null}
    </section>
  )
}

function getConversationPartner(conversation: Conversation, user?: AuthUser | null) {
  if (user?.role === 'customer' || user?.id === conversation.buyerId) {
    return conversation.seller?.fullName || 'ACCSTORE'
  }

  if (user?.id === conversation.sellerId) {
    return conversation.buyer?.fullName || 'Cliente'
  }

  return conversation.buyer?.fullName || conversation.seller?.fullName || 'Atendimento ACCSTORE'
}

function getContextLabel(conversation: Conversation) {
  if (conversation.order || conversation.orderId) return 'Compra'
  if (conversation.proposal || conversation.proposalId) return 'Proposta'
  return 'Atendimento'
}

function getChatSubtitle(conversation: Conversation) {
  if (conversation.order || conversation.orderId) return 'Conversa sobre compra'
  if (conversation.proposal || conversation.proposalId) return 'Conversa sobre proposta'
  return 'Atendimento ACCSTORE'
}

interface ConversationListProps {
  conversations: Conversation[]
  totalConversations: number
  selectedId: string
  query: string
  onQueryChange: (value: string) => void
  onSelect: (conversationId: string) => void
}

function ConversationList({
  conversations,
  totalConversations,
  selectedId,
  query,
  onQueryChange,
  onSelect,
}: ConversationListProps) {
  return (
    <aside className="acc-surface overflow-hidden">
      <div className="space-y-4 border-b border-[rgba(120,140,255,0.14)] p-4">
        <label className="flex min-h-11 items-center rounded-lg border border-[rgba(120,140,255,0.2)] bg-[#070B16]/70 px-3 transition focus-within:border-blue-400/50">
          <Search aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
          <span className="sr-only">Buscar conversa</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar conversa..."
            className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </label>
      </div>

      <div className="max-h-[640px] overflow-y-auto">
        {conversations.length > 0 ? (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              selected={conversation.id === selectedId}
              onSelect={onSelect}
            />
          ))
        ) : (
          <State title="Nenhuma conversa ainda" description="Quando você iniciar uma compra ou proposta, suas conversas aparecerão aqui." compact />
        )}
      </div>

      <div className="border-t border-[rgba(120,140,255,0.14)] px-4 py-3 text-center text-xs font-medium text-slate-500">
        Mostrando {conversations.length} de {totalConversations} conversas
      </div>
    </aside>
  )
}

function ConversationItem({ conversation, selected, onSelect }: { conversation: Conversation; selected: boolean; onSelect: (conversationId: string) => void }) {
  const { user } = useAuth()
  const participant = getConversationPartner(conversation, user)
  const contextLabel = getContextLabel(conversation)

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'relative flex w-full gap-3 border-b border-[rgba(120,140,255,0.12)] px-4 py-3.5 text-left transition hover:bg-[#101827]/82',
        selected && 'border-l-2 border-l-[#38BDF8] bg-[#0A2B66]/58 shadow-[inset_0_0_30px_rgba(20,99,255,0.08)]',
      )}
    >
      <Avatar initials={initials(participant)} name={participant} className="mt-0.5 from-sky-200 via-slate-200 to-amber-200 text-slate-950" />

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-white">{participant}</span>
            <span className="mt-0.5 inline-flex min-h-6 items-center rounded-full border border-blue-400/18 bg-blue-500/10 px-2 text-[11px] font-black text-blue-200">
              {contextLabel}
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-slate-400">
            {conversation.lastMessageAt ? formatDateTime(conversation.lastMessageAt) : ''}
          </span>
        </span>

        <span className="mt-1 block truncate text-xs leading-5 text-slate-400">{conversation.lastMessage ?? 'Sem mensagens ainda.'}</span>
      </span>
    </button>
  )
}

function ChatPanel({
  conversation,
  messages,
  loading,
  onSendMessage,
}: {
  conversation: Conversation | null
  messages: Message[]
  loading: boolean
  onSendMessage: (text: string) => Promise<void>
}) {
  const { user } = useAuth()

  if (!conversation) {
    return <State title="Nenhuma conversa ainda" description="Quando você iniciar uma compra ou proposta, suas conversas aparecerão aqui." />
  }

  const participant = getConversationPartner(conversation, user)
  const subtitle = getChatSubtitle(conversation)

  return (
    <section className="acc-surface flex min-h-[690px] flex-col overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-[rgba(120,140,255,0.14)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar initials={initials(participant)} name={participant} className="from-sky-200 via-slate-200 to-amber-200 text-slate-950" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-white">{participant}</h2>
            <p className="truncate text-xs font-medium text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_20%,rgba(20,99,255,0.08),transparent_32%)] px-4 py-5 sm:px-5">
        {loading ? <State title="Carregando mensagens..." compact /> : null}
        {!loading && messages.length === 0 ? <State title="Nenhuma conversa ainda" description="Quando você iniciar uma compra ou proposta, suas conversas aparecerão aqui." compact /> : null}
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>
      </div>

      <MessageInput onSend={onSendMessage} />
    </section>
  )
}

function ChatMessage({ message }: { message: Message }) {
  const { user } = useAuth()
  const isMine = message.senderId === user?.id

  return (
    <div className={cn('flex items-end gap-2', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-[0_12px_32px_rgba(0,0,0,0.22)] sm:max-w-[68%]',
          isMine
            ? 'rounded-br-md border border-blue-300/18 bg-gradient-to-br from-[#1463FF] to-[#0750D8] text-white'
            : 'rounded-bl-md border border-white/10 bg-[#151C2C] text-slate-100',
        )}
      >
        <p>{message.body}</p>
        <span className={cn('mt-1.5 flex items-center justify-end gap-1 text-[11px]', isMine ? 'text-blue-100/75' : 'text-slate-400')}>
          {formatDateTime(message.createdAt)}
          {isMine ? <CheckCheck aria-hidden="true" className="size-3.5" /> : null}
        </span>
      </div>
    </div>
  )
}

function ConversationDetails({
  conversation,
  className,
  onOpenAccount,
}: {
  conversation: Conversation | null
  className?: string
  onOpenAccount?: (account: Account) => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()

  if (!conversation || (!conversation.order && !conversation.proposal && !conversation.account)) {
    return null
  }

  const actionRows: Array<{ label: string; icon: LucideIcon; onClick: () => void }> = []
  const detailRows: Array<{ label: string; icon: LucideIcon; value: ReactNode }> = []

  if (conversation.account?.title) {
    detailRows.push({ label: conversation.order ? 'Conta comprada' : 'Conta', icon: Tag, value: conversation.account.title })
  }

  if (conversation.order) {
    detailRows.push({ label: 'Pedido', icon: PackageCheck, value: orderStatusLabels[conversation.order.status] })
    detailRows.push({ label: 'Pagamento', icon: ShieldCheck, value: paymentStatusLabels[conversation.order.paymentStatus] })
    detailRows.push({ label: 'Entrega', icon: ClipboardList, value: deliveryStatusLabels[conversation.order.deliveryStatus] })
    detailRows.push({ label: 'Valor', icon: BadgeDollarSign, value: formatBRL(conversation.order.amount) })
  }

  if (conversation.proposal) {
    detailRows.push({ label: 'Proposta', icon: FileText, value: conversation.proposal.proposalTitle })
    detailRows.push({ label: 'Status', icon: ShieldCheck, value: proposalStatusLabels[conversation.proposal.status] })
    detailRows.push({ label: 'Preço desejado', icon: BadgeDollarSign, value: formatBRL(conversation.proposal.desiredPrice) })
  }

  if (conversation.orderId && conversation.order) {
    actionRows.push({
      label: user?.role === 'customer' ? 'Ver compra' : 'Ver pedido',
      icon: ClipboardList,
      onClick: () => navigate(user?.role === 'customer' ? `/minhas-compras/${conversation.orderId}` : user?.role === 'admin' ? '/admin/pedidos' : '/pedidos'),
    })
  }

  if (conversation.account && onOpenAccount) {
    actionRows.push({
      label: 'Ver conta',
      icon: Eye,
      onClick: () => onOpenAccount(conversation.account as Account),
    })
  }

  if (conversation.proposalId && conversation.proposal) {
    actionRows.push({
      label: 'Ver proposta',
      icon: FileText,
      onClick: () => navigate(user?.role === 'customer' ? '/minhas-propostas' : `/propostas-recebidas/${conversation.proposalId}`),
    })
  }

  return (
    <aside className={cn('acc-surface overflow-hidden', className)}>
      <div className="border-b border-[rgba(120,140,255,0.14)] p-4">
        <h2 className="text-lg font-black text-white">Contexto</h2>
      </div>

      <div className="space-y-5 p-4">
        <div className="overflow-hidden rounded-lg border border-[rgba(120,140,255,0.14)]">
          {detailRows.map((row) => (
            <DetailRow key={row.label} icon={row.icon} label={row.label}>
              {row.value}
            </DetailRow>
          ))}
        </div>

        {actionRows.length > 0 ? (
          <section>
            <h3 className="text-sm font-black text-white">Atalhos</h3>
            <div className="mt-3 space-y-2">
              {actionRows.map(({ label, icon: Icon, onClick }) => (
                <button key={label} type="button" onClick={onClick} className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-[rgba(120,140,255,0.14)] bg-[#101827]/62 px-3 text-left text-sm font-black text-white transition hover:border-blue-400/42 hover:bg-[#13213B]">
                  <Icon aria-hidden="true" className="size-5 shrink-0 text-sky-300" />
                  {label}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  )
}

function DetailRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[22px_92px_minmax(0,1fr)] items-center gap-2 border-b border-[rgba(120,140,255,0.12)] px-3 py-3 last:border-b-0">
      <Icon aria-hidden="true" className="size-4 text-slate-400" />
      <span className="text-sm font-bold text-slate-300">{label}</span>
      <span className="min-w-0 text-right text-sm font-semibold text-white">{children}</span>
    </div>
  )
}

function MessageInput({ onSend }: { onSend: (text: string) => Promise<void> }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const trimmed = message.trim()

    if (!trimmed) return

    setSending(true)
    try {
      await onSend(trimmed)
      setMessage('')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="border-t border-[rgba(120,140,255,0.14)] p-4" onSubmit={(event) => void handleSubmit(event)}>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Digite sua mensagem..."
        rows={2}
        className="acc-field min-h-14 w-full resize-none px-4 py-3 text-sm leading-6 placeholder:text-slate-500"
      />

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={sending}
          className="acc-button-primary inline-flex min-h-10 items-center gap-2 px-4 text-sm font-black transition disabled:opacity-60"
        >
          <Send aria-hidden="true" className="size-4" />
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </form>
  )
}

function Avatar({ initials: avatarInitials, name, className }: { initials: string; name: string; className?: string }) {
  return (
    <span aria-label={`Avatar de ${name}`} className={cn('flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black ring-2 ring-white/10', className)}>
      {avatarInitials}
    </span>
  )
}

function State({ title, description, compact }: { title: string; description?: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 text-center', compact ? 'min-h-40' : 'min-h-56 rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0A0F1D]/92')}>
      <MessageCircle aria-hidden="true" className="mb-3 size-9 text-slate-600" />
      <p className="text-sm font-bold text-white">{title}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
    </div>
  )
}
