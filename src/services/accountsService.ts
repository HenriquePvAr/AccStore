import { requireSupabase } from '../lib/supabaseClient'
import { mapAccount, mapAccountMedia, mapProfile, toAccountMediaRow, toAccountRow } from './mappers'
import type { Account, AccountMedia, AccountMediaPayload, AccountPayload, AccountStatus } from './types'

async function attachAccountRelations(rows: Record<string, unknown>[], profileTable: 'profiles' | 'profiles_public' = 'profiles') {
  const supabase = requireSupabase()
  const accountIds = rows.map((row) => String(row.id))
  const sellerIds = [...new Set(rows.map((row) => String(row.seller_id)).filter(Boolean))]

  const [mediaResult, sellersResult] = await Promise.all([
    accountIds.length
      ? supabase.from('account_media').select('*').in('account_id', accountIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    sellerIds.length ? supabase.from(profileTable).select('*').in('id', sellerIds) : Promise.resolve({ data: [], error: null }),
  ])

  if (mediaResult.error) {
    throw mediaResult.error
  }

  if (sellersResult.error) {
    throw sellersResult.error
  }

  const media = (mediaResult.data ?? []).map(mapAccountMedia)
  const sellers = new Map((sellersResult.data ?? []).map((sellerRow) => [String(sellerRow.id), mapProfile(sellerRow)]))

  return rows.map((row) =>
    mapAccount(
      row,
      media.filter((item) => item.accountId === String(row.id)),
      sellers.get(String(row.seller_id)),
    ),
  )
}

export async function getPublishedAccounts() {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('accounts_public')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachAccountRelations(data ?? [], 'profiles_public')
}

export async function getAccountById(id: string) {
  const supabase = requireSupabase()
  const publicResult = await supabase.from('accounts_public').select('*').eq('id', id).maybeSingle()

  if (publicResult.error) {
    throw publicResult.error
  }

  if (publicResult.data) {
    const [account] = await attachAccountRelations([publicResult.data], 'profiles_public')
    return account
  }

  const { data, error } = await supabase
    .from('accounts')
    .select('id,seller_id,game_name,title,category,price,public_description,has_2fa,platform,region,cover_media_url,status,created_at,updated_at')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  const [account] = await attachAccountRelations([data])
  return account
}

export async function createAccountListing(payload: AccountPayload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('accounts').insert(toAccountRow(payload)).select('*').single()

  if (error) {
    throw error
  }

  return mapAccount(data)
}

export async function updateAccountListing(id: string, payload: Partial<AccountPayload>) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('accounts')
    .update({ ...toAccountRow(payload), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const [account] = await attachAccountRelations([data])
  return account
}

export async function updateAccountStatus(id: string, status: AccountStatus) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('accounts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const [account] = await attachAccountRelations([data])
  return account
}

export async function deleteAccountListing(id: string) {
  const supabase = requireSupabase()
  const { error } = await supabase.from('accounts').delete().eq('id', id)

  if (error) {
    throw error
  }
}

export async function getSellerAccounts(sellerId: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachAccountRelations(data ?? [])
}

export async function getAllAccounts() {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return attachAccountRelations(data ?? [])
}

export async function saveAccountMedia(accountId: string, media: Omit<AccountMediaPayload, 'accountId'>[]) {
  const supabase = requireSupabase()
  const payload = media.map((item) => toAccountMediaRow({ accountId, ...item }))
  const { data, error } = await supabase.from('account_media').insert(payload).select('*')

  if (error) {
    throw error
  }

  return (data ?? []).map(mapAccountMedia) as AccountMedia[]
}

export function accountToHighlights(account: Account) {
  return [
    account.gameName,
    account.category,
    account.region ? `Região: ${account.region}` : undefined,
    account.seller?.verified ? 'Vendedor verificado' : undefined,
  ].filter(Boolean) as string[]
}
