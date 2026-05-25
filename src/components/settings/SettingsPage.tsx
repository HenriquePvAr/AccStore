import {
  Bell,
  Camera,
  Globe2,
  LockKeyhole,
  Save,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { updateMyPassword } from '../../services/authService'
import { getMyProfile, updateMyProfile, uploadMyAvatar } from '../../services/usersService'
import type { Profile } from '../../services/types'

const notificationOptions = [
  'Pedidos',
  'Mensagens',
  'Propostas',
  'Novidades',
]

export function SettingsPage() {
  const { profile: authProfile, refreshProfile } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(authProfile)
  const [fullName, setFullName] = useState(authProfile?.fullName ?? '')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState<MessageState | null>(null)
  const [securityMessage, setSecurityMessage] = useState<MessageState | null>(null)
  const [preferencesMessage, setPreferencesMessage] = useState<MessageState | null>(null)
  const [notifications, setNotifications] = useState(() => notificationOptions.map(() => true))
  const [theme, setTheme] = useState('Escuro')
  const [currency, setCurrency] = useState('BRL')
  const [language, setLanguage] = useState('Português')

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        const data = await getMyProfile()
        if (active && data) {
          setProfile(data)
          setFullName(data.fullName)
        }
      } catch {
        if (active) {
          setProfileMessage({ type: 'error', text: 'Não foi possível carregar seu perfil agora.' })
        }
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [])

  const initials = useMemo(() => {
    const name = profile?.fullName || profile?.email || 'A'
    return name.charAt(0).toUpperCase()
  }, [profile])

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileMessage(null)

    if (!fullName.trim()) {
      setProfileMessage({ type: 'error', text: 'Informe seu nome completo.' })
      return
    }

    setProfileBusy(true)

    try {
      const updated = await updateMyProfile({ fullName: fullName.trim() })
      setProfile(updated)
      await refreshProfile()
      setProfileMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' })
    } catch {
      setProfileMessage({ type: 'error', text: 'Não foi possível atualizar seu perfil agora.' })
    } finally {
      setProfileBusy(false)
    }
  }

  const handleAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'error', text: 'Envie uma imagem JPG, PNG ou WEBP.' })
      return
    }

    setAvatarBusy(true)
    setProfileMessage(null)

    try {
      const updated = await uploadMyAvatar(file)
      setProfile(updated)
      await refreshProfile()
      setProfileMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' })
    } catch {
      setProfileMessage({ type: 'error', text: 'Não foi possível atualizar seu perfil agora.' })
    } finally {
      setAvatarBusy(false)
    }
  }

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSecurityMessage(null)

    if (newPassword.length < 6) {
      setSecurityMessage({ type: 'error', text: 'A nova senha precisa ter pelo menos 6 caracteres.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'As senhas não conferem.' })
      return
    }

    setPasswordBusy(true)

    try {
      await updateMyPassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setSecurityMessage({ type: 'success', text: 'Senha atualizada com sucesso.' })
    } catch {
      setSecurityMessage({ type: 'error', text: 'Não foi possível atualizar sua senha.' })
    } finally {
      setPasswordBusy(false)
    }
  }

  const savePreparedPreferences = () => {
    setPreferencesMessage({ type: 'success', text: 'Preferências atualizadas.' })
  }

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[linear-gradient(135deg,rgba(11,18,34,0.96),rgba(8,14,28,0.88))] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.24)]">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-200">
            <SlidersHorizontal aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">Configurações</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Gerencie seus dados, segurança e preferências.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4">
        <SettingsCard icon={UserRound} title="Perfil">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <div className="flex flex-col items-center gap-3">
              <span className="flex size-24 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-slate-100 to-slate-600 text-[#070B16]">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar do perfil" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-3xl font-black">{initials}</span>
                )}
              </span>
              <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-black text-blue-100 transition hover:border-blue-300">
                <Camera aria-hidden="true" className="size-4" />
                {avatarBusy ? 'Enviando...' : 'Alterar avatar'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void handleAvatar(event)} disabled={avatarBusy} />
              </label>
            </div>

            <form onSubmit={(event) => void saveProfile(event)} className="min-w-0 flex-1 space-y-4">
              <TextField label="Nome completo" value={fullName} onChange={setFullName} placeholder="Seu nome" />
              <ReadOnlyField label="E-mail" value={profile?.email ?? 'Não informado'} />
              <Message message={profileMessage} />
              <button type="submit" disabled={profileBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1463FF] px-4 text-sm font-black text-white transition hover:bg-[#1D74FF] disabled:opacity-60">
                <Save aria-hidden="true" className="size-4" />
                {profileBusy ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </form>
          </div>
        </SettingsCard>

        <SettingsCard icon={LockKeyhole} title="Segurança">
          <form onSubmit={(event) => void savePassword(event)} className="grid gap-4 md:grid-cols-2">
            <TextField label="Nova senha" value={newPassword} onChange={setNewPassword} placeholder="Mínimo 6 caracteres" type="password" />
            <TextField label="Confirmar nova senha" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repita a nova senha" type="password" />
            <div className="md:col-span-2">
              <Message message={securityMessage} />
            </div>
            <button type="submit" disabled={passwordBusy} className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-lg bg-[#1463FF] px-4 text-sm font-black text-white transition hover:bg-[#1D74FF] disabled:opacity-60">
              <LockKeyhole aria-hidden="true" className="size-4" />
              {passwordBusy ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        </SettingsCard>

        <SettingsCard icon={Bell} title="Notificações">
          <div className="grid gap-3 sm:grid-cols-2">
            {notificationOptions.map((label, index) => (
              <ToggleLine
                key={label}
                label={label}
                checked={notifications[index] ?? false}
                onChange={(checked) => setNotifications((current) => current.map((item, itemIndex) => (itemIndex === index ? checked : item)))}
              />
            ))}
          </div>
          <Message message={preferencesMessage} />
          <button type="button" onClick={savePreparedPreferences} className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-black text-blue-100 transition hover:border-blue-300">
            <Save aria-hidden="true" className="size-4" />
            Salvar notificações
          </button>
        </SettingsCard>

        <SettingsCard icon={Globe2} title="Preferências">
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField label="Tema" value={theme} options={['Escuro']} onChange={setTheme} />
            <SelectField label="Moeda" value={currency} options={['BRL']} onChange={setCurrency} />
            <SelectField label="Idioma" value={language} options={['Português']} onChange={setLanguage} />
          </div>
          <button type="button" onClick={savePreparedPreferences} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-black text-blue-100 transition hover:border-blue-300">
            <Save aria-hidden="true" className="size-4" />
            Aplicar preferências
          </button>
        </SettingsCard>
      </div>
    </section>
  )
}

type MessageState = {
  type: 'success' | 'error'
  text: string
}

function SettingsCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-blue-400/22 bg-blue-500/10 text-blue-200">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <h2 className="text-lg font-black text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function TextField({ label, placeholder, value, type = 'text', onChange }: { label: string; placeholder: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-300">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/70 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/55" />
    </label>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-300">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/70 px-3 text-sm font-semibold text-white outline-none transition focus:border-blue-400/55">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-slate-300">{label}</p>
      <p className="min-h-11 rounded-lg border border-[rgba(120,140,255,0.12)] bg-[#101827]/42 px-3 py-3 text-sm font-semibold text-slate-300">{value}</p>
    </div>
  )
}

function ToggleLine({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-[rgba(120,140,255,0.14)] bg-[#101827]/48 px-3">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 rounded border-[rgba(120,140,255,0.28)] bg-[#101827] accent-[#1463FF]" />
    </label>
  )
}

function Message({ message }: { message: MessageState | null }) {
  if (!message) return null

  return (
    <p className={`rounded-lg border p-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-400/24 bg-emerald-500/12 text-emerald-200' : 'border-rose-400/24 bg-rose-500/12 text-rose-200'}`}>
      {message.text}
    </p>
  )
}
