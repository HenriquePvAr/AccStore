import { LogIn, LogOut, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { roleHomePath } from '../../auth/types'
import { RoleBadge } from './RoleBadge'

export function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="hidden items-center gap-2 sm:flex">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/35 px-3 text-[13px] font-black text-white transition hover:border-[#1463FF]/60"
        >
          <LogIn aria-hidden="true" className="size-4" />
          Entrar
        </button>
        <button
          type="button"
          onClick={() => navigate('/cadastro')}
          className="inline-flex min-h-9 items-center rounded-lg bg-[#1463FF] px-3 text-[13px] font-black text-white transition hover:bg-[#1D74FF]"
        >
          Criar conta
        </button>
      </div>
    )
  }

  return (
    <div className="hidden items-center gap-2 xl:flex">
      <button
        type="button"
        onClick={() => navigate(roleHomePath[user.role])}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-[#101827]/60"
      >
        <span className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-slate-100 to-slate-600 text-[#070B16]">
          <UserRound aria-hidden="true" className="size-4" />
        </span>
        <span>
          <span className="block max-w-36 truncate text-[13px] font-semibold text-white">{user.name}</span>
          <RoleBadge role={user.role} compact />
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          void logout().finally(() => navigate('/login', { replace: true }))
        }}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/35 text-slate-300 transition hover:border-rose-400/45 hover:text-rose-200"
        title="Sair"
      >
        <LogOut aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
