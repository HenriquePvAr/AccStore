import type { Session, User } from '@supabase/supabase-js'
import { requireSupabase } from '../lib/supabaseClient'
import type { Profile } from './types'
import { getCurrentUserProfile, getProfileById } from './usersService'

export interface SignInPayload {
  email: string
  password: string
}

export interface SignUpPayload extends SignInPayload {
  name: string
}

export interface AuthServiceResult {
  profile: Profile | null
  session: Session | null
  needsEmailConfirmation?: boolean
}

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  if (message.includes('invalid login credentials')) {
    return new Error('E-mail ou senha inválidos.')
  }

  if (message.includes('email not confirmed')) {
    return new Error('Confirme seu e-mail antes de entrar.')
  }

  if (message.includes('user already registered') || message.includes('already registered')) {
    return new Error('Este e-mail já está cadastrado.')
  }

  if (message.includes('password')) {
    return new Error('A senha não atende aos requisitos mínimos.')
  }

  return new Error('Não foi possível autenticar. Tente novamente.')
}

async function ensureProfileForUser(user: User, fallbackName?: string) {
  const supabase = requireSupabase()

  try {
    return await getProfileById(user.id)
  } catch {
    const fullName =
      fallbackName?.trim() ||
      String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? '').trim() ||
      user.email?.split('@')[0] ||
      'Usuário'

    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: fullName,
        email: user.email ?? '',
      },
      { onConflict: 'id' },
    )

    if (error) {
      throw error
    }

    return getProfileById(user.id)
  }
}

export async function signIn(payload: SignInPayload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim(),
    password: payload.password,
  })

  if (error) {
    throw friendlyAuthError(error)
  }

  if (!data.user || !data.session) {
    throw new Error('Não foi possível iniciar a sessão.')
  }

  return {
    profile: await ensureProfileForUser(data.user),
    session: data.session,
  } satisfies AuthServiceResult
}

export async function signUp(payload: SignUpPayload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      data: {
        name: payload.name.trim(),
        full_name: payload.name.trim(),
      },
    },
  })

  if (error) {
    throw friendlyAuthError(error)
  }

  if (!data.user) {
    throw new Error('Não foi possível criar o usuário.')
  }

  if (!data.session) {
    return {
      profile: null,
      session: null,
      needsEmailConfirmation: true,
    } satisfies AuthServiceResult
  }

  return {
    profile: await ensureProfileForUser(data.user, payload.name),
    session: data.session,
  } satisfies AuthServiceResult
}

export async function signOut() {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function updateMyPassword(newPassword: string) {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    throw friendlyAuthError(error)
  }
}

export async function getSession() {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return data.session
}

export async function getAuthenticatedProfile() {
  return getCurrentUserProfile()
}
