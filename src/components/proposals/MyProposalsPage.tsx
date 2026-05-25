import { Eye, FileText, Headphones, ImageIcon, MessageCircle, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatBRL, formatDateTime } from '../../lib/format'
import { cn } from '../../lib/utils'
import { createSupportConversationForCurrentUser } from '../../services/messagesService'
import { getMySellProposals } from '../../services/proposalsService'
import { getOpenSupportTicketForProposal } from '../../services/supportService'
import type { SellProposal } from '../../services/types'

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  pending: 'Em análise',
  pending_analysis: 'Em análise',
  under_review: 'Em revisão',
  negotiating: 'Em negociação',
  counter_offer_sent: 'Oferta enviada',
  approved: 'Aprovada',
  approved_for_purchase: 'Aprovada',
  purchased: 'Comprada',
  rejected: 'Recusada',
  cancelled: 'Cancelada',
}

const statusStyles: Record<string, string> = {
  draft: 'border-slate-400/18 bg-slate-500/12 text-slate-300',
  pending: 'border-amber-400/22 bg-amber-500/12 text-amber-300',
  pending_analysis: 'border-amber-400/22 bg-amber-500/12 text-amber-300',
  under_review: 'border-blue-400/24 bg-blue-500/12 text-blue-300',
  negotiating: 'border-violet-400/24 bg-violet-500/12 text-violet-300',
  counter_offer_sent: 'border-cyan-400/22 bg-cyan-500/12 text-cyan-300',
  approved: 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300',
  approved_for_purchase: 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300',
  purchased: 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300',
  rejected: 'border-rose-400/22 bg-rose-500/12 text-rose-300',
  cancelled: 'border-rose-400/22 bg-rose-500/12 text-rose-300',
}

export function MyProposalsPage() {
  const navigate = useNavigate()
  const [proposals, setProposals] = useState<SellProposal[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingConversationId, setStartingConversationId] = useState<string | null>(null)
  const [supportProposalId, setSupportProposalId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contactError, setContactError] = useState<string | null>(null)
  const [supportError, setSupportError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getMySellProposals()
        if (active) {
          setProposals(data)
          setExpandedId((current) => current ?? data[0]?.id ?? null)
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar suas propostas agora.')
          setProposals([])
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

  const startConversation = async (proposal: SellProposal) => {
    setStartingConversationId(proposal.id)
    setContactError(null)

    try {
      await createSupportConversationForCurrentUser(proposal.assignedAdminId)
      navigate('/mensagens')
    } catch {
      setContactError('Não foi possível iniciar a conversa agora.')
    } finally {
      setStartingConversationId(null)
    }
  }

  const requestSupport = async (proposal: SellProposal) => {
    setSupportProposalId(proposal.id)
    setSupportError(null)

    try {
      const ticket = await getOpenSupportTicketForProposal(proposal.id)
      navigate(ticket ? `/suporte/${ticket.id}` : `/suporte/novo?proposalId=${proposal.id}`)
    } catch {
      setSupportError('Não foi possível abrir o suporte desta proposta agora.')
    } finally {
      setSupportProposalId(null)
    }
  }

  return (
    <section className="space-y-4">
      <header className="acc-surface p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-200">
              <FileText aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-blue-300">Contas em análise</p>
              <h1 className="text-2xl font-black text-white sm:text-3xl">Minhas propostas</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Acompanhe as contas enviadas para análise.</p>
            </div>
          </div>
          <Link
            to="/vender-conta"
            className="acc-button-primary inline-flex min-h-11 w-fit items-center justify-center gap-2 px-4 text-sm font-black transition"
          >
            <Send aria-hidden="true" className="size-4" />
            Enviar proposta
          </Link>
        </div>
      </header>

      {loading ? <State title="Carregando propostas..." /> : null}
      {!loading && error ? <State title={error} /> : null}
      {!loading && !error && contactError ? (
        <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
          {contactError}
        </p>
      ) : null}
      {!loading && !error && supportError ? (
        <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
          {supportError}
        </p>
      ) : null}
      {!loading && !error && proposals.length === 0 ? <EmptyProposals /> : null}

      {!loading && !error && proposals.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3">
            {proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                expanded={expandedId === proposal.id}
                startingConversation={startingConversationId === proposal.id}
                requestingSupport={supportProposalId === proposal.id}
                onToggle={() => setExpandedId((current) => (current === proposal.id ? null : proposal.id))}
                onStartConversation={() => void startConversation(proposal)}
                onRequestSupport={() => void requestSupport(proposal)}
              />
            ))}
          </div>
          <SummaryPanel proposals={proposals} />
        </div>
      ) : null}
    </section>
  )
}

function ProposalCard({
  proposal,
  expanded,
  startingConversation,
  requestingSupport,
  onToggle,
  onStartConversation,
  onRequestSupport,
}: {
  proposal: SellProposal
  expanded: boolean
  startingConversation: boolean
  requestingSupport: boolean
  onToggle: () => void
  onStartConversation: () => void
  onRequestSupport: () => void
}) {
  const cover = proposal.media.find((item) => item.isCover) ?? proposal.media[0]

  return (
    <article className="acc-surface overflow-hidden">
      <div className="grid gap-4 p-4 md:grid-cols-[132px_minmax(0,1fr)_auto] md:items-start">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#101827]">
          {cover ? (
            cover.type === 'video' ? (
              <video src={cover.url} className="aspect-video w-full object-cover md:aspect-square" muted />
            ) : (
              <img src={cover.url} alt="Mídia da proposta" className="aspect-video w-full object-cover md:aspect-square" />
            )
          ) : (
            <div className="flex aspect-video w-full items-center justify-center md:aspect-square">
              <ImageIcon aria-hidden="true" className="size-8 text-slate-600" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={proposal.status} />
            <span className="text-xs font-semibold text-slate-500">{proposal.proposalCode || proposal.id}</span>
          </div>
          <h2 className="mt-3 text-xl font-black text-white">{proposal.proposalTitle}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-400">{proposal.gameName}</p>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <Info label="Preço pretendido" value={formatBRL(proposal.desiredPrice)} />
            <Info label="Enviada em" value={formatDateTime(proposal.createdAt)} />
            <Info label="Mídias" value={`${proposal.media.length} arquivo(s)`} />
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-400/28 bg-blue-500/10 px-4 text-sm font-black text-blue-100 transition hover:border-blue-300"
        >
          <Eye aria-hidden="true" className="size-4" />
          Ver detalhes
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-[rgba(120,140,255,0.14)] p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Descrição enviada</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{proposal.description}</p>
            </div>
            <div className="grid gap-3">
              <Info label="Status da análise" value={statusLabels[proposal.status] ?? proposal.status} />
              <Info label="Região" value={proposal.region ?? 'Não informada'} />
              <Info label="Oferta da ACCSTORE" value={proposal.adminOfferPrice ? formatBRL(proposal.adminOfferPrice) : 'Ainda não enviada'} />
              <button
                type="button"
                onClick={onStartConversation}
                disabled={startingConversation}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-400/28 bg-blue-500/10 px-3 text-sm font-black text-blue-100 transition hover:border-blue-300 disabled:opacity-60"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                {startingConversation ? 'Abrindo...' : 'Falar com ACCSTORE'}
              </button>
              <button
                type="button"
                onClick={onRequestSupport}
                disabled={requestingSupport}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-400/28 bg-blue-500/10 px-3 text-sm font-black text-blue-100 transition hover:border-blue-300 disabled:opacity-60"
              >
                <Headphones aria-hidden="true" className="size-4" />
                {requestingSupport ? 'Abrindo...' : 'Solicitar suporte'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function SummaryPanel({ proposals }: { proposals: SellProposal[] }) {
  const pendingCount = proposals.filter((item) => ['pending', 'pending_analysis', 'under_review'].includes(item.status)).length
  const approvedCount = proposals.filter((item) => ['approved', 'approved_for_purchase', 'purchased'].includes(item.status)).length

  return (
    <aside className="space-y-4">
      <section className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-5">
        <h2 className="text-base font-black text-white">Resumo</h2>
        <div className="mt-4 grid gap-3">
          <Metric value={String(proposals.length)} label="Propostas enviadas" />
          <Metric value={String(pendingCount)} label="Em análise" />
          <Metric value={String(approvedCount)} label="Aprovadas" />
        </div>
      </section>
    </aside>
  )
}

function EmptyProposals() {
  return (
    <section className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(120,140,255,0.22)] bg-[#0B1222]/78 p-8 text-center">
      <FileText aria-hidden="true" className="mb-4 size-11 text-slate-600" />
      <h2 className="text-2xl font-black text-white">Nenhuma proposta enviada</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        Quando você enviar uma conta para análise da ACCSTORE, ela aparecerá aqui.
      </p>
      <Link
        to="/vender-conta"
        className="acc-button-primary mt-6 inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-black transition"
      >
        <Send aria-hidden="true" className="size-4" />
        Enviar proposta
      </Link>
    </section>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex min-h-8 items-center rounded-lg border px-3 text-xs font-black', statusStyles[status] ?? statusStyles.pending)}>
      {statusLabels[status] ?? status}
    </span>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-[rgba(120,140,255,0.14)] bg-[#101827]/48 p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-400">{label}</p>
    </div>
  )
}

function State({ title }: { title: string }) {
  return (
    <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/70 p-8 text-center">
      <FileText aria-hidden="true" className="mb-4 size-10 text-slate-600" />
      <h2 className="text-xl font-black text-white">{title}</h2>
    </section>
  )
}
