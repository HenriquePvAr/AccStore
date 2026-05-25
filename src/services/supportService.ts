import { requireSupabase } from '../lib/supabaseClient'
import { mapOrder, mapProfile, mapSellProposal } from './mappers'
import type {
  CreateSupportTicketPayload,
  Order,
  Profile,
  SellProposal,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketDetails,
  SupportTicketFilters,
  SupportTicketMessage,
  SupportTicketPriority,
  SupportTicketStatus,
} from './types'

type Row = Record<string, unknown>

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function boolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function mapSupportTicket(
  row: Row,
  customer?: Profile,
  assignedTo?: Profile,
  relatedOrder?: Order,
  relatedProposal?: SellProposal,
): SupportTicket {
  const assignedToId = text(row.assigned_to)
  const relatedOrderId = text(row.related_order_id)
  const relatedProposalId = text(row.related_proposal_id)

  return {
    id: text(row.id),
    customerId: text(row.customer_id),
    customer,
    assignedToId: assignedToId || undefined,
    assignedTo,
    subject: text(row.subject),
    category: text(row.category, 'other') as SupportTicketCategory,
    status: text(row.status, 'open') as SupportTicketStatus,
    priority: text(row.priority, 'normal') as SupportTicketPriority,
    relatedOrderId: relatedOrderId || undefined,
    relatedOrder,
    relatedProposalId: relatedProposalId || undefined,
    relatedProposal,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    closedAt: text(row.closed_at) || undefined,
  }
}

function mapSupportTicketMessage(row: Row, sender?: Profile): SupportTicketMessage {
  return {
    id: text(row.id),
    ticketId: text(row.ticket_id),
    senderId: text(row.sender_id),
    sender,
    message: text(row.message),
    isInternal: boolean(row.is_internal),
    createdAt: text(row.created_at),
  }
}

function friendlySupportError(message: string): Error {
  return new Error(message)
}

function cleanSearchTerm(value?: string) {
  return (value ?? '').trim().replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80)
}

async function getCurrentUserId() {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw friendlySupportError('Entre na plataforma para acessar o suporte.')
  }

  return data.user.id
}

async function getMatchingCustomerIds(search: string) {
  if (!search) {
    return []
  }

  const supabase = requireSupabase()
  const pattern = `%${search}%`
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
    .limit(25)

  if (error) {
    return []
  }

  return (data ?? []).map((row) => text(row.id)).filter(Boolean)
}

async function attachTicketRelations(rows: Row[], includeRelated = false) {
  const supabase = requireSupabase()
  const customerIds = [...new Set(rows.map((row) => text(row.customer_id)).filter(Boolean))]
  const assignedIds = [...new Set(rows.map((row) => text(row.assigned_to)).filter(Boolean))]
  const orderIds = includeRelated ? [...new Set(rows.map((row) => text(row.related_order_id)).filter(Boolean))] : []
  const proposalIds = includeRelated ? [...new Set(rows.map((row) => text(row.related_proposal_id)).filter(Boolean))] : []

  const customers = new Map<string, Profile>()
  const assignees = new Map<string, Profile>()
  const orders = new Map<string, Order>()
  const proposals = new Map<string, SellProposal>()

  if (customerIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url, verified, created_at, updated_at')
      .in('id', customerIds)

    if (error) {
      throw error
    }

    for (const row of data ?? []) {
      customers.set(text(row.id), mapProfile(row))
    }
  }

  if (assignedIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles_public')
      .select('id, full_name, role, avatar_url, verified, created_at')
      .in('id', assignedIds)

    if (error) {
      throw error
    }

    for (const row of data ?? []) {
      assignees.set(text(row.id), mapProfile(row))
    }
  }

  if (orderIds.length > 0) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, account_id, order_code, amount, payment_status, delivery_status, status, created_at, updated_at')
      .in('id', orderIds)

    if (error) {
      throw error
    }

    for (const row of data ?? []) {
      const order = mapOrder(row)
      orders.set(order.id, order)
    }
  }

  if (proposalIds.length > 0) {
    const { data, error } = await supabase
      .from('sell_proposals')
      .select('id, customer_id, proposal_code, game_name, proposal_title, category, desired_price, description, status, admin_offer_price, assigned_admin_id, created_at, updated_at')
      .in('id', proposalIds)

    if (error) {
      throw error
    }

    for (const row of data ?? []) {
      const proposal = mapSellProposal(row, [])
      proposals.set(proposal.id, proposal)
    }
  }

  return rows.map((row) =>
    mapSupportTicket(
      row,
      customers.get(text(row.customer_id)),
      assignees.get(text(row.assigned_to)),
      orders.get(text(row.related_order_id)),
      proposals.get(text(row.related_proposal_id)),
    ),
  )
}

async function attachMessageRelations(rows: Row[]) {
  const supabase = requireSupabase()
  const senderIds = [...new Set(rows.map((row) => text(row.sender_id)).filter(Boolean))]
  const senders = new Map<string, Profile>()

  if (senderIds.length === 0) {
    return rows.map((row) => mapSupportTicketMessage(row))
  }

  const publicProfiles = await supabase
    .from('profiles_public')
    .select('id, full_name, role, avatar_url, verified, created_at')
    .in('id', senderIds)

  if (publicProfiles.error) {
    throw publicProfiles.error
  }

  for (const row of publicProfiles.data ?? []) {
    senders.set(text(row.id), mapProfile(row))
  }

  const profiles = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url, verified, created_at, updated_at')
    .in('id', senderIds)

  if (profiles.error) {
    throw profiles.error
  }

  for (const row of profiles.data ?? []) {
    senders.set(text(row.id), mapProfile(row))
  }

  return rows.map((row) => mapSupportTicketMessage(row, senders.get(text(row.sender_id))))
}

export async function getMyTickets() {
  try {
    const userId = await getCurrentUserId()
    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('customer_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      throw error
    }

    return attachTicketRelations(data ?? [])
  } catch (caught) {
    if (caught instanceof Error && caught.message.includes('Entre na plataforma')) {
      throw caught
    }

    throw friendlySupportError('Não foi possível carregar seus tickets agora.')
  }
}

export async function getTicketById(ticketId: string): Promise<SupportTicketDetails> {
  try {
    const supabase = requireSupabase()
    const { data, error } = await supabase.from('support_tickets').select('*').eq('id', ticketId).single()

    if (error) {
      throw error
    }

    const [ticket] = await attachTicketRelations([data], true)
    const messages = await getTicketMessages(ticketId)
    return { ticket, messages }
  } catch {
    throw friendlySupportError('Não foi possível carregar este ticket.')
  }
}

export async function createTicket(payload: CreateSupportTicketPayload) {
  try {
    const supabase = requireSupabase()
    const { data, error } = await supabase.rpc('open_support_ticket', {
      p_subject: payload.subject,
      p_category: payload.category,
      p_message: payload.initialMessage,
      p_related_order_id: payload.relatedOrderId ?? null,
      p_related_proposal_id: payload.relatedProposalId ?? null,
    })

    if (error) {
      throw error
    }

    return getTicketById(String(data))
  } catch {
    throw friendlySupportError('Não foi possível abrir o ticket. Revise os dados e tente novamente.')
  }
}

export async function replyToTicket(ticketId: string, message: string) {
  try {
    const userId = await getCurrentUserId()
    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: userId,
        message,
        is_internal: false,
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    const [created] = await attachMessageRelations([data])
    return created
  } catch {
    throw friendlySupportError('Não foi possível enviar sua resposta agora.')
  }
}

export async function closeMyTicket(ticketId: string) {
  try {
    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    const [ticket] = await attachTicketRelations([data], true)
    return ticket
  } catch {
    throw friendlySupportError('Não foi possível fechar este ticket agora.')
  }
}

export async function getSupportTickets(filters: SupportTicketFilters = {}) {
  try {
    const supabase = requireSupabase()
    let query = supabase.from('support_tickets').select('*')

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority)
    }

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }

    const search = cleanSearchTerm(filters.search)
    if (search) {
      const customerIds = await getMatchingCustomerIds(search)
      const conditions = [`subject.ilike.%${search}%`]

      if (customerIds.length > 0) {
        conditions.push(`customer_id.in.(${customerIds.join(',')})`)
      }

      query = query.or(conditions.join(','))
    }

    const { data, error } = await query.order('updated_at', { ascending: false }).limit(80)

    if (error) {
      throw error
    }

    return attachTicketRelations(data ?? [])
  } catch {
    throw friendlySupportError('Não foi possível carregar os tickets de suporte.')
  }
}

export async function getSupportTicketById(ticketId: string) {
  return getTicketById(ticketId)
}

export async function replyAsSupport(
  ticketId: string,
  message: string,
  options: { isInternal?: boolean; status?: SupportTicketStatus } = {},
) {
  try {
    const userId = await getCurrentUserId()
    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: userId,
        message,
        is_internal: options.isInternal ?? false,
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    if (options.status) {
      await updateTicketStatus(ticketId, options.status)
    }

    const [created] = await attachMessageRelations([data])
    return created
  } catch {
    throw friendlySupportError('Não foi possível enviar a resposta do suporte.')
  }
}

export async function updateTicketStatus(ticketId: string, status: SupportTicketStatus) {
  try {
    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        status,
        closed_at: status === 'closed' ? new Date().toISOString() : null,
      })
      .eq('id', ticketId)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    const [ticket] = await attachTicketRelations([data], true)
    return ticket
  } catch {
    throw friendlySupportError('Não foi possível atualizar o status do ticket.')
  }
}

export async function assignTicket(ticketId: string, userId: string | null) {
  try {
    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('support_tickets')
      .update({ assigned_to: userId })
      .eq('id', ticketId)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    const [ticket] = await attachTicketRelations([data], true)
    return ticket
  } catch {
    throw friendlySupportError('Não foi possível atribuir este ticket.')
  }
}

export async function updateTicketPriority(ticketId: string, priority: SupportTicketPriority) {
  try {
    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('support_tickets')
      .update({ priority })
      .eq('id', ticketId)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    const [ticket] = await attachTicketRelations([data], true)
    return ticket
  } catch {
    throw friendlySupportError('Não foi possível atualizar a prioridade do ticket.')
  }
}

export async function getSupportAssignees() {
  try {
    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('profiles_public')
      .select('id, full_name, role, avatar_url, verified, created_at')
      .in('role', ['seller', 'admin'])
      .order('full_name', { ascending: true })

    if (error) {
      throw error
    }

    return (data ?? []).map(mapProfile)
  } catch {
    throw friendlySupportError('Não foi possível carregar a equipe de suporte.')
  }
}

export async function getOpenSupportTicketForOrder(orderId: string) {
  try {
    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('related_order_id', orderId)
      .neq('status', 'closed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return null
    }

    const [ticket] = await attachTicketRelations([data])
    return ticket
  } catch {
    throw friendlySupportError('Não foi possível verificar tickets desta compra.')
  }
}

export async function getOpenSupportTicketForProposal(proposalId: string) {
  try {
    const supabase = requireSupabase()
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('related_proposal_id', proposalId)
      .neq('status', 'closed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return null
    }

    const [ticket] = await attachTicketRelations([data])
    return ticket
  } catch {
    throw friendlySupportError('Não foi possível verificar tickets desta proposta.')
  }
}

async function getTicketMessages(ticketId: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return attachMessageRelations(data ?? [])
}
