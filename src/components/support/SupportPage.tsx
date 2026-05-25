import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Headphones,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Tag,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { formatBRL, formatDateTime } from '../../lib/format'
import {
  supportCategoryLabels,
  supportCategoryOptions,
  supportPriorityLabels,
  supportPriorityOptions,
  supportStatusLabels,
  supportStatusOptions,
} from '../../lib/supportLabels'
import { cn } from '../../lib/utils'
import { getMyPurchases } from '../../services/ordersService'
import { getMySellProposals } from '../../services/proposalsService'
import {
  assignTicket,
  closeMyTicket,
  createTicket,
  getMyTickets,
  getSupportAssignees,
  getSupportTicketById,
  getSupportTickets,
  getTicketById,
  replyAsSupport,
  replyToTicket,
  updateTicketPriority,
  updateTicketStatus,
} from '../../services/supportService'
import type {
  Order,
  Profile,
  SellProposal,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketDetails,
  SupportTicketMessage,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../../services/types'

interface SupportPageProps {
  mode: 'list' | 'new' | 'details'
  ticketId?: string | null
}

type SupportScope = 'all' | 'mine'

export function SupportPage({ mode, ticketId }: SupportPageProps) {
  const { user } = useAuth()

  if (mode === 'new') {
    return <NewTicketPage />
  }

  if (mode === 'details') {
    return <TicketDetailPage ticketId={ticketId ?? null} />
  }

  return user?.role === 'customer' ? <CustomerSupportList /> : <SupportDashboard />
}

function CustomerSupportList() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getMyTickets()
        if (active) {
          setTickets(data)
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Não foi possível carregar seus tickets.')
          setTickets([])
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
  }, [])

  return (
    <section className="space-y-4">
      <SupportHeader
        title="Suporte"
        subtitle="Abra um chamado para falar com a equipe ACCSTORE."
        action={
          <button
            type="button"
            onClick={() => navigate('/suporte/novo')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1463FF] px-4 text-sm font-black text-white transition hover:bg-[#1D74FF]"
          >
            <Plus aria-hidden="true" className="size-4" />
            Novo ticket
          </button>
        }
      />

      {loading ? <StateCard title="Carregando tickets..." /> : null}
      {!loading && error ? <StateCard title="Erro ao carregar suporte" description={error} /> : null}

      {!loading && !error && tickets.length === 0 ? (
        <StateCard
          title="Nenhum ticket aberto"
          description="Quando precisar de ajuda, abra um chamado para nossa equipe."
          actionLabel="Novo ticket"
          onAction={() => navigate('/suporte/novo')}
        />
      ) : null}

      {!loading && !error && tickets.length > 0 ? (
        <div className="acc-surface overflow-hidden">
          <div className="divide-y divide-[rgba(120,140,255,0.12)]">
            {tickets.map((ticket) => (
              <TicketListItem key={ticket.id} ticket={ticket} onOpen={() => navigate(`/suporte/${ticket.id}`)} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function NewTicketPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedOrderId = searchParams.get('orderId') ?? ''
  const requestedProposalId = searchParams.get('proposalId') ?? ''
  const [orders, setOrders] = useState<Order[]>([])
  const [proposals, setProposals] = useState<SellProposal[]>([])
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<SupportTicketCategory>(requestedOrderId ? 'order' : requestedProposalId ? 'proposal' : 'other')
  const [relatedOrderId, setRelatedOrderId] = useState(requestedOrderId)
  const [relatedProposalId, setRelatedProposalId] = useState(requestedProposalId)
  const [message, setMessage] = useState('')
  const [loadingRelations, setLoadingRelations] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadRelations() {
      setLoadingRelations(true)

      try {
        const [loadedOrders, loadedProposals] = await Promise.all([
          getMyPurchases().catch(() => []),
          getMySellProposals().catch(() => []),
        ])

        if (active) {
          setOrders(loadedOrders)
          setProposals(loadedProposals)
        }
      } finally {
        if (active) {
          setLoadingRelations(false)
        }
      }
    }

    void loadRelations()

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedSubject = subject.trim()
    const trimmedMessage = message.trim()

    if (!trimmedSubject || !trimmedMessage) {
      setError('Informe o assunto e a mensagem inicial para abrir o ticket.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const details = await createTicket({
        subject: trimmedSubject,
        category,
        initialMessage: trimmedMessage,
        relatedOrderId: relatedOrderId || undefined,
        relatedProposalId: relatedProposalId || undefined,
      })
      navigate(`/suporte/${details.ticket.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível abrir o ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <SupportHeader
        title="Novo ticket"
        subtitle="Conte o que aconteceu para a equipe ACCSTORE acompanhar seu caso."
        action={<BackButton onClick={() => navigate('/suporte')} label="Voltar" />}
      />

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="acc-surface space-y-4 p-5"
      >
        {error ? <Notice tone="danger">{error}</Notice> : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <Field label="Assunto">
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={140}
              className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/72 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/55"
              placeholder="Ex.: Não consigo acessar minha conta"
            />
          </Field>

          <Field label="Categoria">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as SupportTicketCategory)}
              className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/72 px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-400/55"
            >
              {supportCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {orders.length > 0 ? (
            <Field label="Relacionar compra">
              <select
                value={relatedOrderId}
                disabled={loadingRelations}
                onChange={(event) => {
                  setRelatedOrderId(event.target.value)
                  if (event.target.value) {
                    setRelatedProposalId('')
                    setCategory('order')
                  }
                }}
                className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/72 px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-400/55 disabled:opacity-60"
              >
                <option value="">Sem compra relacionada</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderCode} - {order.account?.title ?? 'Compra'}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {proposals.length > 0 ? (
            <Field label="Relacionar proposta">
              <select
                value={relatedProposalId}
                disabled={loadingRelations}
                onChange={(event) => {
                  setRelatedProposalId(event.target.value)
                  if (event.target.value) {
                    setRelatedOrderId('')
                    setCategory('proposal')
                  }
                }}
                className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/72 px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-400/55 disabled:opacity-60"
              >
                <option value="">Sem proposta relacionada</option>
                {proposals.map((proposal) => (
                  <option key={proposal.id} value={proposal.id}>
                    {proposal.proposalCode || 'Proposta'} - {proposal.proposalTitle}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>

        <Field label="Mensagem inicial">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={7}
            className="min-h-44 w-full resize-none rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/72 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/55"
            placeholder="Descreva o problema com detalhes importantes."
          />
        </Field>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/suporte')}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-5 text-sm font-black text-slate-200 transition hover:border-blue-400/42 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1463FF] px-5 text-sm font-black text-white transition hover:bg-[#1D74FF] disabled:opacity-60"
          >
            <Send aria-hidden="true" className="size-4" />
            {submitting ? 'Abrindo ticket...' : 'Abrir ticket'}
          </button>
        </div>
      </form>
    </section>
  )
}

function SupportDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [status, setStatus] = useState<SupportTicketStatus | 'all'>('all')
  const [priority, setPriority] = useState<SupportTicketPriority | 'all'>('all')
  const [category, setCategory] = useState<SupportTicketCategory | 'all'>('all')
  const [scope, setScope] = useState<SupportScope>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getSupportTickets({
          status,
          priority,
          category,
          search,
          assignedTo: scope === 'mine' ? user?.id : undefined,
        })

        if (active) {
          setTickets(data)
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os tickets.')
          setTickets([])
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
  }, [category, priority, scope, search, status, user?.id])

  const clearFilters = () => {
    setStatus('all')
    setPriority('all')
    setCategory('all')
    setScope('all')
    setSearch('')
  }

  return (
    <section className="space-y-4">
      <SupportHeader title="Suporte" subtitle="Atenda tickets dos clientes e acompanhe prioridades da equipe." />

      <section className="acc-surface p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_190px_190px_190px_auto]">
          <label className="flex min-h-11 items-center rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/64 px-3 transition focus-within:border-blue-400/55">
            <Search aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
            <span className="sr-only">Buscar ticket</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por assunto ou cliente..."
              className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>

          <FilterSelect label="Status" value={status} onChange={(value) => setStatus(value as SupportTicketStatus | 'all')}>
            <option value="all">Todos os status</option>
            {supportStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Prioridade" value={priority} onChange={(value) => setPriority(value as SupportTicketPriority | 'all')}>
            <option value="all">Todas prioridades</option>
            {supportPriorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Categoria" value={category} onChange={(value) => setCategory(value as SupportTicketCategory | 'all')}>
            <option value="all">Todas categorias</option>
            {supportCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/56 px-4 text-sm font-black text-white transition hover:border-blue-400/45 hover:bg-[#13213B]"
          >
            <RotateCcw aria-hidden="true" className="size-4 text-slate-300" />
            Limpar
          </button>
        </div>

        <div className="mt-4 inline-flex rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/64 p-1">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'mine', label: 'Meus atribuídos' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setScope(item.value as SupportScope)}
              className={cn(
                'min-h-9 rounded-md px-4 text-sm font-black transition',
                scope === item.value ? 'bg-[#1463FF] text-white' : 'text-slate-400 hover:text-white',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="acc-surface overflow-hidden">
        {loading ? <StateCard title="Carregando tickets..." compact /> : null}
        {!loading && error ? <StateCard title="Erro ao carregar suporte" description={error} compact /> : null}
        {!loading && !error && tickets.length === 0 ? <StateCard title="Nenhum ticket encontrado" description="Ajuste os filtros para localizar outro chamado." compact /> : null}

        {!loading && !error && tickets.length > 0 ? (
          <div className="divide-y divide-[rgba(120,140,255,0.12)]">
            {tickets.map((ticket) => (
              <SupportTicketRow key={ticket.id} ticket={ticket} onOpen={() => navigate(`/suporte/${ticket.id}`)} />
            ))}
          </div>
        ) : null}
      </section>
    </section>
  )
}

async function fetchTicketDetails(ticketId: string, isSupport: boolean) {
  return isSupport ? getSupportTicketById(ticketId) : getTicketById(ticketId)
}

function TicketDetailPage({ ticketId }: { ticketId: string | null }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSupport = user?.role === 'seller' || user?.role === 'admin'
  const [details, setDetails] = useState<SupportTicketDetails | null>(null)
  const [assignees, setAssignees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [internal, setInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    let active = true

    async function loadDetails() {
      if (!ticketId) {
        if (active) {
          setError('Ticket não encontrado.')
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await fetchTicketDetails(ticketId, isSupport)
        if (active) {
          setDetails(data)
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Não foi possível carregar este ticket.')
          setDetails(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadDetails()

    return () => {
      active = false
    }
  }, [isSupport, ticketId])

  useEffect(() => {
    let active = true

    async function loadAssignees() {
      if (!isSupport) {
        setAssignees([])
        return
      }

      try {
        const data = await getSupportAssignees()
        if (active) {
          setAssignees(data)
        }
      } catch {
        if (active) {
          setAssignees([])
        }
      }
    }

    void loadAssignees()

    return () => {
      active = false
    }
  }, [isSupport])

  const ticket = details?.ticket ?? null
  const canReply = ticket?.status !== 'closed'

  const reloadAfterAction = async (updatedTicket?: SupportTicket) => {
    if (updatedTicket && details) {
      setDetails({ ...details, ticket: updatedTicket })
    }

    if (ticketId) {
      setDetails(await fetchTicketDetails(ticketId, isSupport))
    }
  }

  const handleReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ticket || !message.trim()) return

    setSending(true)
    setActionError(null)

    try {
      if (isSupport) {
        await replyAsSupport(ticket.id, message.trim(), { isInternal: internal })
      } else {
        await replyToTicket(ticket.id, message.trim())
      }
      setMessage('')
      setInternal(false)
      await reloadAfterAction()
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Não foi possível responder este ticket.')
    } finally {
      setSending(false)
    }
  }

  const runTicketUpdate = async (action: () => Promise<SupportTicket>) => {
    setUpdating(true)
    setActionError(null)

    try {
      const updated = await action()
      await reloadAfterAction(updated)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Não foi possível atualizar este ticket.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <StateCard title="Carregando ticket..." />
  }

  if (error || !ticket || !details) {
    return (
      <StateCard
        title="Ticket não encontrado"
        description={error ?? 'Volte para o suporte e tente novamente.'}
        actionLabel="Voltar para suporte"
        onAction={() => navigate('/suporte')}
      />
    )
  }

  return (
    <section className="mx-auto max-w-7xl space-y-4">
      <SupportHeader
        title={ticket.subject}
        subtitle={`${supportCategoryLabels[ticket.category]} · ${supportStatusLabels[ticket.status]}`}
        action={<BackButton onClick={() => navigate('/suporte')} label="Voltar" />}
      />

      {actionError ? <Notice tone="danger">{actionError}</Notice> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="acc-surface overflow-hidden">
            <div className="border-b border-[rgba(120,140,255,0.12)] p-4">
              <h2 className="text-lg font-black text-white">Histórico de mensagens</h2>
            </div>
            <div className="min-h-[340px] space-y-4 bg-[radial-gradient(circle_at_50%_20%,rgba(20,99,255,0.08),transparent_32%)] p-4">
              {details.messages.length > 0 ? (
                details.messages.map((item) => <TicketMessageBubble key={item.id} message={item} currentUserId={user?.id} />)
              ) : (
                <StateCard title="Nenhuma mensagem ainda" compact />
              )}
            </div>
            <form className="border-t border-[rgba(120,140,255,0.12)] p-4" onSubmit={(event) => void handleReply(event)}>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={!canReply}
                rows={3}
                placeholder={canReply ? 'Digite sua resposta...' : 'Ticket fechado'}
                className="min-h-20 w-full resize-none rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/72 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/55 disabled:opacity-60"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {isSupport ? (
                  <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={internal}
                      onChange={(event) => setInternal(event.target.checked)}
                      disabled={!canReply}
                      className="size-4 rounded border-white/20 bg-[#101827]"
                    />
                    Nota interna
                  </label>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={!canReply || sending || !message.trim()}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1463FF] px-4 text-sm font-black text-white transition hover:bg-[#1D74FF] disabled:opacity-60"
                >
                  <Send aria-hidden="true" className="size-4" />
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-4">
          <TicketSummary ticket={ticket} isSupport={isSupport} />

          {isSupport ? (
            <SupportControls
              ticket={ticket}
              assignees={assignees}
              updating={updating}
              onStatusChange={(nextStatus) => void runTicketUpdate(() => updateTicketStatus(ticket.id, nextStatus))}
              onPriorityChange={(nextPriority) => void runTicketUpdate(() => updateTicketPriority(ticket.id, nextPriority))}
              onAssigneeChange={(nextAssignee) => void runTicketUpdate(() => assignTicket(ticket.id, nextAssignee))}
            />
          ) : ticket.status !== 'closed' ? (
            <section className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-4">
              <button
                type="button"
                onClick={() => void runTicketUpdate(() => closeMyTicket(ticket.id))}
                disabled={updating}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/24 bg-emerald-500/12 px-4 text-sm font-black text-emerald-100 transition hover:border-emerald-300/60 disabled:opacity-60"
              >
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Fechar ticket
              </button>
            </section>
          ) : null}
        </aside>
      </div>
    </section>
  )
}

function TicketListItem({ ticket, onOpen }: { ticket: SupportTicket; onOpen: () => void }) {
  return (
    <article className="grid gap-4 p-4 transition hover:bg-[#101827]/62 lg:grid-cols-[minmax(0,1.4fr)_180px_160px_160px_180px_auto] lg:items-center">
      <div className="min-w-0">
        <h2 className="truncate text-base font-black text-white">{ticket.subject}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-400">{supportCategoryLabels[ticket.category]}</p>
      </div>
      <SupportBadge label={supportStatusLabels[ticket.status]} tone={statusTone(ticket.status)} />
      <SupportBadge label={supportPriorityLabels[ticket.priority]} tone={priorityTone(ticket.priority)} />
      <span className="text-sm font-semibold text-slate-300">{formatDateTime(ticket.updatedAt)}</span>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-400/28 bg-blue-500/10 px-4 text-sm font-black text-blue-100 transition hover:border-blue-300"
      >
        <Eye aria-hidden="true" className="size-4" />
        Ver ticket
      </button>
    </article>
  )
}

function SupportTicketRow({ ticket, onOpen }: { ticket: SupportTicket; onOpen: () => void }) {
  return (
    <article className="grid gap-4 p-4 transition hover:bg-[#101827]/62 xl:grid-cols-[minmax(0,1.4fr)_180px_150px_150px_180px_170px_auto] xl:items-center">
      <div className="min-w-0">
        <h2 className="truncate text-base font-black text-white">{ticket.subject}</h2>
        <p className="mt-1 truncate text-sm font-semibold text-slate-400">{ticket.customer?.fullName || 'Cliente'}</p>
      </div>
      <span className="text-sm font-semibold text-slate-300">{supportCategoryLabels[ticket.category]}</span>
      <SupportBadge label={supportStatusLabels[ticket.status]} tone={statusTone(ticket.status)} />
      <SupportBadge label={supportPriorityLabels[ticket.priority]} tone={priorityTone(ticket.priority)} />
      <span className="text-sm font-semibold text-slate-300">{ticket.assignedTo?.fullName || 'Sem responsável'}</span>
      <span className="text-sm font-semibold text-slate-300">{formatDateTime(ticket.updatedAt)}</span>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-400/28 bg-blue-500/10 px-4 text-sm font-black text-blue-100 transition hover:border-blue-300"
      >
        <Headphones aria-hidden="true" className="size-4" />
        Atender
      </button>
    </article>
  )
}

function TicketSummary({ ticket, isSupport }: { ticket: SupportTicket; isSupport: boolean }) {
  return (
    <section className="acc-surface p-4">
      <h2 className="text-lg font-black text-white">Dados do ticket</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-[rgba(120,140,255,0.14)]">
        {isSupport && ticket.customer ? <DetailRow icon={UserRound} label="Cliente">{ticket.customer.fullName || 'Cliente'}</DetailRow> : null}
        <DetailRow icon={ShieldCheck} label="Status">{supportStatusLabels[ticket.status]}</DetailRow>
        <DetailRow icon={Tag} label="Categoria">{supportCategoryLabels[ticket.category]}</DetailRow>
        <DetailRow icon={Clock} label="Prioridade">{supportPriorityLabels[ticket.priority]}</DetailRow>
        <DetailRow icon={Clock} label="Atualizado">{formatDateTime(ticket.updatedAt)}</DetailRow>
        {ticket.relatedOrder ? (
          <DetailRow icon={ShieldCheck} label="Compra">
            {ticket.relatedOrder.orderCode} · {formatBRL(ticket.relatedOrder.amount)}
          </DetailRow>
        ) : null}
        {ticket.relatedProposal ? (
          <DetailRow icon={Tag} label="Proposta">
            {ticket.relatedProposal.proposalTitle}
          </DetailRow>
        ) : null}
        {ticket.assignedTo ? <DetailRow icon={Headphones} label="Responsável">{ticket.assignedTo.fullName}</DetailRow> : null}
      </div>
    </section>
  )
}

function SupportControls({
  ticket,
  assignees,
  updating,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
}: {
  ticket: SupportTicket
  assignees: Profile[]
  updating: boolean
  onStatusChange: (status: SupportTicketStatus) => void
  onPriorityChange: (priority: SupportTicketPriority) => void
  onAssigneeChange: (userId: string | null) => void
}) {
  return (
    <section className="acc-surface space-y-4 p-4">
      <h2 className="text-lg font-black text-white">Atendimento</h2>

      <Field label="Status">
        <select
          value={ticket.status}
          disabled={updating}
          onChange={(event) => onStatusChange(event.target.value as SupportTicketStatus)}
          className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/72 px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-400/55 disabled:opacity-60"
        >
          {supportStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Prioridade">
        <select
          value={ticket.priority}
          disabled={updating}
          onChange={(event) => onPriorityChange(event.target.value as SupportTicketPriority)}
          className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/72 px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-400/55 disabled:opacity-60"
        >
          {supportPriorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Atribuir responsável">
        <select
          value={ticket.assignedToId ?? ''}
          disabled={updating}
          onChange={(event) => onAssigneeChange(event.target.value || null)}
          className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/72 px-4 text-sm font-semibold text-white outline-none transition focus:border-blue-400/55 disabled:opacity-60"
        >
          <option value="">Sem responsável</option>
          {assignees.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.fullName || profile.email || 'Equipe ACCSTORE'}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-2">
        <QuickStatusButton disabled={updating} onClick={() => onStatusChange('in_progress')}>Marcar como em andamento</QuickStatusButton>
        <QuickStatusButton disabled={updating} onClick={() => onStatusChange('waiting_customer')}>Aguardar cliente</QuickStatusButton>
        <QuickStatusButton disabled={updating} onClick={() => onStatusChange('resolved')}>Resolver</QuickStatusButton>
        {ticket.status === 'closed' ? (
          <QuickStatusButton disabled={updating} onClick={() => onStatusChange('open')}>Reabrir ticket</QuickStatusButton>
        ) : (
          <QuickStatusButton disabled={updating} onClick={() => onStatusChange('closed')}>Fechar ticket</QuickStatusButton>
        )}
      </div>
    </section>
  )
}

function TicketMessageBubble({ message, currentUserId }: { message: SupportTicketMessage; currentUserId?: string }) {
  const isMine = message.senderId === currentUserId
  const senderName = isMine ? 'Você' : message.sender?.fullName || 'Equipe ACCSTORE'

  return (
    <div className={cn('flex items-end gap-2', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-[0_12px_32px_rgba(0,0,0,0.22)] sm:max-w-[70%]',
          isMine
            ? 'rounded-br-md border border-blue-300/18 bg-gradient-to-br from-[#1463FF] to-[#0750D8] text-white'
            : 'rounded-bl-md border border-white/10 bg-[#151C2C] text-slate-100',
          message.isInternal && 'border-amber-300/28 bg-amber-500/12 text-amber-50',
        )}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-xs font-black text-white/80">{senderName}</span>
          {message.isInternal ? (
            <span className="rounded-full border border-amber-300/28 bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-100">
              Nota interna
            </span>
          ) : null}
        </div>
        <p>{message.message}</p>
        <span className={cn('mt-1.5 flex items-center justify-end text-[11px]', isMine ? 'text-blue-100/75' : 'text-slate-400')}>
          {formatDateTime(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

function SupportHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="acc-surface p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-200">
            <Headphones aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-black text-white sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{subtitle}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}

function DetailRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[22px_96px_minmax(0,1fr)] items-center gap-2 border-b border-[rgba(120,140,255,0.12)] px-3 py-3 last:border-b-0">
      <Icon aria-hidden="true" className="size-4 text-slate-400" />
      <span className="text-sm font-bold text-slate-300">{label}</span>
      <span className="min-w-0 text-right text-sm font-semibold text-white">{children}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#0B1222] px-4 text-sm font-semibold text-slate-200 outline-none transition focus:border-blue-400/55"
      >
        {children}
      </select>
    </label>
  )
}

function QuickStatusButton({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-blue-400/24 bg-blue-500/10 px-3 text-sm font-black text-blue-100 transition hover:border-blue-300/60 disabled:opacity-60"
    >
      {children}
    </button>
  )
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-black text-slate-200 transition hover:border-blue-400/42 hover:text-white"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {label}
    </button>
  )
}

function StateCard({
  title,
  description,
  actionLabel,
  onAction,
  compact,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
}) {
  return (
    <section className={cn('flex flex-col items-center justify-center rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/70 p-8 text-center', compact ? 'min-h-44' : 'min-h-72')}>
      <MessageCircle aria-hidden="true" className="mb-4 size-10 text-slate-600" />
      <h2 className="text-xl font-black text-white">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1463FF] px-5 text-sm font-black text-white transition hover:bg-[#1D74FF]"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  )
}

function SupportBadge({ label, tone }: { label: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 w-fit items-center rounded-lg border px-3 text-xs font-black',
        tone === 'info' && 'border-sky-400/22 bg-sky-500/12 text-sky-300',
        tone === 'success' && 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300',
        tone === 'warning' && 'border-amber-400/22 bg-amber-500/12 text-amber-300',
        tone === 'danger' && 'border-rose-400/22 bg-rose-500/12 text-rose-300',
        tone === 'neutral' && 'border-slate-400/18 bg-slate-500/12 text-slate-300',
      )}
    >
      {label}
    </span>
  )
}

function Notice({ tone, children }: { tone: 'danger' | 'success'; children: ReactNode }) {
  return (
    <p
      className={cn(
        'rounded-lg border px-4 py-3 text-sm font-bold',
        tone === 'danger' && 'border-rose-400/22 bg-rose-500/12 text-rose-100',
        tone === 'success' && 'border-emerald-400/22 bg-emerald-500/12 text-emerald-100',
      )}
    >
      {children}
    </p>
  )
}

function statusTone(status: SupportTicketStatus) {
  if (status === 'closed') return 'neutral'
  if (status === 'resolved') return 'success'
  if (status === 'waiting_customer') return 'warning'
  return 'info'
}

function priorityTone(priority: SupportTicketPriority) {
  if (priority === 'urgent') return 'danger'
  if (priority === 'high') return 'warning'
  if (priority === 'low') return 'neutral'
  return 'info'
}
