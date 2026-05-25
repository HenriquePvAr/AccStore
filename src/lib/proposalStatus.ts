import type { ProposalStatus } from '../services/types'

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  draft: 'Rascunho',
  pending_analysis: 'Em análise',
  under_review: 'Em revisão',
  negotiating: 'Em negociação',
  counter_offer_sent: 'Proposta enviada',
  approved_for_purchase: 'Aprovada',
  purchased: 'Comprada',
  rejected: 'Recusada',
}

export const proposalStatusStyles: Record<ProposalStatus, string> = {
  draft: 'border-slate-400/18 bg-slate-500/12 text-slate-300',
  pending_analysis: 'border-amber-400/22 bg-amber-500/12 text-amber-300',
  under_review: 'border-blue-400/24 bg-blue-500/12 text-blue-300',
  negotiating: 'border-violet-400/24 bg-violet-500/12 text-violet-300',
  counter_offer_sent: 'border-cyan-400/22 bg-cyan-500/12 text-cyan-300',
  approved_for_purchase: 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300',
  purchased: 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300',
  rejected: 'border-rose-400/22 bg-rose-500/12 text-rose-300',
}
