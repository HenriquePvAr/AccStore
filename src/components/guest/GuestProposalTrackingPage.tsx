import { Clock3, FileText, RefreshCcw, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatBRL, formatDateTime } from '../../lib/format'
import { proposalStatusLabels, proposalStatusStyles } from '../../lib/proposalStatus'
import { cn } from '../../lib/utils'
import { getGuestSellProposalByToken } from '../../services/proposalsService'
import type { SellProposal } from '../../services/types'

interface GuestProposalTrackingPageProps {
  token: string | null
}

export function GuestProposalTrackingPage({ token }: GuestProposalTrackingPageProps) {
  const [proposal, setProposal] = useState<SellProposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProposal = useCallback(async () => {
    if (!token) {
      setError('Link de acompanhamento inválido.')
      setLoading(false)
      return
    }

    setError(null)
    setProposal(await getGuestSellProposalByToken(token))
  }, [token])

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        await loadProposal()
      } catch {
        if (active) {
          setError('Proposta não encontrada ou link expirado.')
          setProposal(null)
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
  }, [loadProposal])

  const refresh = async () => {
    setRefreshing(true)
    try {
      await loadProposal()
    } catch {
      setError('Não foi possível atualizar a proposta agora.')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return <TrackingState title="Carregando proposta..." />
  }

  if (error && !proposal) {
    return <TrackingState title="Não foi possível abrir esta proposta" description={error} />
  }

  if (!proposal) {
    return <TrackingState title="Proposta não encontrada" description="Confira se o link está completo." />
  }

  const cover = proposal.media.find((item) => item.isCover) ?? proposal.media[0]

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="acc-surface p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-200">
              <FileText aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">Acompanhar proposta</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Guarde este link para acompanhar sua proposta.</p>
            </div>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={refreshing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white transition hover:border-blue-400/40 disabled:opacity-60">
            <RefreshCcw aria-hidden="true" className="size-4" />
            {refreshing ? 'Atualizando...' : 'Atualizar status'}
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="acc-surface p-5">
          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
            {cover ? (
              cover.type === 'video' ? (
                <video src={cover.url} className="aspect-video w-full rounded-lg border border-white/10 object-cover md:aspect-square" muted playsInline preload="metadata" />
              ) : (
                <img src={cover.url} alt="Mídia enviada" className="aspect-video w-full rounded-lg border border-white/10 object-cover md:aspect-square" />
              )
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-white/10 bg-[#101827] md:aspect-square">
                <FileText aria-hidden="true" className="size-9 text-slate-600" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-300">Proposta {proposal.proposalCode}</p>
              <h2 className="mt-2 text-2xl font-black text-white">{proposal.proposalTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{proposal.description}</p>
              <p className="mt-4 text-3xl font-black text-white">{formatBRL(proposal.desiredPrice)}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">Enviada em {formatDateTime(proposal.createdAt)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoCard label="Status" value={proposalStatusLabels[proposal.status]} status={proposal.status} />
            <InfoCard label="Jogo" value={proposal.gameName} />
            <InfoCard label="Região / servidor" value={proposal.region || 'Não informado'} />
          </div>

          {proposal.additionalInfo ? (
            <div className="mt-5 rounded-lg border border-[rgba(120,140,255,0.12)] bg-[#070B16]/38 p-4">
              <p className="text-xs font-bold text-slate-500">Observações</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{proposal.additionalInfo}</p>
            </div>
          ) : null}

          {proposal.adminOfferPrice ? (
            <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-xs font-bold text-emerald-200">Oferta da ACCSTORE</p>
              <p className="mt-1 text-2xl font-black text-white">{formatBRL(proposal.adminOfferPrice)}</p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="acc-safe-panel p-5">
            <div className="flex items-start gap-3">
              <Clock3 aria-hidden="true" className="mt-1 size-6 shrink-0 text-blue-300" />
              <div>
                <h2 className="text-lg font-black text-white">Andamento</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">A equipe ACCSTORE analisa as informações e entra em contato pelo WhatsApp informado quando precisar.</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-5">
            <div className="flex gap-3">
              <ShieldCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-emerald-300" />
              <p className="text-sm leading-6 text-slate-300">Dados sensíveis da conta não são exibidos em telas públicas.</p>
            </div>
          </section>
        </aside>
      </div>

      <Link to="/vender-conta" className="inline-flex text-sm font-black text-blue-300 transition hover:text-white">
        Enviar outra proposta
      </Link>
    </section>
  )
}

function InfoCard({ label, value, status }: { label: string; value: string; status?: SellProposal['status'] }) {
  return (
    <div className="rounded-lg border border-[rgba(120,140,255,0.12)] bg-[#070B16]/38 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      {status ? (
        <span className={cn('mt-2 inline-flex rounded-lg border px-2.5 py-1 text-xs font-black', proposalStatusStyles[status])}>{value}</span>
      ) : (
        <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
      )}
    </div>
  )
}

function TrackingState({ title, description }: { title: string; description?: string }) {
  return (
    <section className="mx-auto flex min-h-72 max-w-3xl flex-col items-center justify-center rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-8 text-center">
      <FileText aria-hidden="true" className="mb-3 size-10 text-slate-600" />
      <h1 className="text-xl font-black text-white">{title}</h1>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p> : null}
    </section>
  )
}
