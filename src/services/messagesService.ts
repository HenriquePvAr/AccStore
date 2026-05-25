import { requireSupabase } from '../lib/supabaseClient'
import { getAccountById } from './accountsService'
import { mapConversation, mapMessage, mapOrder, mapProfile, mapSellProposal } from './mappers'
import { getOrderById } from './ordersService'
import { getSellProposalById, updateSellProposalStatus } from './proposalsService'
import type { MessagePayload } from './types'
import { getCurrentUserProfile } from './usersService'

async function attachConversationRelations(rows: Record<string, unknown>[]) {
  const supabase = requireSupabase()
  const profileIds = [
    ...new Set(rows.flatMap((row) => [String(row.buyer_id), String(row.seller_id)]).filter(Boolean)),
  ]
  const orderIds = [...new Set(rows.map((row) => String(row.order_id || '')).filter(Boolean))]
  const proposalIds = [...new Set(rows.map((row) => String(row.proposal_id || '')).filter(Boolean))]

  const [profilesResult, ordersResult, proposalsResult] = await Promise.all([
    profileIds.length ? supabase.from('profiles_public').select('*').in('id', profileIds) : Promise.resolve({ data: [], error: null }),
    orderIds.length ? supabase.from('orders').select('*').in('id', orderIds) : Promise.resolve({ data: [], error: null }),
    proposalIds.length ? supabase.from('sell_proposals').select('*').in('id', proposalIds) : Promise.resolve({ data: [], error: null }),
  ])

  if (profilesResult.error) {
    throw profilesResult.error
  }
  if (ordersResult.error) {
    throw ordersResult.error
  }
  if (proposalsResult.error) {
    throw proposalsResult.error
  }

  const profiles = new Map((profilesResult.data ?? []).map((row) => [String(row.id), mapProfile(row)]))
  const orders = new Map((ordersResult.data ?? []).map((row) => [String(row.id), row]))
  const proposals = new Map((proposalsResult.data ?? []).map((row) => [String(row.id), row]))

  return Promise.all(
    rows.map(async (row) => {
      const orderRow = orders.get(String(row.order_id))
      const proposalRow = proposals.get(String(row.proposal_id))
      const accountId = String(row.account_id || orderRow?.account_id || '')
      const account = accountId ? await getAccountById(accountId).catch(() => undefined) : undefined
      const buyer = profiles.get(String(row.buyer_id))
      const seller = profiles.get(String(row.seller_id))
      const order = orderRow
        ? mapOrder(orderRow, account, profiles.get(String(orderRow.buyer_id)), profiles.get(String(orderRow.seller_id)))
        : undefined
      const proposal = proposalRow
        ? mapSellProposal(proposalRow, [], profiles.get(String(proposalRow.customer_id)))
        : undefined

      return mapConversation(row, account, buyer, seller, order, proposal)
    }),
  )
}

export async function getUserConversations(userId: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) {
    throw error
  }

  return attachConversationRelations(data ?? [])
}

export async function getAllConversations() {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) {
    throw error
  }

  return attachConversationRelations(data ?? [])
}

export async function getConversationById(id: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('conversations').select('*').eq('id', id).single()

  if (error) {
    throw error
  }

  const [conversation] = await attachConversationRelations([data])
  return conversation
}

export async function startProposalConversation(proposalId: string) {
  const supabase = requireSupabase()
  const profile = await getCurrentUserProfile()

  if (profile?.role !== 'seller' && profile?.role !== 'admin') {
    throw new Error('Você não tem permissão para iniciar esta negociação.')
  }

  const proposal = await getSellProposalById(proposalId)
  const existing = await supabase
    .from('conversations')
    .select('*')
    .eq('proposal_id', proposalId)
    .eq('buyer_id', proposal.customerId)
    .eq('seller_id', profile.id)
    .is('account_id', null)
    .is('order_id', null)
    .maybeSingle()

  if (existing.error) {
    throw existing.error
  }

  let conversationRow = existing.data

  if (!conversationRow) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        proposal_id: proposal.id,
        buyer_id: proposal.customerId,
        seller_id: profile.id,
        status: 'open',
        last_message: 'Olá! Estou analisando sua proposta e gostaria de negociar alguns detalhes.',
        last_message_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    conversationRow = data

    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: String(conversationRow.id),
        sender_id: profile.id,
        body: 'Olá! Estou analisando sua proposta e gostaria de negociar alguns detalhes.',
      })

    if (messageError) {
      throw messageError
    }
  }

  if (proposal.status === 'draft' || proposal.status === 'pending_analysis') {
    await updateSellProposalStatus(proposal.id, {
      status: 'under_review',
      historyAction: 'under_review',
      historyNote: 'Negociação iniciada.',
    })
  }

  const [conversation] = await attachConversationRelations([conversationRow])
  return conversation
}

export async function createOrderConversation(payload: {
  orderId: string
  accountId: string
  buyerId: string
  sellerId: string
}) {
  const supabase = requireSupabase()
  const existing = await supabase
    .from('conversations')
    .select('*')
    .eq('order_id', payload.orderId)
    .maybeSingle()

  if (existing.error) {
    throw existing.error
  }

  if (existing.data) {
    const [conversation] = await attachConversationRelations([existing.data])
    return conversation
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      account_id: payload.accountId,
      buyer_id: payload.buyerId,
      seller_id: payload.sellerId,
      order_id: payload.orderId,
      status: 'open',
      last_message: 'Pedido criado. A equipe irá acompanhar a negociação.',
      last_message_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const [conversation] = await attachConversationRelations([data])
  return conversation
}

export async function startOrderConversation(orderId: string) {
  const supabase = requireSupabase()
  const profile = await getCurrentUserProfile()

  if (!profile) {
    throw new Error('Entre na plataforma para iniciar a conversa.')
  }

  const order = await getOrderById(orderId)

  if (profile.role !== 'admin' && profile.id !== order.buyerId && profile.id !== order.sellerId) {
    throw new Error('Você não tem permissão para conversar sobre esta compra.')
  }

  const existing = await supabase
    .from('conversations')
    .select('*')
    .eq('order_id', order.id)
    .maybeSingle()

  if (existing.error) {
    throw existing.error
  }

  if (existing.data) {
    const [conversation] = await attachConversationRelations([existing.data])
    return conversation
  }

  return createOrderConversation({
    orderId: order.id,
    accountId: order.accountId,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
  })
}

export async function createSupportConversationForCurrentUser(preferredStaffId?: string) {
  const supabase = requireSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!userData.user) {
    throw new Error('Usuário não autenticado.')
  }

  let staffId = preferredStaffId

  if (!staffId) {
    const { data, error } = await supabase
      .from('profiles_public')
      .select('id')
      .in('role', ['seller', 'admin'])
      .neq('id', userData.user.id)
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    staffId = data?.id ? String(data.id) : undefined
  }

  if (!staffId) {
    throw new Error('Nenhum atendente disponível no momento.')
  }

  const existing = await supabase
    .from('conversations')
    .select('*')
    .eq('buyer_id', userData.user.id)
    .eq('seller_id', staffId)
    .is('account_id', null)
    .is('order_id', null)
    .is('proposal_id', null)
    .maybeSingle()

  if (existing.error) {
    throw existing.error
  }

  if (existing.data) {
    const [conversation] = await attachConversationRelations([existing.data])
    return conversation
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      buyer_id: userData.user.id,
      seller_id: staffId,
      status: 'open',
      last_message: 'Atendimento iniciado.',
      last_message_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const [conversation] = await attachConversationRelations([data])
  return conversation
}

export async function getConversationMessages(conversationId: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  const senderIds = [...new Set((data ?? []).map((row) => String(row.sender_id)).filter(Boolean))]
  const profilesResult = senderIds.length
    ? await supabase.from('profiles').select('*').in('id', senderIds)
    : { data: [], error: null }

  if (profilesResult.error) {
    throw profilesResult.error
  }

  const profiles = new Map((profilesResult.data ?? []).map((row) => [String(row.id), mapProfile(row)]))
  return (data ?? []).map((row) => mapMessage(row, profiles.get(String(row.sender_id))))
}

export async function sendMessage(payload: MessagePayload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: payload.conversationId,
      sender_id: payload.senderId,
      body: payload.body,
      media_url: payload.mediaUrl,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  await supabase
    .from('conversations')
    .update({
      last_message: payload.body,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.conversationId)

  return mapMessage(data)
}

export async function markConversationAsRead(id: string) {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .is('read_at', null)

  if (error) {
    throw error
  }
}
