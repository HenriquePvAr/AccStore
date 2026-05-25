import { ExternalLink, Eye, Handshake, MessageCircle, Search, ShieldCheck, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { formatBRL, formatDateTime } from '../../lib/format'
import { proposalStatusLabels, proposalStatusStyles } from '../../lib/proposalStatus'
import { cn } from '../../lib/utils'
import { formatWhatsAppDisplay, getWhatsAppUrl } from '../../lib/whatsapp'
import { startProposalConversation } from '../../services/messagesService'
import { getReceivedSellProposals, updateSellProposalStatus } from '../../services/proposalsService'
import type { ProposalStatus, SellProposal } from '../../services/types'

interface ReceivedProposalsPageProps {
  onOpenAnalysis: (proposalId: string) => void
}

const statusOrder: Array<ProposalStatus | 'all'> = [
  'all',
  'pending_analysis',
  'under_review',
  'negotiating',
  'counter_offer_sent',
  'approved_for_purchase',
  'purchased',
  'rejected',
]

const statusFilterLabel: Record<ProposalStatus | 'all', string> = {
  all: 'Todas as propostas',
  ...proposalStatusLabels,
}

export function ReceivedProposalsPage({ onOpenAnalysis }: ReceivedProposalsPageProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [proposals, setProposals] = useState<SellProposal[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all')
  const [negotiatingId, setNegotiatingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadProposals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getReceivedSellProposals()
      setProposals(data)
      setSelectedId((current) => current ?? data[0]?.id ?? null)
    } catch {
      setError('Não foi possível carregar as propostas recebidas agora.')
      setProposals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    queueMicrotask(() => {
      if (active) {
        void loadProposals()
      }
    })

    return () => {
      active = false
    }
  }, [loadProposals])

  const filteredProposals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return proposals.filter((proposal) => {
      const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter
      const matchesQuery =
        !normalizedQuery ||
        [
          proposal.customer?.fullName,
          proposal.guestName,
          proposal.guestWhatsapp,
          proposal.guestEmail,
          proposal.gameName,
          proposal.proposalTitle,
          proposal.category,
          proposal.platform,
          proposal.proposalCode,
          proposalStatusLabels[proposal.status],
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)

      return matchesStatus && matchesQuery
    })
  }, [proposals, query, statusFilter])

  const selectedProposal = filteredProposals.find((proposal) => proposal.id === selectedId) ?? filteredProposals[0] ?? null

  const changeStatus = async (proposalId: string, status: ProposalStatus) => {
    setActionError(null)
    await updateSellProposalStatus(proposalId, {
      status,
      historyAction: status,
      historyNote: `Status atualizado para ${proposalStatusLabels[status]}.`,
    })
    await loadProposals()
  }

  const negotiateProposal = async (proposalId: string) => {
    if (user?.role !== 'seller' && user?.role !== 'admin') {
      setActionError('Você não tem permissão para abrir negociação.')
      return
    }

    const proposal = proposals.find((item) => item.id === proposalId)

    if (proposal?.isGuest) {
      setActionError('Use o WhatsApp informado para falar com este cliente.')
      return
    }

    setNegotiatingId(proposalId)
    setActionError(null)

    try {
      const conversation = await startProposalConversation(proposalId)
      await loadProposals()
      navigate(`/mensagens?conversationId=${conversation.id}`)
    } catch {
      setActionError('Não foi possível abrir a negociação. Tente novamente.')
    } finally {
      setNegotiatingId(null)
    }
  }

  return (
    <section className="space-y-4">
      <AdminHeader />

      {loading ? <State title="Carregando propostas..." /> : null}
      {error ? <State title="Erro ao carregar dados. Tente novamente." description={error} /> : null}
      {actionError ? (
        <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
          {actionError}
        </p>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-4 2xl:grid-cols-[430px_minmax(0,1fr)_360px]">
          <ProposalList
            proposals={filteredProposals}
            selectedId={selectedProposal?.id ?? ''}
            query={query}
            onQueryChange={setQuery}
            onSelect={setSelectedId}
          />
          <ProposalPreviewPanel
            proposal={selectedProposal}
            canNegotiate={Boolean(selectedProposal && !selectedProposal.isGuest && (user?.role === 'seller' || user?.role === 'admin'))}
            negotiating={Boolean(selectedProposal && negotiatingId === selectedProposal.id)}
            onOpenAnalysis={onOpenAnalysis}
            onChangeStatus={changeStatus}
            onNegotiate={negotiateProposal}
          />
          <aside className="space-y-4">
            <ProposalStatsCard proposals={proposals} />
            <ProposalQuickFilters proposals={proposals} activeFilter={statusFilter} onFilterChange={setStatusFilter} />
            <NextStepsCard />
          </aside>
        </div>
      ) : null}
    </section>
  )
}

function AdminHeader() {
  return (
    <div className="acc-surface p-5">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-[#1463FF] text-white shadow-[0_0_24px_rgba(20,99,255,0.2)]">
          <Handshake aria-hidden="true" className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Propostas recebidas</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
            Contas enviadas por clientes para análise da ACCSTORE.
          </p>
        </div>
      </div>
    </div>
  )
}

function ProposalList({ proposals, selectedId, query, onQueryChange, onSelect }: { proposals: SellProposal[]; selectedId: string; query: string; onQueryChange: (value: string) => void; onSelect: (proposalId: string) => void }) {
  return (
    <aside className="acc-surface overflow-hidden">
      <div className="flex gap-3 border-b border-[rgba(120,140,255,0.14)] p-4">
        <label className="flex min-h-11 flex-1 items-center rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#070B16]/64 px-3 transition focus-within:border-blue-400/55">
          <Search aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
          <span className="sr-only">Buscar propostas</span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar propostas..." className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500" />
        </label>
      </div>

      <div className="max-h-[700px] overflow-y-auto">
        {proposals.length > 0 ? (
          proposals.map((proposal) => <ProposalListItem key={proposal.id} proposal={proposal} selected={proposal.id === selectedId} onSelect={onSelect} />)
        ) : (
          <State title="Nenhuma proposta recebida" description="Quando um cliente enviar proposta real, ela aparecerá aqui." compact />
        )}
      </div>

      <div className="border-t border-[rgba(120,140,255,0.14)] px-4 py-3 text-center text-xs font-semibold text-slate-500">
        {proposals.length} proposta(s)
      </div>
    </aside>
  )
}

function ProposalListItem({ proposal, selected, onSelect }: { proposal: SellProposal; selected: boolean; onSelect: (proposalId: string) => void }) {
  const cover = proposal.media.find((item) => item.isCover) ?? proposal.media[0]

  return (
    <button type="button" onClick={() => onSelect(proposal.id)} className={cn('flex w-full gap-3 border-b border-[rgba(120,140,255,0.12)] p-4 text-left transition hover:bg-[#101827]/68', selected && 'border-l-2 border-l-[#1463FF] bg-[#0A2B66]/58')}>
      {cover ? <img src={cover.url} alt="" className="size-20 shrink-0 rounded-lg border border-white/10 object-cover" /> : <div className="size-20 shrink-0 rounded-lg border border-white/10 bg-[#101827]" />}
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-white">{proposal.customer?.fullName ?? proposal.guestName ?? 'Cliente'}</span>
            <span className="mt-1 block truncate text-xs font-semibold text-slate-400">{proposal.gameName}</span>
          </span>
          <ProposalStatusBadge status={proposal.status} compact />
        </span>
        <span className="mt-2 block line-clamp-2 text-sm font-semibold leading-5 text-slate-200">{proposal.proposalTitle}</span>
        <span className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm font-black text-white">{formatBRL(proposal.desiredPrice)}</span>
          <span className="text-xs font-medium text-slate-500">{formatDateTime(proposal.createdAt)}</span>
        </span>
      </span>
    </button>
  )
}

function ProposalPreviewPanel({
  proposal,
  canNegotiate,
  negotiating,
  onOpenAnalysis,
  onChangeStatus,
  onNegotiate,
}: {
  proposal: SellProposal | null
  canNegotiate: boolean
  negotiating: boolean
  onOpenAnalysis: (proposalId: string) => void
  onChangeStatus: (proposalId: string, status: ProposalStatus) => Promise<void>
  onNegotiate: (proposalId: string) => Promise<void>
}) {
  if (!proposal) {
    return <State title="Nenhuma proposta recebida" description="Não há proposta real para mostrar neste filtro." />
  }

  const mediaCount = proposal.media.length
  const customerName = proposal.customer?.fullName ?? proposal.guestName ?? 'Cliente'
  const whatsappUrl = proposal.guestWhatsapp ? getWhatsAppUrl(proposal.guestWhatsapp) : null

  return (
    <section className="acc-surface p-5">
      <div className="flex flex-col gap-3 border-b border-[rgba(120,140,255,0.14)] pb-5 md:flex-row md:items-start md:justify-between">
        <ProposalStatusBadge status={proposal.status} />
        <div className="text-sm leading-6 text-slate-400 md:text-right">
          <p>Proposta recebida em {formatDateTime(proposal.createdAt)}</p>
          {proposal.proposalCode ? <p>Codigo da proposta: {proposal.proposalCode}</p> : null}
        </div>
      </div>

      <h2 className="mt-5 text-2xl font-black text-white">{proposal.proposalTitle}</h2>

      <div className="mt-5 grid gap-3 border-b border-[rgba(120,140,255,0.14)] pb-5 md:grid-cols-4">
        <InfoBlock icon={UserRound} label="Cliente" value={customerName} />
        {proposal.guestWhatsapp ? <InfoBlock label="WhatsApp" value={formatWhatsAppDisplay(proposal.guestWhatsapp)} /> : null}
        {proposal.guestEmail ? <InfoBlock label="E-mail" value={proposal.guestEmail} /> : null}
        <InfoBlock label="Jogo" value={proposal.gameName} />
        <InfoBlock label="Categoria" value={proposal.category} />
        <InfoBlock label="Preço desejado" value={formatBRL(proposal.desiredPrice)} highlight />
      </div>

      <section className="mt-5 border-b border-[rgba(120,140,255,0.14)] pb-5">
        <h3 className="text-sm font-black text-white">Descrição informada pelo cliente</h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">{proposal.description}</p>
      </section>

      <section className="mt-5 border-b border-[rgba(120,140,255,0.14)] pb-5">
        <h3 className="text-sm font-black text-white">Mídias enviadas ({mediaCount})</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {proposal.media.map((item) => (
            <img key={item.id} src={item.url} alt="Mídia enviada" className="aspect-video rounded-lg border border-white/10 object-cover" />
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-black text-white">Resumo da negociação</h3>
        <div className="mt-3">
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <SummaryPair label="Preço desejado" value={formatBRL(proposal.desiredPrice)} />
            <SummaryPair label="Status atual" value={proposalStatusLabels[proposal.status]} />
            <SummaryPair label="Oferta da ACCSTORE" value={proposal.adminOfferPrice ? formatBRL(proposal.adminOfferPrice) : 'Não enviada'} />
            <SummaryPair label="Atualizada em" value={formatDateTime(proposal.updatedAt ?? proposal.createdAt)} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <button type="button" onClick={() => onOpenAnalysis(proposal.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/56 px-4 text-sm font-black text-white transition hover:border-blue-400/45">
            <Eye aria-hidden="true" className="size-4" />
            Ver detalhes
          </button>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-400/24 bg-emerald-500/10 px-4 text-sm font-black text-emerald-100 transition hover:border-emerald-300"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              Chamar no WhatsApp
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          ) : null}
          {!proposal.isGuest ? (
            <button
              type="button"
              onClick={() => void onNegotiate(proposal.id)}
              disabled={!canNegotiate || negotiating}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1463FF] px-4 text-sm font-black text-white transition hover:bg-[#1D74FF] disabled:cursor-not-allowed disabled:opacity-55"
              title={canNegotiate ? 'Negociar com o cliente' : 'Apenas vendedores e administradores podem negociar'}
            >
              <Handshake aria-hidden="true" className="size-4" />
              {negotiating ? 'Abrindo...' : 'Negociar'}
            </button>
          ) : null}
          <button type="button" onClick={() => void onChangeStatus(proposal.id, 'rejected')} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-400/40 px-4 text-sm font-black text-rose-200 transition hover:bg-rose-500/10">
            Recusar
          </button>
        </div>
      </section>
    </section>
  )
}

function ProposalStatsCard({ proposals }: { proposals: SellProposal[] }) {
  const stats = [
    ['Propostas recebidas', proposals.length, 'text-blue-300'],
    ['Pendentes', proposals.filter((item) => item.status === 'pending_analysis').length, 'text-amber-300'],
    ['Em revisão', proposals.filter((item) => item.status === 'under_review').length, 'text-blue-300'],
    ['Em negociação', proposals.filter((item) => item.status === 'negotiating').length, 'text-violet-300'],
    ['Compradas', proposals.filter((item) => item.status === 'purchased').length, 'text-emerald-300'],
    ['Recusadas', proposals.filter((item) => item.status === 'rejected').length, 'text-rose-300'],
  ] as const

  return (
    <SideCard title="Visão geral">
      <div className="grid grid-cols-2 gap-3">
        {stats.map(([label, value, tone]) => (
          <div key={label} className="rounded-lg border border-[rgba(120,140,255,0.14)] bg-[#101827]/48 p-3">
            <p className={cn('text-2xl font-black', tone)}>{value}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">{label}</p>
          </div>
        ))}
      </div>
    </SideCard>
  )
}

function ProposalQuickFilters({ proposals, activeFilter, onFilterChange }: { proposals: SellProposal[]; activeFilter: ProposalStatus | 'all'; onFilterChange: (filter: ProposalStatus | 'all') => void }) {
  return (
    <SideCard title="Filtros rápidos">
      <div className="space-y-2">
        {statusOrder.map((filter) => {
          const active = activeFilter === filter
          const count = filter === 'all' ? proposals.length : proposals.filter((item) => item.status === filter).length
          return (
            <button key={filter} type="button" onClick={() => onFilterChange(filter)} className={cn('flex min-h-8 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm transition', active ? 'bg-[#1463FF]/16 text-white' : 'text-slate-300 hover:bg-white/[0.05]')}>
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-400" />
                {statusFilterLabel[filter]}
              </span>
              <span className="font-black">{count}</span>
            </button>
          )
        })}
      </div>
    </SideCard>
  )
}

function NextStepsCard() {
  return (
    <SideCard title="Próximos passos">
      {['Analise as informações e mídias', 'Avalie o valor e risco da operação', 'Inicie ou responda a negociação com o cliente', 'Finalize a compra ou recuse a proposta'].map((step) => (
        <div key={step} className="flex items-center gap-3 py-2 text-sm leading-6 text-slate-300">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
          {step}
        </div>
      ))}
    </SideCard>
  )
}

export function ProposalStatusBadge({ status, compact = false }: { status: ProposalStatus; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-lg border font-black', compact ? 'min-h-7 px-2.5 text-[11px]' : 'min-h-8 px-3 text-xs', proposalStatusStyles[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {proposalStatusLabels[status]}
    </span>
  )
}

function InfoBlock({ label, value, helper, highlight, icon: Icon }: { label: string; value: string; helper?: string; highlight?: boolean; icon?: LucideIcon }) {
  return (
    <div className="min-w-0 rounded-lg border border-[rgba(120,140,255,0.12)] bg-[#101827]/38 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <div className="mt-2 flex min-w-0 items-center gap-2">
        {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-slate-400" /> : null}
        <p className={cn('truncate text-sm font-black text-white', highlight && 'text-emerald-300')}>{value}</p>
      </div>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  )
}

function SummaryPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  )
}

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="acc-surface p-4">
      <h2 className="mb-4 text-base font-black text-white">{title}</h2>
      {children}
    </section>
  )
}

function State({ title, description, compact }: { title: string; description?: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 text-center', compact ? 'min-h-52' : 'min-h-72 rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/70')}>
      <Search aria-hidden="true" className="mb-3 size-9 text-slate-600" />
      <h2 className="text-lg font-black text-white">{title}</h2>
      {description ? <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  )
}
