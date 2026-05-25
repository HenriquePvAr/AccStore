import { requireSupabase } from '../lib/supabaseClient'
import { mapProfile, mapSellProposal, mapSellProposalMedia, toSellProposalRow } from './mappers'
import type { CounterOfferPayload, GuestSellProposalPayload, SellProposalPayload, ProposalStatus } from './types'
import { getCurrentUserProfile } from './usersService'

async function attachProposalRelations(rows: Record<string, unknown>[]) {
  const supabase = requireSupabase()
  const proposalIds = rows.map((row) => String(row.id))
  const customerIds = [
    ...new Set(rows.map((row) => row.customer_id).filter((value): value is string => typeof value === 'string' && value.length > 0)),
  ]

  const [mediaResult, customersResult] = await Promise.all([
    proposalIds.length
      ? supabase.from('sell_proposal_media').select('*').in('proposal_id', proposalIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    customerIds.length ? supabase.from('profiles').select('*').in('id', customerIds) : Promise.resolve({ data: [], error: null }),
  ])

  if (mediaResult.error) {
    throw mediaResult.error
  }

  if (customersResult.error) {
    throw customersResult.error
  }

  const media = (mediaResult.data ?? []).map(mapSellProposalMedia)
  const customers = new Map((customersResult.data ?? []).map((row) => [String(row.id), mapProfile(row)]))

  return rows.map((row) =>
    mapSellProposal(
      row,
      media.filter((item) => item.proposalId === String(row.id)),
      customers.get(String(row.customer_id)),
    ),
  )
}

export async function createSellProposal(payload: SellProposalPayload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('sell_proposals').insert(toSellProposalRow(payload)).select('*').single()

  if (error) {
    throw error
  }

  const [proposal] = await attachProposalRelations([data])
  return proposal
}

export async function createGuestSellProposal(payload: GuestSellProposalPayload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('create_guest_sell_proposal', {
    p_guest_name: payload.name.trim(),
    p_guest_whatsapp: payload.whatsapp.trim(),
    p_guest_email: payload.email?.trim() || null,
    p_game_name: payload.gameName.trim(),
    p_proposal_title: payload.proposalTitle.trim(),
    p_desired_price: payload.desiredPrice,
    p_description: payload.description.trim(),
    p_region: payload.region?.trim() || null,
    p_additional_info: payload.additionalInfo?.trim() || null,
  })

  if (error) {
    throw error
  }

  const [proposal] = await attachProposalRelations([data as Record<string, unknown>])
  return proposal
}

export async function saveGuestProposalMedia(token: string, media: Array<{ url: string; type: 'image' | 'video'; isCover?: boolean }>) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('save_guest_proposal_media', {
    p_token: token,
    p_media: media,
  })

  if (error) {
    throw error
  }

  return (data ?? []).map(mapSellProposalMedia)
}

export async function saveProposalMedia(proposalId: string, media: Array<{ url: string; type: 'image' | 'video'; isCover?: boolean }>) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('sell_proposal_media')
    .insert(
      media.map((item) => ({
        proposal_id: proposalId,
        url: item.url,
        type: item.type,
        is_cover: item.isCover ?? false,
      })),
    )
    .select('*')

  if (error) {
    throw error
  }

  return (data ?? []).map(mapSellProposalMedia)
}

export async function getUserSellProposals(userId: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('sell_proposals')
    .select('*')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachProposalRelations(data ?? [])
}

export async function getMySellProposals() {
  const supabase = requireSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!userData.user) {
    throw new Error('Usuário não autenticado.')
  }

  const { data, error } = await supabase
    .from('sell_proposals')
    .select('*')
    .eq('customer_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachProposalRelations(data ?? [])
}

export async function getAdminReceivedProposals() {
  return getReceivedSellProposals()
}

export async function getReceivedSellProposals() {
  const profile = await getCurrentUserProfile()

  if (profile?.role !== 'seller' && profile?.role !== 'admin') {
    throw new Error('Você não tem permissão para acessar estas propostas.')
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('sell_proposals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachProposalRelations(data ?? [])
}

export async function getProposalById(id: string) {
  return getSellProposalById(id)
}

export async function getSellProposalById(id: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('sell_proposals').select('*').eq('id', id).single()

  if (error) {
    throw error
  }

  const [proposal] = await attachProposalRelations([data])
  return proposal
}

export async function getGuestSellProposalByToken(token: string) {
  const supabase = requireSupabase()
  const [proposalResult, mediaResult] = await Promise.all([
    supabase.rpc('get_guest_sell_proposal_by_token', { p_token: token }),
    supabase.rpc('get_guest_sell_proposal_media_by_token', { p_token: token }),
  ])

  if (proposalResult.error) {
    throw proposalResult.error
  }

  if (mediaResult.error) {
    throw mediaResult.error
  }

  const rows = (proposalResult.data ?? []) as Record<string, unknown>[]

  if (rows.length === 0) {
    throw new Error('Proposta não encontrada ou link expirado.')
  }

  return mapSellProposal(rows[0], (mediaResult.data ?? []).map(mapSellProposalMedia))
}

export async function updateProposalStatus(id: string, status: ProposalStatus) {
  return updateSellProposalStatus(id, { status })
}

export async function updateSellProposalStatus(
  id: string,
  payload: {
    status?: ProposalStatus
    internalNotes?: string
    adminOfferPrice?: number
    actorId?: string
    historyAction?: string
    historyNote?: string
  },
) {
  const profile = await getCurrentUserProfile()

  if (profile?.role !== 'seller' && profile?.role !== 'admin') {
    throw new Error('Você não tem permissão para atualizar esta proposta.')
  }

  const updates: Record<string, string | number> = {
    updated_at: new Date().toISOString(),
  }

  if (payload.status !== undefined) {
    updates.status = payload.status
  }

  if (payload.internalNotes !== undefined) {
    updates.internal_notes = payload.internalNotes
  }

  if (payload.adminOfferPrice !== undefined) {
    updates.admin_offer_price = payload.adminOfferPrice
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('sell_proposals')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  if (payload.historyAction || payload.historyNote) {
    await supabase.from('proposal_history').insert({
      proposal_id: id,
      actor_id: payload.actorId ?? profile.id,
      action: payload.historyAction ?? payload.status ?? 'updated',
      note: payload.historyNote ?? null,
    })
  }

  const [proposal] = await attachProposalRelations([data])
  return proposal
}

export async function updateProposalNotes(id: string, internalNotes: string) {
  return updateSellProposalStatus(id, {
    internalNotes,
    historyAction: 'notes_updated',
    historyNote: 'Observação salva.',
  })
}

export async function sendCounterOffer(id: string, payload: CounterOfferPayload) {
  return updateSellProposalStatus(id, {
    status: 'counter_offer_sent',
    adminOfferPrice: payload.adminOfferPrice,
    internalNotes: payload.internalNotes,
    actorId: payload.actorId,
    historyAction: 'counter_offer_sent',
    historyNote: payload.note ?? `Contraproposta enviada: ${payload.adminOfferPrice}`,
  })
}

export async function approvePurchase(id: string) {
  return updateSellProposalStatus(id, {
    status: 'approved_for_purchase',
    historyAction: 'approved_for_purchase',
    historyNote: 'Proposta aprovada para compra.',
  })
}

export async function rejectProposal(id: string) {
  return updateSellProposalStatus(id, {
    status: 'rejected',
    historyAction: 'rejected',
    historyNote: 'Proposta recusada.',
  })
}
