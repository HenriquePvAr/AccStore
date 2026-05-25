import { Check, Clock3, CloudUpload, Save, Send, ShieldCheck, Store, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/utils'
import { uploadProposalMedia } from '../../services/mediaService'
import { createSellProposal, saveProposalMedia } from '../../services/proposalsService'
import type { MediaType, ProposalStatus } from '../../services/types'

interface LocalMedia {
  id: string
  file: File
  previewUrl: string
  type: MediaType
  isCover: boolean
}

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']

export function SellToAccstorePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [gameName, setGameName] = useState('')
  const [proposalTitle, setProposalTitle] = useState('')
  const [desiredPrice, setDesiredPrice] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [media, setMedia] = useState<LocalMedia[]>([])
  const [confirmOwner, setConfirmOwner] = useState(false)
  const [confirmTruth, setConfirmTruth] = useState(false)
  const [confirmRules, setConfirmRules] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const numericPrice = useMemo(() => parseBRL(desiredPrice), [desiredPrice])

  const addMedia = (files: FileList | null) => {
    if (!files?.length) return

    const validFiles = Array.from(files).filter((file) => allowedMimeTypes.includes(file.type)).slice(0, 8 - media.length)
    if (!validFiles.length) {
      setNotice({ type: 'error', message: 'Envie arquivos JPG, PNG, WEBP ou MP4.' })
      return
    }

    setMedia((current) => [
      ...current,
      ...validFiles.map((file, index) => ({
        id: `${file.name}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? ('video' as const) : ('image' as const),
        isCover: current.length === 0 && index === 0,
      })),
    ])
  }

  const removeMedia = (mediaId: string) => {
    setMedia((current) => {
      const removed = current.find((item) => item.id === mediaId)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      const nextMedia = current.filter((item) => item.id !== mediaId)
      return nextMedia.length > 0 && !nextMedia.some((item) => item.isCover)
        ? nextMedia.map((item, index) => ({ ...item, isCover: index === 0 }))
        : nextMedia
    })
  }

  const markCover = (mediaId: string) => {
    setMedia((current) => current.map((item) => ({ ...item, isCover: item.id === mediaId })))
  }

  const validate = (status: ProposalStatus) => {
    if (!user) return 'Entre na plataforma para enviar uma proposta.'
    if (!gameName.trim() || !proposalTitle.trim() || !description.trim()) return 'Preencha as informações principais.'
    if (numericPrice <= 0) return 'Informe um preço desejado maior que zero.'
    if (status === 'draft') return null
    if (media.length === 0) return 'Envie pelo menos uma mídia da conta.'
    if (!acceptedTerms) return 'Você precisa aceitar os termos para enviar sua proposta.'
    if (!confirmOwner || !confirmTruth || !confirmRules) return 'Marque todas as confirmações de segurança.'
    return null
  }

  const submitProposal = async (status: ProposalStatus) => {
    const validationError = validate(status)

    if (validationError) {
      setNotice({ type: 'error', message: validationError })
      return
    }

    if (!user) return

    setSubmitting(true)
    setNotice(null)

    try {
      const proposal = await createSellProposal({
        customerId: user.id,
        gameName: gameName.trim(),
        proposalTitle: proposalTitle.trim(),
        desiredPrice: numericPrice,
        description: description.trim(),
        region: region.trim(),
        additionalInfo: additionalInfo.trim(),
        status,
      })

      if (media.length > 0) {
        const uploaded = await uploadProposalMedia(media.map((item) => item.file), user.id)
        await saveProposalMedia(
          proposal.id,
          uploaded.map((item, index) => ({
            url: item.url,
            type: item.type,
            isCover: media[index]?.isCover ?? index === 0,
          })),
        )
      }

      setNotice({
        type: 'success',
        message: status === 'draft' ? `Rascunho ${proposal.proposalCode} salvo.` : `Proposta ${proposal.proposalCode} enviada para análise.`,
      })
      setProposalTitle('')
      setDesiredPrice('')
      setDescription('')
      setRegion('')
      setAdditionalInfo('')
      setMedia([])
      setConfirmOwner(false)
      setConfirmTruth(false)
      setConfirmRules(false)
      setAcceptedTerms(false)
      window.setTimeout(() => navigate('/minhas-propostas', { replace: true }), 1100)
    } catch (caught) {
      setNotice({ type: 'error', message: caught instanceof Error ? caught.message : 'Erro ao salvar proposta.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitProposal('pending_analysis')
  }

  return (
    <section className="space-y-4">
      <ProposalHeader />

      {notice ? (
        <div className={cn('rounded-xl border px-4 py-3 text-sm font-bold', notice.type === 'success' ? 'border-emerald-400/24 bg-emerald-500/12 text-emerald-200' : 'border-rose-400/24 bg-rose-500/12 text-rose-200')}>
          {notice.message}
        </div>
      ) : null}

      <form className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]" onSubmit={(event) => void handleSubmit(event)}>
        <div className="space-y-4">
          <FormCard title="1. Informações principais">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextField label="Nome do jogo" value={gameName} onChange={setGameName} placeholder="Ex: Free Fire" />
              <TextField label="Título do envio / proposta" value={proposalTitle} onChange={setProposalTitle} placeholder="Ex: Conta Free Fire Premium com muitos itens raros" />
              <TextField label="Preço desejado" value={desiredPrice} onChange={setDesiredPrice} placeholder="R$ 0,00" />
            </div>
            <TextareaField label="Descrição da conta" value={description} onChange={setDescription} placeholder="Descreva skins, personagens, nível, raridades e histórico da conta." rows={4} />
          </FormCard>

          <FormCard title="2. Informações adicionais">
            <TextField label="Região / servidor" value={region} onChange={setRegion} placeholder="Ex: Brasil, LATAM, Global" />
            <TextareaField label="Observações adicionais" value={additionalInfo} onChange={setAdditionalInfo} placeholder="Ex: Estou aberto a propostas justas. Conta bem cuidada, sem punições." rows={3} />
          </FormCard>

          <FormCard title="3. Segurança e confirmação">
            <CheckboxField checked={confirmOwner} onChange={setConfirmOwner} label="Confirmo que sou o proprietário legítimo desta conta." />
            <CheckboxField checked={confirmTruth} onChange={setConfirmTruth} label="Declaro que todas as informações fornecidas são verdadeiras." />
            <CheckboxField checked={confirmRules} onChange={setConfirmRules} label="Estou ciente de que a ACCSTORE pode recusar propostas fora das regras." />
            <CheckboxField checked={acceptedTerms} onChange={setAcceptedTerms} label="Declaro que as informações enviadas são verdadeiras e aceito os termos da ACCSTORE." />
            <Link to="/termos" className="inline-flex text-sm font-bold text-blue-300 transition hover:text-white">
              Ler Termo de Compra e Responsabilidade
            </Link>
          </FormCard>

          <ProposalMediaUpload media={media} onAddMedia={addMedia} onRemoveMedia={removeMedia} onMarkCover={markCover} />

          <div className="grid gap-3 rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-4 sm:grid-cols-2">
            <button type="button" disabled={submitting} onClick={() => void submitProposal('draft')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/58 px-4 text-sm font-black text-white transition hover:border-blue-400/45 disabled:opacity-60">
              <Save aria-hidden="true" className="size-4" />
              {submitting ? 'Salvando...' : 'Salvar rascunho'}
            </button>
            <button type="submit" disabled={submitting} className="acc-button-primary inline-flex min-h-12 items-center justify-center gap-2 px-4 text-sm font-black transition disabled:opacity-60">
              <Send aria-hidden="true" className="size-4" />
              {submitting ? 'Enviando...' : 'Enviar proposta'}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <ProposalSummaryCard
            gameName={gameName}
            proposalTitle={proposalTitle}
            desiredPrice={numericPrice}
            mediaCount={media.length}
            coverUrl={media.find((item) => item.isCover)?.previewUrl}
            coverType={media.find((item) => item.isCover)?.type}
          />
          <ProposalHowItWorksCard />
          <ProposalSafetyCard />
        </aside>
      </form>
    </section>
  )
}

function ProposalHeader() {
  return (
    <div className="acc-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-[#1463FF] text-white shadow-[0_0_24px_rgba(20,99,255,0.2)]">
            <Store aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">Vender conta para a ACCSTORE</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
              Envie sua conta para análise da nossa equipe.
            </p>
          </div>
        </div>
        <span className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-500/12 px-4 text-sm font-black text-amber-300">
          <Clock3 aria-hidden="true" className="size-4" />
          Aguardando análise
        </span>
      </div>
    </div>
  )
}

function ProposalMediaUpload({ media, onAddMedia, onRemoveMedia, onMarkCover }: { media: LocalMedia[]; onAddMedia: (files: FileList | null) => void; onRemoveMedia: (mediaId: string) => void; onMarkCover: (mediaId: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAddMedia(event.target.files)
    event.target.value = ''
  }

  return (
    <FormCard title="4. Mídias da conta">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          onAddMedia(event.dataTransfer.files)
        }}
        className="flex min-h-32 w-full flex-col items-center justify-center rounded-lg border border-dashed border-blue-400/35 bg-[#070B16]/52 px-4 py-6 text-center transition hover:border-blue-300/65 hover:bg-blue-500/8"
      >
        <CloudUpload aria-hidden="true" className="mb-3 size-9 text-blue-300" />
        <span className="text-sm font-black text-white">Arraste fotos ou vídeos aqui, ou clique para selecionar.</span>
        <span className="mt-1 text-xs font-medium text-slate-500">JPG, PNG, WEBP ou MP4. Depois do envio, vai para o Storage.</span>
      </button>
      <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4" className="hidden" onChange={handleChange} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {media.map((item) => (
          <div key={item.id} className="group relative overflow-hidden rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]">
            {item.type === 'video' ? <video src={item.previewUrl} className="aspect-video w-full object-cover" muted /> : <img src={item.previewUrl} alt="Prévia da mídia enviada" className="aspect-video w-full object-cover" />}
            {item.isCover ? <span className="absolute left-2 top-2 rounded-md bg-[#1463FF] px-2 py-1 text-[11px] font-black text-white">Capa</span> : null}
            <div className="absolute inset-x-2 bottom-2 flex gap-2 opacity-100 sm:opacity-0 sm:transition group-hover:opacity-100">
              <button type="button" onClick={() => onMarkCover(item.id)} className="min-h-8 flex-1 rounded-md bg-black/62 px-2 text-[11px] font-black text-white backdrop-blur transition hover:bg-[#1463FF]">
                Marcar capa
              </button>
              <button type="button" onClick={() => onRemoveMedia(item.id)} className="inline-flex size-8 items-center justify-center rounded-md bg-black/62 text-white backdrop-blur transition hover:bg-rose-500" title="Remover mídia">
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs font-medium text-slate-500">{media.length} arquivos selecionados</p>
    </FormCard>
  )
}

function ProposalSummaryCard({
  gameName,
  proposalTitle,
  desiredPrice,
  mediaCount,
  coverUrl,
  coverType,
}: {
  gameName: string
  proposalTitle: string
  desiredPrice: number
  mediaCount: number
  coverUrl?: string
  coverType?: MediaType
}) {
  return (
    <SideCard title="Resumo do envio">
      <div className="flex gap-4">
        {coverUrl && coverType === 'video' ? (
          <video src={coverUrl} className="size-24 rounded-lg border border-white/10 object-cover" muted playsInline preload="metadata" />
        ) : coverUrl ? (
          <img src={coverUrl} alt="Capa selecionada" className="size-24 rounded-lg border border-white/10 object-cover" />
        ) : null}
        <div className="min-w-0 space-y-2">
          <SummaryLine label="Jogo" value={gameName || 'Não informado'} />
          <SummaryLine label="Título" value={proposalTitle || 'Não informado'} />
          <SummaryLine label="Preço desejado" value={formatBRL(desiredPrice)} />
          <SummaryLine label="Mídias enviadas" value={`${mediaCount} arquivos`} />
        </div>
      </div>
    </SideCard>
  )
}

function ProposalHowItWorksCard() {
  return (
    <SideCard title="Como funciona">
      {['Envie as informações principais da conta', 'A ACCSTORE analisa a proposta', 'A equipe pode fazer uma oferta', 'Se necessário, entraremos em contato para mais detalhes'].map((step, index) => (
        <div key={step} className="flex gap-3 py-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1463FF] text-xs font-black text-white">{index + 1}</span>
          <p className="text-sm leading-6 text-slate-300">{step}</p>
        </div>
      ))}
    </SideCard>
  )
}

function ProposalSafetyCard() {
  return (
    <SideCard title="Segurança em primeiro lugar">
      <div className="mb-4 flex gap-3">
        <ShieldCheck aria-hidden="true" className="mt-1 size-7 shrink-0 text-blue-300" />
        <p className="text-sm leading-6 text-slate-300">
          A proposta é avaliada pela ACCSTORE antes de qualquer negociação.
        </p>
      </div>
      {['análise manual da equipe', 'informações analisadas com cuidado', 'pagamento seguro e verificado'].map((item) => (
        <div key={item} className="flex items-center gap-3 py-2 text-sm font-semibold text-slate-300">
          <Check aria-hidden="true" className="size-4 text-emerald-300" />
          {item}
        </div>
      ))}
    </SideCard>
  )
}

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="acc-surface space-y-4 p-4">
      <h2 className="text-sm font-black text-white">{title}</h2>
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

function TextField({ label, placeholder, value, type = 'text', disabled, onChange }: { label: string; placeholder: string; value: string; type?: string; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-300">{label}</span>
      <input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-11 w-full rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/70 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/55 disabled:opacity-50" />
    </label>
  )
}

function TextareaField({ label, placeholder, rows, value, onChange }: { label: string; placeholder: string; rows: number; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-300">{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-none rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/70 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/55" />
    </label>
  )
}

function CheckboxField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-4 rounded border-[rgba(120,140,255,0.28)] bg-[#101827] accent-[#1463FF]" />
      <span>{label}</span>
    </label>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-black text-white">{value}</p>
    </div>
  )
}

function parseBRL(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return Number(normalized) || 0
}
