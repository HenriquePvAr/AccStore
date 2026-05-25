import { requireSupabase } from '../lib/supabaseClient'
import type { UserRole } from '../auth/types'
import { mapProfile } from './mappers'
import { uploadAvatar } from './mediaService'
import type { Profile } from './types'

export async function getCurrentUserProfile() {
  const supabase = requireSupabase()
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser()

  if (sessionError) {
    throw sessionError
  }

  if (!sessionData.user) {
    return null
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', sessionData.user.id).single()

  if (error) {
    throw error
  }

  return mapProfile(data)
}

export async function getMyProfile() {
  return getCurrentUserProfile()
}

export async function getProfileById(id: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()

  if (error) {
    throw error
  }

  return mapProfile(data)
}

export async function getAllUsers() {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map(mapProfile)
}

export async function updateMyProfile(payload: Partial<Pick<Profile, 'fullName' | 'avatarUrl'>>) {
  const supabase = requireSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!userData.user) {
    throw new Error('Usuário não autenticado.')
  }

  const updates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  }

  if (payload.fullName !== undefined) {
    updates.full_name = payload.fullName
  }

  if (payload.avatarUrl !== undefined) {
    updates.avatar_url = payload.avatarUrl
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userData.user.id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapProfile(data)
}

export async function updateUserProfile(payload: Partial<Pick<Profile, 'fullName' | 'avatarUrl'>>) {
  return updateMyProfile(payload)
}

export async function uploadMyAvatar(file: File) {
  const supabase = requireSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!userData.user) {
    throw new Error('Usuário não autenticado.')
  }

  const uploaded = await uploadAvatar(file, userData.user.id)
  return updateMyProfile({ avatarUrl: uploaded.url })
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = requireSupabase()
  const currentProfile = await getCurrentUserProfile()

  if (currentProfile?.role !== 'admin') {
    throw new Error('Você não tem permissão para alterar acessos.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapProfile(data)
}
