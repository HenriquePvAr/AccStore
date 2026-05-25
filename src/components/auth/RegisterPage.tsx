import { CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { AuthScreen } from './LoginPage'

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Preencha nome, e-mail e senha para criar a conta.')
      return
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.')
      return
    }

    setLoading(true)

    try {
      const user = await register({ name: name.trim(), email: email.trim(), password })

      if (!user) {
        setNotice('Verifique seu e-mail para confirmar a conta antes de entrar.')
        setPassword('')
        setConfirmPassword('')
        window.setTimeout(() => navigate('/login', { replace: true }), 1800)
        return
      }

      setNotice('Conta criada com sucesso.')
      window.setTimeout(() => navigate('/explorar', { replace: true }), 900)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar a conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScreen>
      <div className="mb-8 text-center">
        <img src="/assets/accstore/logo-horizontal.png" alt="ACCSTORE" className="mx-auto h-11 object-contain mix-blend-screen" />
        <h1 className="mt-8 text-3xl font-black text-white">Criar conta</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Crie sua conta para comprar contas ou enviar uma proposta de venda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput icon={UserRound} label="Nome completo" value={name} onChange={setName} />
        <AuthInput icon={Mail} label="E-mail" value={email} onChange={setEmail} type="email" />
        <AuthInput
          icon={LockKeyhole}
          label="Senha"
          value={password}
          onChange={setPassword}
          type={showPassword ? 'text' : 'password'}
          trailing={
            <PasswordToggle
              visible={showPassword}
              onClick={() => setShowPassword((current) => !current)}
            />
          }
        />
        <AuthInput
          icon={LockKeyhole}
          label="Confirmar senha"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type={showConfirmPassword ? 'text' : 'password'}
          trailing={
            <PasswordToggle
              visible={showConfirmPassword}
              onClick={() => setShowConfirmPassword((current) => !current)}
            />
          }
        />

        {error ? (
          <p className="rounded-lg border border-rose-400/24 bg-rose-500/12 p-3 text-sm font-semibold text-rose-200">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="rounded-lg border border-emerald-400/24 bg-emerald-500/12 p-3 text-sm font-semibold text-emerald-200">
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#1463FF] to-[#38BDF8] px-4 text-sm font-black text-white shadow-[0_0_24px_rgba(20,99,255,0.25)] transition hover:brightness-110 disabled:opacity-60"
        >
          <CheckCircle2 aria-hidden="true" className="size-4" />
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm font-semibold text-slate-400">
        Já tem conta?{' '}
        <Link to="/login" className="text-blue-300 transition hover:text-white">
          Entrar
        </Link>
      </p>
      <p className="mt-3 text-center text-xs font-semibold leading-5 text-slate-500">
        Ao criar sua conta, você pode consultar o{' '}
        <Link to="/termos" className="text-blue-300 transition hover:text-white">
          Termo de Compra e Responsabilidade
        </Link>
        .
      </p>
    </AuthScreen>
  )
}

interface AuthInputProps {
  icon: LucideIcon
  label: string
  value: string
  type?: string
  trailing?: ReactNode
  onChange: (value: string) => void
}

function AuthInput({ icon: Icon, label, value, type = 'text', trailing, onChange }: AuthInputProps) {
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
        {trailing}
      </span>
    </label>
  )
}

function PasswordToggle({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
      title={visible ? 'Ocultar senha' : 'Mostrar senha'}
      aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
    >
      {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
    </button>
  )
}
