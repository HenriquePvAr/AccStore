import { ArrowLeft, Ban, CheckCircle2, Clock3, Eye, Handshake, LockKeyhole, Send, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { formatBRL, formatDateTime } from '../../lib/format'
import { cn } from '../../lib/utils'
import { startProposalConversation } from '../../services/messagesService'
import {
  approvePurchase,
  getReceivedSellProposals,
  getSellProposalById,
  rejectProposal,
  sendCounterOffer,
  updateProposalNotes,
  updateSellProposalStatus,
} from '../../services/proposalsService'
import type { SellProposal } from '../../services/types'
import { ProposalStatusBadge } from './ReceivedProposalsPage'

interface ProposalAnalysisPageProps {
  proposalId?: string | null
  onBack: () => void
}

export function ProposalAnalysisPage({ proposalId, onBack }: ProposalAnalysisPageProps) {
  const [proposals, setProposals] = useState<SellProposal[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(proposalId ?? null)
  const [proposal, setProposal] = useState<SellProposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const list = await getReceivedSellProposals()
      setProposals(list)
      const id = selectedId ?? list[0]?.id
      setSelectedId(id ?? null)
      setProposal(id ? await getSellProposalById(id) : null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erro ao carregar proposta.')
      setProposal(null)
      setProposals([])
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    let active = true

    queueMicrotask(() => {
      if (active) {
        void load()
      }
    })

    return () => {
      active = false
    }
  }, [load])

  if (loading) {
    return <State title="Carregando análise da proposta..." />
  }

  if (error) {
    return <State title="Erro ao carregar dados. Tente novamente." description={error} />
  }

  if (!proposal) {
    return <State title="Nenhuma proposta recebida" description="Selecione uma proposta recebida para analisar." />
  }

  return (
    <section className="grid gap-4 2xl:grid-cols-[300px_minmax(0,1fr)_360px]">
      <AnalysisProposalList proposals={proposals} selectedId={proposal.id} onSelect={setSelectedId} />

      <main className="space-y-4">
        <ProposalAnalysisHeader proposal={proposal} onBack={onBack} />
        <ProposalDetailsCard proposal={proposal} />
        <ProposalCredentialsCard proposal={proposal} />
        <ProposalMediaGallery proposal={proposal} />
        <ProposalVerificationChecklist />
      </main>

      <aside className="space-y-4">
        <ProposalNegotiationCard key={proposal.id} proposal={proposal} onChanged={() => void load()} />
        <ProposalNotesCard proposal={proposal} onChanged={() => void load()} />
        <ProposalHistoryTimeline proposal={proposal} />
      </aside>
    </section>
  )
}

function AnalysisProposalList({ proposals, selectedId, onSelect }: { proposals: SellProposal[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <aside className="overflow-hidden rounded-xl border border-[rgba(120,140,255,0.18)] bg-[linear-gradient(135deg,rgba(11,18,34,0.94),rgba(7,11,22,0.9))] shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
      <div className="border-b border-[rgba(120,140,255,0.14)] p-4">
        <h2 className="text-base font-black text-white">Propostas recebidas</h2>
      </div>

      <div className="max-h-[760px] overflow-y-auto">
        {proposals.map((item) => {
          const cover = item.media.find((media) => media.isCover) ?? item.media[0]
          const selected = item.id === selectedId
          return (
            <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={cn('flex w-full gap-3 border-b border-[rgba(120,140,255,0.12)] p-3 text-left transition hover:bg-[#101827]/68', selected && 'border-l-2 border-l-[#1463FF] bg-[#0A2B66]/58')}>
              {cover ? <img src={cover.url} alt="" className="size-16 rounded-lg border border-white/10 object-cover" /> : <div className="size-16 rounded-lg border border-white/10 bg-[#101827]" />}
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-black text-white">{item.proposalCode || item.id}</span>
                  <ProposalStatusBadge status={item.status} compact />
                </span>
                <span className="mt-1 block truncate text-sm font-semibold text-slate-300">{item.customer?.fullName ?? 'Cliente'}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.gameName} · {formatDateTime(item.createdAt)}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="border-t border-[rgba(120,140,255,0.14)] p-4 text-sm font-medium text-slate-400">
        {proposals.length} proposta(s)
      </div>
    </aside>
  )
}

function ProposalAnalysisHeader({ proposal, onBack }: { proposal: SellProposal; onBack: () => void }) {
  const cover = proposal.media.find((item) => item.isCover) ?? proposal.media[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="inline-flex size-10 items-center justify-center rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/62 text-slate-300 transition hover:border-blue-400/45 hover:text-white" title="Voltar">
          <ArrowLeft aria-hidden="true" className="size-5" />
        </button>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Análise da proposta</h1>
      </div>

      <section className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[linear-gradient(135deg,rgba(11,18,34,0.94),rgba(7,11,22,0.9))] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
        <div className="grid gap-4 md:grid-cols-[90px_minmax(0,1fr)]">
          {cover ? <img src={cover.url} alt="Capa da proposta" className="size-20 rounded-lg border border-white/10 object-cover" /> : <div className="size-20 rounded-lg border border-white/10 bg-[#101827]" />}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-black text-white">{proposal.proposalCode || proposal.id}</h2>
              <ProposalStatusBadge status={proposal.status} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <HeaderMetric label="Cliente" value={proposal.customer?.fullName ?? 'Cliente'} />
              <HeaderMetric label="Jogo" value={proposal.gameName} />
              <HeaderMetric label="Valor desejado" value={formatBRL(proposal.desiredPrice)} />
              <HeaderMetric label="Recebida em" value={formatDateTime(proposal.createdAt)} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ProposalDetailsCard({ proposal }: { proposal: SellProposal }) {
  return (
    <AnalysisCard title="1. Informações principais">
      <InfoTable
        rows={[
          ['Jogo', proposal.gameName],
          ['Título da conta', proposal.proposalTitle],
          ['Categoria', proposal.category],
          ['Plataforma', proposal.platform ?? 'Não informada'],
          ['Valor desejado', formatBRL(proposal.desiredPrice)],
          ['Descrição da conta', proposal.description],
          ['Observações adicionais', proposal.additionalInfo ?? 'Nenhuma observação adicional.'],
        ]}
      />
    </AnalysisCard>
  )
}

function ProposalCredentialsCard({ proposal }: { proposal: SellProposal }) {
  return (
    <AnalysisCard title="2. Dados de acesso">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-2">
          <CredentialLine label="Login da conta" value={proposal.login ?? 'Envio após aprovação'} visible={Boolean(proposal.login)} />
          <CredentialLine label="E-mail vinculado" value={proposal.linkedEmail ?? 'Não informado'} visible={Boolean(proposal.linkedEmail)} />
          <CredentialLine label="Senha da conta" value={proposal.password ? '****************' : 'Não informada'} visible={false} />
        </div>
        <div className="space-y-3">
          <StatusLine label="2FA" value={proposal.has2FA ?? 'Não sei informar'} tone="blue" />
          <StatusLine label="Região" value={proposal.region ?? 'Não informada'} tone="green" />
        </div>
      </div>
    </AnalysisCard>
  )
}

function ProposalMediaGallery({ proposal }: { proposal: SellProposal }) {
  return (
    <AnalysisCard title="3. Mídias enviadas pelo cliente">
      {proposal.media.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {proposal.media.map((item) => (
            <div key={item.id} className="relative overflow-hidden rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]">
              {item.type === 'video' ? <video src={item.url} className="aspect-video w-full object-cover" controls /> : <img src={item.url} alt="Mídia enviada pelo cliente" className="aspect-video w-full object-cover" />}
              {item.isCover ? <span className="absolute left-2 top-2 rounded-md bg-[#1463FF] px-2 py-1 text-[11px] font-black text-white">Capa</span> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Nenhuma mídia enviada.</p>
      )}
    </AnalysisCard>
  )
}

function ProposalVerificationChecklist() {
  return (
    <AnalysisCard title="4. Verificações da equipe">
      <div className="grid gap-3 md:grid-cols-2">
        {['Acesso ao login verificado', 'E-mail acessível e confirmado', '2FA verificado', 'Itens e recursos conferidos', 'Histórico de punições limpo', 'Propriedade da conta em análise'].map((label) => (
          <div key={label} className="flex min-h-11 items-center gap-3 rounded-lg border border-[rgba(120,140,255,0.12)] bg-[#101827]/44 px-3 text-sm font-semibold text-slate-200">
            <Clock3 aria-hidden="true" className="size-4 shrink-0 text-amber-300" />
            {label}
          </div>
        ))}
      </div>
    </AnalysisCard>
  )
}

function ProposalNegotiationCard({ proposal, onChanged }: { proposal: SellProposal; onChanged: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [offer, setOffer] = useState(proposal.adminOfferPrice?.toString() ?? '')
  const [notes, setNotes] = useState(proposal.internalNotes ?? '')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const run = async (action: 'counter' | 'approve' | 'reject' | 'review' | 'negotiate') => {
    setBusy(true)
    setNotice(null)
    try {
      if (action === 'negotiate') {
        const conversation = await startProposalConversation(proposal.id)
        onChanged()
        navigate(`/mensagens?conversationId=${conversation.id}`)
        return
      }
      if (action === 'counter') {
        await sendCounterOffer(proposal.id, {
          adminOfferPrice: Number(offer.replace(',', '.')),
          internalNotes: notes,
          actorId: user?.id,
        })
      }
      if (action === 'approve') await approvePurchase(proposal.id)
      if (action === 'reject') await rejectProposal(proposal.id)
      if (action === 'review') {
        await updateSellProposalStatus(proposal.id, {
          status: 'under_review',
          internalNotes: notes,
          actorId: user?.id,
          historyAction: 'under_review',
          historyNote: 'Proposta colocada em revisão.',
        })
      }
      onChanged()
    } catch {
      setNotice('Não foi possível concluir a ação agora.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SideCard title="Negociação">
      <div className="space-y-4">
        <DetailPair label="Valor pedido" value={formatBRL(proposal.desiredPrice)} />
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Oferta da ACCSTORE</span>
          <input value={offer} onChange={(event) => setOffer(event.target.value)} placeholder="0,00" className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827] px-3 text-right text-sm font-black text-white outline-none focus:border-blue-400/55" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Notas internas</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full resize-none rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/70 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-blue-400/55" />
        </label>
        <DetailPair label="Última atualização" value={formatDateTime(proposal.updatedAt ?? proposal.createdAt)} />
        {notice ? <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200">{notice}</p> : null}
        <div className="space-y-2 pt-2">
          <ActionButton icon={ShoppingBag} label="Aprovar compra" primary disabled={busy} onClick={() => void run('approve')} />
          <ActionButton icon={Clock3} label="Colocar em revisão" disabled={busy} onClick={() => void run('review')} />
          <ActionButton icon={Handshake} label="Negociar" disabled={busy} onClick={() => void run('negotiate')} />
          <ActionButton icon={Send} label="Enviar contraproposta" disabled={busy} onClick={() => void run('counter')} />
          <ActionButton icon={Ban} label="Recusar proposta" danger disabled={busy} onClick={() => void run('reject')} />
        </div>
      </div>
    </SideCard>
  )
}

function ProposalNotesCard({ proposal, onChanged }: { proposal: SellProposal; onChanged: () => void }) {
  const [notes, setNotes] = useState(proposal.internalNotes ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await updateProposalNotes(proposal.id, notes)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  return (
    <SideCard title="Observações internas">
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} placeholder="Adicione observações internas sobre esta proposta..." className="w-full resize-none rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/70 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-blue-400/55" />
      <p className="mt-2 text-xs text-slate-500">Visível apenas para a equipe</p>
      <button type="button" onClick={() => void save()} disabled={saving} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/56 text-sm font-black text-slate-200 transition hover:border-blue-400/45 disabled:opacity-60">
        {saving ? 'Salvando...' : 'Salvar observação'}
      </button>
    </SideCard>
  )
}

function ProposalHistoryTimeline({ proposal }: { proposal: SellProposal }) {
  const events = [
    ['Proposta recebida', `Cliente enviou a proposta ${proposal.proposalCode || proposal.id}.`, formatDateTime(proposal.createdAt)],
    ['Status atual', proposal.status, formatDateTime(proposal.updatedAt ?? proposal.createdAt)],
  ]

  return (
    <SideCard title="Histórico da negociação">
      <div className="relative space-y-5 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-[rgba(120,140,255,0.24)]">
        {events.map(([title, body, time], index) => (
          <div key={title} className="relative flex gap-3">
            <span className={cn('relative z-10 mt-1 size-3.5 rounded-full border', index === 1 ? 'border-blue-300 bg-[#1463FF]' : 'border-slate-500 bg-[#101827]')} />
            <span>
              <span className="block text-xs font-medium text-slate-500">{time}</span>
              <span className="mt-1 block text-sm font-black text-white">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{body}</span>
            </span>
          </div>
        ))}
      </div>
    </SideCard>
  )
}

function AnalysisCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-[rgba(120,140,255,0.18)] bg-[linear-gradient(135deg,rgba(11,18,34,0.94),rgba(7,11,22,0.9))] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.18)]">
      <h2 className="text-base font-black text-white">{title}</h2>
      {children}
    </section>
  )
}

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[linear-gradient(135deg,rgba(11,18,34,0.94),rgba(7,11,22,0.9))] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.18)]">
      <h2 className="mb-4 text-base font-black text-white">{title}</h2>
      {children}
    </section>
  )
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[rgba(120,140,255,0.14)] pl-3 first:border-l-0 first:pl-0">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function InfoTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[rgba(120,140,255,0.12)]">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-2 border-b border-[rgba(120,140,255,0.1)] px-3 py-3 last:border-b-0 md:grid-cols-[180px_1fr]">
          <span className="text-sm font-semibold text-slate-400">{label}</span>
          <span className="text-sm font-semibold leading-6 text-slate-200">{value}</span>
        </div>
      ))}
    </div>
  )
}

function CredentialLine({ label, value, visible }: { label: string; value: string; visible: boolean }) {
  return (
    <div className="grid gap-2 rounded-lg border border-[rgba(120,140,255,0.12)] bg-[#101827]/44 px-3 py-2 sm:grid-cols-[130px_1fr_auto] sm:items-center">
      <span className="text-sm font-semibold text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
      {visible ? <Eye aria-hidden="true" className="size-4 text-slate-500" /> : <LockKeyhole aria-hidden="true" className="size-4 text-slate-500" />}
    </div>
  )
}

function StatusLine({ label, value, tone }: { label: string; value: string; tone: 'green' | 'blue' }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(120,140,255,0.12)] bg-[#101827]/44 px-3 py-2">
      <span className="text-sm font-semibold text-slate-400">{label}</span>
      <span className={cn('rounded-md border px-2 py-1 text-xs font-black', tone === 'green' ? 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300' : 'border-blue-400/18 bg-blue-500/12 text-blue-300')}>
        {value}
      </span>
    </div>
  )
}

function DetailPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      <span className="text-sm font-black text-white">{value}</span>
    </div>
  )
}

function ActionButton({ icon: Icon, label, primary, danger, disabled, onClick }: { icon: LucideIcon; label: string; primary?: boolean; danger?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cn('inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition disabled:opacity-60', primary && 'border-blue-400/28 bg-[#1463FF] text-white hover:bg-[#1D74FF]', danger && 'border-rose-400/45 bg-transparent text-rose-300 hover:bg-rose-500/10', !primary && !danger && 'border-[rgba(120,140,255,0.18)] bg-[#101827]/56 text-white hover:border-blue-400/45')}>
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </button>
  )
}

function State({ title, description }: { title: string; description?: string }) {
  return (
    <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/70 p-8 text-center">
      <CheckCircle2 aria-hidden="true" className="mb-4 size-10 text-slate-500" />
      <h2 className="text-xl font-black text-white">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p> : null}
    </section>
  )
}
