import { requireSupabase } from '../lib/supabaseClient'
import { getAccountById } from './accountsService'
import { mapOrder, mapProfile } from './mappers'
import type { GuestOrderPayload, OrderPayload, OrderStatus } from './types'
import { getCurrentUserProfile } from './usersService'

function generateOrderCode() {
  return `PED-${Date.now().toString().slice(-7)}`
}

async function attachOrderRelations(rows: Record<string, unknown>[]) {
  const supabase = requireSupabase()
  const profileIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.buyer_id, row.seller_id])
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  ]

  const profilesResult = profileIds.length
    ? await supabase.from('profiles_public').select('*').in('id', profileIds)
    : { data: [], error: null }

  if (profilesResult.error) {
    throw profilesResult.error
  }

  const profiles = new Map((profilesResult.data ?? []).map((row) => [String(row.id), mapProfile(row)]))

  return Promise.all(
    rows.map(async (row) => {
      const account = row.account_id ? await getAccountById(String(row.account_id)).catch(() => undefined) : undefined
      return mapOrder(row, account, profiles.get(String(row.buyer_id)), profiles.get(String(row.seller_id)))
    }),
  )
}

export async function getUserOrders(userId: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachOrderRelations(data ?? [])
}

export async function getMyPurchases() {
  const supabase = requireSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!userData.user) {
    throw new Error('Entre na plataforma para ver suas compras.')
  }

  return getUserOrders(userData.user.id)
}

export async function getSellerOrders(sellerId: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachOrderRelations(data ?? [])
}

export async function getAllOrders() {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachOrderRelations(data ?? [])
}

export async function getOrderById(id: string) {
  const supabase = requireSupabase()
  const profile = await getCurrentUserProfile()
  let query = supabase.from('orders').select('*').eq('id', id)

  if (profile?.role === 'customer') {
    query = query.eq('buyer_id', profile.id)
  }

  if (profile?.role === 'seller') {
    query = query.or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
  }

  const { data, error } = await query.single()

  if (error) {
    throw error
  }

  const [order] = await attachOrderRelations([data])
  return order
}

export async function createOrder(payload: OrderPayload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: payload.buyerId,
      seller_id: payload.sellerId,
      account_id: payload.accountId,
      order_code: generateOrderCode(),
      amount: payload.amount,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const [order] = await attachOrderRelations([data])
  return order
}

export async function createGuestOrder(payload: GuestOrderPayload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('create_guest_order', {
    p_account_id: payload.accountId,
    p_guest_name: payload.name.trim(),
    p_guest_whatsapp: payload.whatsapp.trim(),
    p_guest_email: payload.email?.trim() || null,
  })

  if (error) {
    throw error
  }

  const [order] = await attachOrderRelations([data as Record<string, unknown>])
  return order
}

export async function getGuestOrderByToken(token: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('get_guest_order_by_token', {
    p_token: token,
  })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as Record<string, unknown>[]

  if (rows.length === 0) {
    throw new Error('Pedido não encontrado ou link expirado.')
  }

  const [order] = await attachOrderRelations([rows[0]])
  return order
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const [order] = await attachOrderRelations([data])
  return order
}
