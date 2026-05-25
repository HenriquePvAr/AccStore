import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SUPABASE_NOT_CONFIGURED_MESSAGE, supabase } from '../lib/supabaseClient'
import {
  getSession,
  signIn as signInWithSupabase,
  signOut as signOutWithSupabase,
  signUp as signUpWithSupabase,
} from '../services/authService'
import type { Profile } from '../services/types'
import { getProfileById } from '../services/usersService'
import { type AuthUser, type UserRole } from './types'

interface LoginInput {
  email: string
  password: string
}

interface RegisterInput {
  name: string
  email: string
  password: string
}

interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  signIn: (input: LoginInput) => Promise<AuthUser>
  signUp: (input: RegisterInput) => Promise<AuthUser | null>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<Profile | null>
  login: (input: LoginInput) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function profileToAuthUser(profile: Profile): AuthUser {
  return {
    id: profile.id,
    name: profile.fullName || profile.email,
    email: profile.email,
    role: profile.role,
    avatarUrl: profile.avatarUrl,
    verified: profile.verified,
    createdAt: profile.createdAt,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfileForSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)

    if (!nextSession?.user) {
      setProfile(null)
      return null
    }

    const nextProfile = await getProfileById(nextSession.user.id)
    setProfile(nextProfile)
    return nextProfile
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null)
      return null
    }

    const nextProfile = await getProfileById(session.user.id)
    setProfile(nextProfile)
    return nextProfile
  }, [session])

  const loadSession = useCallback(async () => {
    if (!supabase) {
      setSession(null)
      setProfile(null)
      setError(SUPABASE_NOT_CONFIGURED_MESSAGE)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      await loadProfileForSession(await getSession())
    } catch (caught) {
      setSession(null)
      setProfile(null)
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar sua conta.')
    } finally {
      setLoading(false)
    }
  }, [loadProfileForSession])

  useEffect(() => {
    let active = true

    queueMicrotask(() => {
      if (active) {
        void loadSession()
      }
    })

    if (!supabase) {
      return undefined
    }

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      queueMicrotask(() => {
        setError(null)
        void loadProfileForSession(nextSession).catch((caught) => {
          setSession(null)
          setProfile(null)
          setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar sua conta.')
        })
      })
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [loadProfileForSession, loadSession])

  const authUser = profile ? profileToAuthUser(profile) : null

  const runSignIn = useCallback(async (input: LoginInput) => {
    const result = await signInWithSupabase(input)

    if (!result.profile) {
      throw new Error('Não foi possível carregar sua conta. Tente novamente.')
    }

    setSession(result.session)
    setProfile(result.profile)
    return profileToAuthUser(result.profile)
  }, [])

  const runSignUp = useCallback(async (input: RegisterInput) => {
    const result = await signUpWithSupabase(input)

    if (!result.profile) {
      setSession(result.session)
      setProfile(null)
      return null
    }

    setSession(result.session)
    setProfile(result.profile)
    return profileToAuthUser(result.profile)
  }, [])

  const runSignOut = useCallback(async () => {
    await signOutWithSupabase()
    setSession(null)
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: authUser,
      session,
      profile,
      role: profile?.role ?? null,
      loading,
      error,
      isAuthenticated: Boolean(session?.user),
      signIn: runSignIn,
      signUp: runSignUp,
      signOut: runSignOut,
      refreshProfile,
      login: runSignIn,
      register: runSignUp,
      logout: runSignOut,
    }),
    [authUser, error, loading, profile, refreshProfile, runSignIn, runSignOut, runSignUp, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
