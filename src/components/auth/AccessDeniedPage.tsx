import { ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { roleHomePath } from '../../auth/types'

export function AccessDeniedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-[#070B16] px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(20,99,255,0.16),transparent_34%),linear-gradient(135deg,#070B16_0%,#080D1B_48%,#070B16_100%)]" />
      <section className="relative w-full max-w-lg rounded-2xl border border-rose-400/22 bg-[linear-gradient(135deg,rgba(11,18,34,0.96),rgba(7,11,22,0.92))] p-7 text-center shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
        <span className="mx-auto flex size-14 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-500/12 text-rose-200">
          <ShieldAlert aria-hidden="true" className="size-7" />
        </span>
        <h1 className="mt-5 text-3xl font-black text-white">Acesso negado</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Você não tem permissão para acessar esta área.</p>
        <button
          type="button"
          onClick={() => navigate(user ? roleHomePath[user.role] : '/login')}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1463FF] px-5 text-sm font-black text-white transition hover:bg-[#1D74FF]"
        >
          Voltar para minha área
        </button>
      </section>
    </main>
  )
}
