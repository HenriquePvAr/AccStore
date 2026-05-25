import { LockKeyhole, LogIn, Mail } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { roleHomePath } from '../../auth/types'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Informe e-mail e senha para entrar.')
      return
    }

    setLoading(true)

    try {
      const user = await login({ email: email.trim(), password })
      const from = typeof location.state === 'object' && location.state && 'from' in location.state ? String(location.state.from) : ''
      navigate(from || roleHomePath[user.role], { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScreen>
      <div className="mb-8 text-center">
        <img src="/assets/accstore/logo-horizontal.png" alt="ACCSTORE" className="mx-auto h-11 object-contain mix-blend-screen" />
        <h1 className="mt-8 text-3xl font-black text-white">Entre para acessar sua conta.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Acesse suas compras, vendas e propostas com segurança.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField icon={Mail} label="E-mail" value={email} onChange={setEmail} type="email" />
        <AuthField icon={LockKeyhole} label="Senha" value={password} onChange={setPassword} type="password" />

        {error ? (
          <p className="rounded-lg border border-rose-400/24 bg-rose-500/12 p-3 text-sm font-semibold text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#1463FF] to-[#38BDF8] px-4 text-sm font-black text-white shadow-[0_0_24px_rgba(20,99,255,0.25)] transition hover:brightness-110 disabled:opacity-60"
        >
          <LogIn aria-hidden="true" className="size-4" />
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm font-bold">
        <Link to="/cadastro" className="text-blue-300 transition hover:text-white">
          Criar conta
        </Link>
        <button type="button" className="text-slate-400 transition hover:text-white">
          Esqueci minha senha
        </button>
      </div>

      <p className="mt-6 rounded-lg border border-[rgba(120,140,255,0.14)] bg-[#070B16]/58 p-3 text-xs leading-5 text-slate-400">
        Nunca compartilhe sua senha fora da plataforma.
      </p>
    </AuthScreen>
  )
}

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#070B16] px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(20,99,255,0.18),transparent_34%),linear-gradient(242deg,rgba(56,189,248,0.12),transparent_38%),linear-gradient(135deg,#070B16_0%,#080D1B_48%,#070B16_100%)]" />
      <section className="relative w-full max-w-md rounded-2xl border border-[rgba(120,140,255,0.2)] bg-[linear-gradient(135deg,rgba(11,18,34,0.96),rgba(7,11,22,0.92))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
        {children}
      </section>
    </main>
  )
}

interface AuthFieldProps {
  icon: LucideIcon
  label: string
  value: string
  type: string
  onChange: (value: string) => void
}

function AuthField({ icon: Icon, label, value, type, onChange }: AuthFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.06em] text-slate-400">{label}</span>
      <span className="flex min-h-12 items-center rounded-lg border border-[rgba(120,140,255,0.2)] bg-[#101827]/72 px-3 transition focus-within:border-blue-400/55">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
        />
      </span>
    </label>
  )
}
