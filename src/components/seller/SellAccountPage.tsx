import {
  Check,
  CloudUpload,
  FileImage,
  PlayCircle,
  Save,
  Send,
  ShieldCheck,
  Store,
  Trash2,
} from 'lucide-react'
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/utils'
import { createAccountListing, saveAccountMedia } from '../../services/accountsService'
import { uploadAccountMedia } from '../../services/mediaService'
import type { AccountStatus as ListingStatus, AccountPayload } from '../../services/types'

type MediaKind = 'image' | 'video'

interface LocalMedia {
  id: string
  file: File
  previewUrl: string
  type: MediaKind
  isCover: boolean
}

type FormErrors = Partial<Record<string, string>>

const defaultListingCategory: AccountPayload['category'] = 'Completa'
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']

export function SellAccountPage() {
  const { user } = useAuth()
  const [gameName, setGameName] = useState('')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [publicDescription, setPublicDescription] = useState('')
  const [region, setRegion] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [confirmReviewed, setConfirmReviewed] = useState(false)
  const [confirmTruth, setConfirmTruth] = useState(false)
  const [confirmCredentials, setConfirmCredentials] = useState(false)
  const [media, setMedia] = useState<LocalMedia[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [submittingStatus, setSubmittingStatus] = useState<ListingStatus | null>(null)

  const parsedPrice = useMemo(() => parseBRL(price), [price])
  const coverMedia = media.find((item) => item.isCover) ?? media[0]
  const checklist = {
    main: Boolean(gameName.trim() && title.trim().length >= 5 && parsedPrice > 0 && publicDescription.trim().length >= 20),
    media: media.length > 0,
    confirmations: confirmReviewed && confirmTruth && confirmCredentials,
  }
  const readyToPublish = checklist.main && checklist.media && checklist.confirmations
  const isAdmin = user?.role === 'admin'
  const pageTitle = isAdmin ? 'Anúncios' : 'Meus anúncios'
  const pageSubtitle = isAdmin
    ? 'Gerencie as contas publicadas na plataforma.'
    : 'Gerencie as contas que você publicou para venda.'
  const badgeLabel = isAdmin ? 'Administrador' : 'Vendedor verificado'

  const updateMedia = (files: FileList | null) => {
    if (!files?.length) {
      return
    }

    const currentCount = media.length
    const availableSlots = Math.max(0, 8 - currentCount)
    const validFiles = Array.from(files).filter((file) => allowedMimeTypes.includes(file.type)).slice(0, availableSlots)

    if (validFiles.length === 0) {
      setNotice({ type: 'error', message: 'Envie arquivos JPG, PNG, WEBP, MP4, WEBM ou MOV, com limite de 8 mídias.' })
      return
    }

    const nextMedia = validFiles.map((file, index) => ({
      id: `${file.name}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? ('video' as const) : ('image' as const),
      isCover: currentCount === 0 && index === 0,
    }))

    setMedia((current) => [...current, ...nextMedia])
    setNotice(null)
  }

  const removeMedia = (mediaId: string) => {
    setMedia((current) => {
      const removed = current.find((item) => item.id === mediaId)
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl)
      }

      const nextMedia = current.filter((item) => item.id !== mediaId)
      if (nextMedia.length > 0 && !nextMedia.some((item) => item.isCover)) {
        return nextMedia.map((item, index) => ({ ...item, isCover: index === 0 }))
      }

      return nextMedia
    })
  }

  const markCover = (mediaId: string) => {
    setMedia((current) => current.map((item) => ({ ...item, isCover: item.id === mediaId })))
  }

  const validate = (status: ListingStatus) => {
    const nextErrors: FormErrors = {}

    if (!gameName.trim()) {
      nextErrors.gameName = 'Informe o nome do jogo.'
    }

    if (title.trim().length < 5) {
      nextErrors.title = 'O título precisa ter pelo menos 5 caracteres.'
    }

    if (parsedPrice <= 0) {
      nextErrors.price = 'O preço precisa ser maior que zero.'
    }

    if (publicDescription.trim().length < 20) {
      nextErrors.publicDescription = 'A descrição pública precisa ter pelo menos 20 caracteres.'
    }

    if (status === 'published') {
      if (media.length === 0) nextErrors.media = 'Envie pelo menos uma mídia.'
      if (!confirmReviewed || !confirmTruth || !confirmCredentials) {
        nextErrors.confirmations = 'Marque todas as confirmações obrigatórias.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submitListing = async (status: ListingStatus) => {
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      setNotice({ type: 'error', message: 'Apenas vendedores verificados ou administradores podem publicar contas.' })
      return
    }

    if (!validate(status)) {
      setNotice({ type: 'error', message: 'Revise os campos destacados antes de continuar.' })
      return
    }

    setSubmittingStatus(status)
    setNotice(null)

    try {
      const uploadedMedia = media.length > 0 ? await uploadAccountMedia(media.map((item) => item.file), user.id) : []
      const mediaPayload = uploadedMedia.map((item, index) => ({
        url: item.url,
        type: item.type,
        isCover: media[index]?.isCover ?? index === 0,
      }))
      const coverMediaUrl = mediaPayload.find((item) => item.isCover)?.url ?? mediaPayload[0]?.url

      const listing = await createAccountListing({
        sellerId: user.id,
        gameName: gameName.trim(),
        title: title.trim(),
        category: defaultListingCategory,
        price: parsedPrice,
        publicDescription: publicDescription.trim(),
        region: region.trim(),
        internalNotes: internalNotes.trim(),
        coverMediaUrl,
        status,
      })

      if (mediaPayload.length > 0) {
        await saveAccountMedia(listing.id, mediaPayload)
      }

      setNotice({
        type: 'success',
        message: status === 'published' ? 'Conta publicada com sucesso.' : 'Rascunho salvo com sucesso.',
      })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível salvar o anúncio.',
      })
    } finally {
      setSubmittingStatus(null)
    }
  }

  return (
    <section className="space-y-4">
      <header className="acc-surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-[#1463FF] text-white">
              <Store aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">{pageTitle}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                {pageSubtitle}
              </p>
            </div>
          </div>
          <span className="inline-flex min-h-9 w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 text-xs font-black text-emerald-200">
            <ShieldCheck aria-hidden="true" className="size-4" />
            {badgeLabel}
          </span>
        </div>
      </header>

      {notice ? (
        <div
          className={cn(
            'fixed left-4 right-4 top-20 z-50 rounded-xl border px-4 py-3 text-sm font-bold shadow-[0_18px_60px_rgba(0,0,0,0.38)] sm:left-auto sm:w-[380px]',
            notice.type === 'success'
              ? 'border-emerald-400/24 bg-emerald-500/12 text-emerald-200'
              : 'border-rose-400/24 bg-rose-500/12 text-rose-200',
          )}
          aria-live="polite"
          role="status"
        >
          {notice.message}
        </div>
      ) : null}

      <form
        className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          void submitListing('published')
        }}
      >
        <div className="space-y-4">
          <AccountMainInfoSection
            gameName={gameName}
            title={title}
            price={price}
            publicDescription={publicDescription}
            errors={errors}
            onGameNameChange={setGameName}
            onTitleChange={setTitle}
            onPriceChange={setPrice}
            onPublicDescriptionChange={setPublicDescription}
          />
          <AccountMediaUpload media={media} error={errors.media} onAddMedia={updateMedia} onRemoveMedia={removeMedia} onMarkCover={markCover} />
          <AccountAdditionalInfoSection
            region={region}
            internalNotes={internalNotes}
            onRegionChange={setRegion}
            onInternalNotesChange={setInternalNotes}
          />
          <AccountConfirmationSection
            confirmReviewed={confirmReviewed}
            confirmTruth={confirmTruth}
            confirmCredentials={confirmCredentials}
            error={errors.confirmations}
            onConfirmReviewedChange={setConfirmReviewed}
            onConfirmTruthChange={setConfirmTruth}
            onConfirmCredentialsChange={setConfirmCredentials}
          />
          <SellerPublishActions
            publishing={submittingStatus === 'published'}
            savingDraft={submittingStatus === 'draft'}
            onSaveDraft={() => void submitListing('draft')}
          />
        </div>

        <aside className="space-y-4">
          <AccountPreviewCard
            coverUrl={coverMedia?.previewUrl}
            coverType={coverMedia?.type}
            gameName={gameName}
            title={title}
            price={parsedPrice}
            mediaCount={media.length}
            readyToPublish={readyToPublish}
          />
          <PublishChecklistCard checklist={checklist} />
          <AfterPublishCard />
        </aside>
      </form>
    </section>
  )
}

interface MainInfoProps {
  gameName: string
  title: string
  price: string
  publicDescription: string
  errors: FormErrors
  onGameNameChange: (value: string) => void
  onTitleChange: (value: string) => void
  onPriceChange: (value: string) => void
  onPublicDescriptionChange: (value: string) => void
}

function AccountMainInfoSection({
  gameName,
  title,
  price,
  publicDescription,
  errors,
  onGameNameChange,
  onTitleChange,
  onPriceChange,
  onPublicDescriptionChange,
}: MainInfoProps) {
  return (
    <FormCard title="1. Informações do anúncio">
      <div className="grid gap-4 lg:grid-cols-2">
        <TextField
          label="Nome do jogo"
          value={gameName}
          onChange={onGameNameChange}
          placeholder="Ex: Free Fire, Valorant, Fortnite..."
          error={errors.gameName}
        />
        <TextField
          label="Título do anúncio"
          value={title}
          onChange={onTitleChange}
          placeholder="Ex: Conta Free Fire Premium com skins raras"
          error={errors.title}
        />
        <TextField
          label="Preço de venda"
          value={price}
          onChange={onPriceChange}
          placeholder="R$ 0,00"
          error={errors.price}
        />
      </div>
      <TextareaField
        label="Descrição pública"
        value={publicDescription}
        onChange={onPublicDescriptionChange}
        placeholder="Descreva os itens, nível, skins, personagens, recursos, diferenciais e observações importantes da conta."
        rows={5}
        error={errors.publicDescription}
      />
    </FormCard>
  )
}

interface MediaUploadProps {
  media: LocalMedia[]
  error?: string
  onAddMedia: (files: FileList | null) => void
  onRemoveMedia: (mediaId: string) => void
  onMarkCover: (mediaId: string) => void
}

function AccountMediaUpload({ media, error, onAddMedia, onRemoveMedia, onMarkCover }: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAddMedia(event.target.files)
    event.target.value = ''
  }

  return (
    <FormCard title="2. Mídias do anúncio">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          onAddMedia(event.dataTransfer.files)
        }}
        className="rounded-xl border border-dashed border-blue-400/35 bg-[#070B16]/52 p-5 text-center"
      >
        <CloudUpload aria-hidden="true" className="mx-auto mb-3 size-10 text-blue-300" />
        <p className="text-sm font-black text-white">Arraste imagens, prints ou vídeos curtos aqui.</p>
        <p className="mt-1 text-xs font-medium text-slate-500">Aceita JPG, PNG, WEBP, MP4, WEBM e MOV. Máximo recomendado: 8 arquivos.</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#1463FF] px-4 text-sm font-black text-white transition hover:bg-[#1D74FF]"
        >
          Selecionar arquivos
        </button>
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.mov,image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleInputChange} />
      </div>
      {error ? <FieldError message={error} /> : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {media.map((item) => (
          <div key={item.id} className="group relative overflow-hidden rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]">
            {item.type === 'video' ? (
              <video src={item.previewUrl} className="aspect-video w-full object-cover" muted />
            ) : (
              <img src={item.previewUrl} alt="Prévia do arquivo enviado" className="aspect-video w-full object-cover" />
            )}
            {item.isCover ? (
              <span className="absolute left-2 top-2 rounded-md bg-[#1463FF] px-2 py-1 text-[11px] font-black text-white">Capa</span>
            ) : null}
            <div className="absolute inset-x-2 bottom-2 flex gap-2 opacity-100 sm:opacity-0 sm:transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onMarkCover(item.id)}
                className="min-h-8 flex-1 rounded-md bg-black/62 px-2 text-[11px] font-black text-white backdrop-blur transition hover:bg-[#1463FF]"
              >
                Marcar capa
              </button>
              <button
                type="button"
                onClick={() => onRemoveMedia(item.id)}
                className="inline-flex size-8 items-center justify-center rounded-md bg-black/62 text-white backdrop-blur transition hover:bg-rose-500"
                title="Remover arquivo"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs font-medium text-slate-500">{media.length} arquivos enviados</p>
    </FormCard>
  )
}

interface AdditionalInfoProps {
  region: string
  internalNotes: string
  onRegionChange: (value: string) => void
  onInternalNotesChange: (value: string) => void
}

function AccountAdditionalInfoSection({
  region,
  internalNotes,
  onRegionChange,
  onInternalNotesChange,
}: AdditionalInfoProps) {
  return (
    <FormCard title="3. Informações adicionais">
      <TextField label="Região / servidor" value={region} onChange={onRegionChange} placeholder="Ex: Brasil, LATAM, Global..." />
      <TextareaField
        label="Observações internas"
        value={internalNotes}
        onChange={onInternalNotesChange}
        placeholder="Observações para a equipe ou informações que não precisam aparecer no anúncio."
        rows={4}
      />
    </FormCard>
  )
}

interface ConfirmationProps {
  confirmReviewed: boolean
  confirmTruth: boolean
  confirmCredentials: boolean
  error?: string
  onConfirmReviewedChange: (value: boolean) => void
  onConfirmTruthChange: (value: boolean) => void
  onConfirmCredentialsChange: (value: boolean) => void
}

function AccountConfirmationSection({
  confirmReviewed,
  confirmTruth,
  confirmCredentials,
  error,
  onConfirmReviewedChange,
  onConfirmTruthChange,
  onConfirmCredentialsChange,
}: ConfirmationProps) {
  return (
    <FormCard title="4. Segurança e confirmação">
      <CheckboxField checked={confirmReviewed} onChange={onConfirmReviewedChange} label="Confirmo que a conta foi revisada antes da publicação." />
      <CheckboxField checked={confirmTruth} onChange={onConfirmTruthChange} label="Confirmo que as informações do anúncio são verdadeiras." />
      <CheckboxField checked={confirmCredentials} onChange={onConfirmCredentialsChange} label="Confirmo que os dados de acesso estão corretos para entrega." />
      {error ? <FieldError message={error} /> : null}
    </FormCard>
  )
}

function SellerPublishActions({
  publishing,
  savingDraft,
  onSaveDraft,
}: {
  publishing: boolean
  savingDraft: boolean
  onSaveDraft: () => void
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={onSaveDraft}
        disabled={publishing || savingDraft}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/58 px-4 text-sm font-black text-white transition hover:border-blue-400/45 disabled:opacity-60"
      >
        <Save aria-hidden="true" className="size-4" />
        {savingDraft ? 'Salvando...' : 'Salvar rascunho'}
      </button>
      <button
        type="submit"
        disabled={publishing || savingDraft}
        className="acc-button-primary inline-flex min-h-12 items-center justify-center gap-2 px-4 text-sm font-black transition disabled:opacity-60"
      >
        <Send aria-hidden="true" className="size-4" />
        {publishing ? 'Publicando...' : 'Publicar conta'}
      </button>
    </div>
  )
}

function AccountPreviewCard({
  coverUrl,
  coverType,
  gameName,
  title,
  price,
  mediaCount,
  readyToPublish,
}: {
  coverUrl?: string
  coverType?: MediaKind
  gameName: string
  title: string
  price: number
  mediaCount: number
  readyToPublish: boolean
}) {
  return (
    <SideCard title="Resumo do anúncio">
      <div className="flex gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#101827]">
          {coverUrl && coverType === 'video' ? (
            <span className="relative block size-full">
              <video src={coverUrl} muted playsInline preload="metadata" className="size-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                <PlayCircle aria-hidden="true" className="size-7" />
              </span>
            </span>
          ) : coverUrl ? (
            <img src={coverUrl} alt="Capa do anúncio" className="h-full w-full object-cover" />
          ) : (
            <FileImage aria-hidden="true" className="size-8 text-slate-600" />
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <SummaryLine label="Jogo" value={gameName || 'Não informado'} />
          <SummaryLine label="Título" value={title || 'Não informado'} />
          <SummaryLine label="Preço" value={price > 0 ? formatBRL(price) : 'R$ 0,00'} />
          <SummaryLine label="Mídias" value={`${mediaCount} arquivos`} />
          <span
            className={cn(
              'inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 text-xs font-black',
              readyToPublish
                ? 'border-emerald-400/20 bg-emerald-500/12 text-emerald-300'
                : 'border-slate-400/16 bg-slate-500/10 text-slate-300',
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {readyToPublish ? 'Pronto para publicação' : 'Rascunho'}
          </span>
        </div>
      </div>
    </SideCard>
  )
}

function PublishChecklistCard({ checklist }: { checklist: Record<'main' | 'media' | 'confirmations', boolean> }) {
  const items = [
    ['Informações principais preenchidas', checklist.main],
    ['Pelo menos 1 mídia enviada', checklist.media],
    ['Confirmações marcadas', checklist.confirmations],
  ] as const

  return (
    <SideCard title="Checklist">
      <div className="space-y-3">
        {items.map(([label, done]) => (
          <div key={label} className="flex items-center gap-3 text-sm font-semibold text-slate-300">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border',
                done ? 'border-emerald-400/30 bg-emerald-500/12 text-emerald-300' : 'border-slate-500/30 bg-slate-500/10 text-slate-500',
              )}
            >
              <Check aria-hidden="true" className="size-3.5" />
            </span>
            {label}
          </div>
        ))}
      </div>
    </SideCard>
  )
}

function AfterPublishCard() {
  return (
    <SideCard title="Após publicar">
      <p className="text-sm leading-6 text-slate-300">
        Após a publicação, a conta ficará disponível para os clientes no marketplace. Você poderá acompanhar mensagens e pedidos pelo painel do vendedor.
      </p>
    </SideCard>
  )
}

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="acc-surface space-y-4 p-4">
      <h2 className="text-base font-black text-white">{title}</h2>
      {children}
    </section>
  )
}

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="acc-surface p-4">
      <h2 className="mb-4 text-base font-black text-white">{title}</h2>
      {children}
    </section>
  )
}

function TextField({
  label,
  value,
  placeholder,
  type = 'text',
  error,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  type?: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          'min-h-11 w-full rounded-lg border bg-[#101827]/70 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/55',
          error ? 'border-rose-400/45' : 'border-[rgba(120,140,255,0.18)]',
        )}
      />
      {error ? <FieldError message={error} /> : null}
    </label>
  )
}

function TextareaField({
  label,
  value,
  placeholder,
  rows,
  error,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  rows: number
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-300">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full resize-none rounded-lg border bg-[#101827]/70 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/55',
          error ? 'border-rose-400/45' : 'border-[rgba(120,140,255,0.18)]',
        )}
      />
      {error ? <FieldError message={error} /> : null}
    </label>
  )
}

function CheckboxField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 rounded border-[rgba(120,140,255,0.28)] bg-[#101827] accent-[#1463FF]"
      />
      <span>{label}</span>
    </label>
  )
}

function FieldError({ message }: { message: string }) {
  return <p className="mt-1.5 text-xs font-bold text-rose-300">{message}</p>
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 line-clamp-2 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function parseBRL(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return Number(normalized) || 0
}
