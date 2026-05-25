import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Headphones, LockKeyhole, Mail, Phone, PlayCircle, QrCode, ShieldCheck, ShoppingCart, Sparkles, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { getAccountMediaItems, inferMediaType } from '../lib/media'
import { accountToHighlights } from '../services/accountsService'
import { createOrderConversation } from '../services/messagesService'
import { createGuestOrder, createOrder } from '../services/ordersService'
import { copyPixCode, createAsaasPayment, createGuestAsaasPayment, type AsaasPaymentResult } from '../services/paymentsService'
import type { Account, AccountMedia } from '../services/types'
import { formatBRL } from '../lib/format'
import { cn } from '../lib/utils'
import { isValidWhatsApp } from '../lib/whatsapp'
import { AccountArtwork } from './AccountArtwork'

interface AccountDetailsProps {
  account: Account
  onBack: () => void
}

const purchaseGuarantees = [
  'Suporte durante a entrega',
  'Segurança no processo',
  'Anúncio revisado',
  'Atendimento em caso de dúvida',
]

export function AccountDetails({ account, onBack }: AccountDetailsProps) {
  const { user } = useAuth()
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [checkout, setCheckout] = useState<AsaasPaymentResult | null>(null)
  const [copyNotice, setCopyNotice] = useState<string | null>(null)
  const [guestCheckoutOpen, setGuestCheckoutOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestWhatsapp, setGuestWhatsapp] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestAdultConfirmed, setGuestAdultConfirmed] = useState(false)
  const [trackingLink, setTrackingLink] = useState<string | null>(null)
  const highlights = accountToHighlights(account)

  const handleBuy = async () => {
    if (!user) {
      setGuestCheckoutOpen(true)
      setError(null)
      setNotice(null)
      return
    }

    if (!acceptedTerms) {
      setError('Você precisa aceitar os termos para continuar.')
      return
    }

    setCreatingOrder(true)
    setError(null)
    setNotice(null)

    try {
      const order = await createOrder({
        buyerId: user.id,
        sellerId: account.sellerId,
        accountId: account.id,
        amount: account.price,
      })
      await createOrderConversation({
        orderId: order.id,
        buyerId: user.id,
        sellerId: account.sellerId,
        accountId: account.id,
      }).catch(() => undefined)
      const payment = await createAsaasPayment(order.id)
      setCheckout(payment)
      setNotice(`Pedido ${order.orderCode} criado. A confirmação é automática após o pagamento.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erro ao criar pedido ou gerar pagamento.')
    } finally {
      setCreatingOrder(false)
    }
  }

  const handleGuestCheckout = async () => {
    if (!guestName.trim()) {
      setError('Informe seu nome completo.')
      return
    }

    if (!isValidWhatsApp(guestWhatsapp)) {
      setError('Informe um WhatsApp válido.')
      return
    }

    if (!acceptedTerms || !guestAdultConfirmed) {
      setError('Confirme os termos para continuar.')
      return
    }

    setCreatingOrder(true)
    setError(null)
    setNotice(null)
    setCheckout(null)
    setTrackingLink(null)

    try {
      const order = await createGuestOrder({
        accountId: account.id,
        name: guestName,
        whatsapp: guestWhatsapp,
        email: guestEmail,
      })

      if (!order.guestToken) {
        throw new Error('Não foi possível gerar o link de acompanhamento.')
      }

      const payment = await createGuestAsaasPayment(order.id, order.guestToken)
      const nextTrackingLink = `/acompanhar-pedido/${order.guestToken}`
      setCheckout(payment)
      setTrackingLink(nextTrackingLink)
      setNotice('Pedido criado. Guarde o link para acompanhar seu pedido.')
    } catch {
      setError('Não foi possível criar o pedido ou gerar o Pix agora.')
    } finally {
      setCreatingOrder(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-slate-200 transition hover:border-[#1463FF]/50 hover:bg-[#101827]/70 hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar
        </button>

        <AccountMediaGallery account={account} />

        <section className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-blue-300">Sobre esta conta</p>
          <h2 className="mt-1 text-xl font-black text-white">Informações importantes</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{account.publicDescription}</p>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <section className="acc-surface p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="acc-badge border-blue-400/22 bg-blue-500/12 text-blue-200">{account.gameName || 'Conta gamer'}</span>
            <span className="acc-badge border-emerald-400/18 bg-emerald-500/12 text-emerald-200">Anúncio revisado</span>
          </div>
          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">{account.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{account.publicDescription}</p>

          <div className="mt-6 rounded-lg border border-[#1495FF]/24 bg-[linear-gradient(135deg,rgba(0,112,209,0.18),rgba(7,11,22,0.86))] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Preço</p>
            <p className="acc-money mt-1 text-4xl font-black tracking-tight text-white">{formatBRL(account.price)}</p>
            <p className="mt-2 text-xs font-semibold text-slate-400">Pagamento Pix com confirmação automática quando disponível.</p>
          </div>

          <div className="mt-4 rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/58 p-3">
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 size-4 rounded border-[rgba(120,140,255,0.28)] bg-[#101827] accent-[#1463FF]"
              />
              <span>Li e aceito o Termo de Compra e Responsabilidade da ACCSTORE.</span>
            </label>
            <Link to="/termos" className="mt-2 inline-flex text-sm font-bold text-blue-300 transition hover:text-white">
              Ler termo completo
            </Link>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => void handleBuy()}
              disabled={creatingOrder || account.status !== 'published'}
              className="acc-button-commerce inline-flex min-h-12 w-full items-center justify-center gap-2 px-4 text-sm font-black transition disabled:opacity-60"
            >
              <ShoppingCart aria-hidden="true" className="size-5" />
              {creatingOrder ? 'Criando pedido...' : user ? 'Comprar agora' : 'Comprar sem criar conta'}
            </button>
          </div>

          {notice ? <p className="mt-4 rounded-lg border border-emerald-400/24 bg-emerald-500/12 p-3 text-sm font-semibold text-emerald-200">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-lg border border-rose-400/24 bg-rose-500/12 p-3 text-sm font-semibold text-rose-200">{error}</p> : null}
        </section>

        {!user && guestCheckoutOpen ? (
          <GuestCheckoutPanel
            name={guestName}
            whatsapp={guestWhatsapp}
            email={guestEmail}
            acceptedTerms={acceptedTerms}
            adultConfirmed={guestAdultConfirmed}
            submitting={creatingOrder}
            trackingLink={trackingLink}
            onNameChange={setGuestName}
            onWhatsappChange={setGuestWhatsapp}
            onEmailChange={setGuestEmail}
            onAcceptedTermsChange={setAcceptedTerms}
            onAdultConfirmedChange={setGuestAdultConfirmed}
            onSubmit={handleGuestCheckout}
          />
        ) : null}

        {checkout ? (
          <PaymentPanel
            checkout={checkout}
            copyNotice={copyNotice}
            onCopyPix={async () => {
              if (!checkout.pixCopyPaste) return
              await copyPixCode(checkout.pixCopyPaste)
              setCopyNotice('Código Pix copiado.')
            }}
          />
        ) : null}

        <section className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-5">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-5 text-[#38BDF8]" />
            <h2 className="text-lg font-black text-white">Detalhes da conta</h2>
          </div>
          <div className="mt-4 grid gap-2.5">
            {highlights.length > 0 ? (
              highlights.map((highlight) => (
                <div key={highlight} className="flex min-h-10 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-200">
                  <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-[#60A5FA]" />
                  {highlight}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Sem detalhes públicos adicionais.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[rgba(120,140,255,0.18)] bg-[#0B1222]/88 p-5">
          <div className="flex items-center gap-2">
            <LockKeyhole aria-hidden="true" className="size-5 text-[#60A5FA]" />
            <h2 className="text-lg font-black text-white">Garantias da compra</h2>
          </div>
          <div className="mt-4 grid gap-2.5">
            {purchaseGuarantees.map((guarantee, index) => {
              const Icon = index === 0 ? Headphones : CheckCircle2
              return (
                <div key={guarantee} className="flex min-h-10 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-200">
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-[#38BDF8]" />
                  {guarantee}
                </div>
              )
            })}
          </div>
        </section>
      </aside>
    </section>
  )
}

function GuestCheckoutPanel({
  name,
  whatsapp,
  email,
  acceptedTerms,
  adultConfirmed,
  submitting,
  trackingLink,
  onNameChange,
  onWhatsappChange,
  onEmailChange,
  onAcceptedTermsChange,
  onAdultConfirmedChange,
  onSubmit,
}: {
  name: string
  whatsapp: string
  email: string
  acceptedTerms: boolean
  adultConfirmed: boolean
  submitting: boolean
  trackingLink: string | null
  onNameChange: (value: string) => void
  onWhatsappChange: (value: string) => void
  onEmailChange: (value: string) => void
  onAcceptedTermsChange: (value: boolean) => void
  onAdultConfirmedChange: (value: boolean) => void
  onSubmit: () => Promise<void>
}) {
  return (
    <section className="acc-safe-panel p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-500/[0.12] text-blue-200">
          <Phone aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-white">Comprar sem criar conta</h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">Informe seu WhatsApp para receber atendimento. Você poderá criar uma conta depois.</p>
        </div>
      </div>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit()
        }}
      >
        <GuestTextField icon={UserRound} label="Nome completo" value={name} onChange={onNameChange} placeholder="Seu nome" />
        <GuestTextField icon={Phone} label="WhatsApp" value={whatsapp} onChange={onWhatsappChange} placeholder="(92) 99999-9999" inputMode="tel" />
        <GuestTextField icon={Mail} label="E-mail opcional" value={email} onChange={onEmailChange} placeholder="voce@email.com" type="email" />

        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-300">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => onAcceptedTermsChange(event.target.checked)}
            className="mt-1 size-4 rounded border-[rgba(120,140,255,0.28)] bg-[#101827] accent-[#1463FF]"
          />
          <span>Li e aceito os termos da ACCSTORE.</span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-300">
          <input
            type="checkbox"
            checked={adultConfirmed}
            onChange={(event) => onAdultConfirmedChange(event.target.checked)}
            className="mt-1 size-4 rounded border-[rgba(120,140,255,0.28)] bg-[#101827] accent-[#1463FF]"
          />
          <span>Confirmo que tenho autorização para realizar esta compra.</span>
        </label>

        <button type="submit" disabled={submitting} className="acc-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 px-4 text-sm font-black transition disabled:opacity-60">
          <QrCode aria-hidden="true" className="size-4" />
          {submitting ? 'Gerando Pix...' : 'Gerar Pix'}
        </button>
      </form>

      {trackingLink ? (
        <div className="mt-4 rounded-lg border border-emerald-400/22 bg-emerald-500/10 p-3">
          <p className="text-sm font-bold text-emerald-100">Guarde este link para acompanhar seu pedido.</p>
          <Link to={trackingLink} className="mt-2 inline-flex items-center gap-2 text-sm font-black text-emerald-200 transition hover:text-white">
            Abrir acompanhamento
            <ExternalLink aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : null}
    </section>
  )
}

function GuestTextField({
  icon: Icon,
  label,
  placeholder,
  value,
  type = 'text',
  inputMode,
  onChange,
}: {
  icon: LucideIcon
  label: string
  placeholder: string
  value: string
  type?: string
  inputMode?: 'text' | 'tel'
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-300">{label}</span>
      <span className="flex min-h-11 items-center rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#101827]/70 px-3 transition focus-within:border-blue-400/55">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
        />
      </span>
    </label>
  )
}

function PaymentPanel({ checkout, copyNotice, onCopyPix }: { checkout: AsaasPaymentResult; copyNotice: string | null; onCopyPix: () => Promise<void> }) {
  const qrCodeSrc = checkout.pixQrCode
    ? checkout.pixQrCode.startsWith('data:image')
      ? checkout.pixQrCode
      : `data:image/png;base64,${checkout.pixQrCode}`
    : undefined

  return (
    <section className="acc-safe-panel p-5 shadow-[0_18px_70px_rgba(0,0,0,0.24)]">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-400/[0.12] text-emerald-200">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-white">Pagamento Pix</h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">A confirmação é automática após o pagamento.</p>
        </div>
      </div>

      {qrCodeSrc ? (
        <div className="mt-4 rounded-lg border border-emerald-200/30 bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-700">
            <QrCode aria-hidden="true" className="size-4" />
            QR Code Pix
          </div>
          <img src={qrCodeSrc} alt="QR Code Pix" className="mx-auto size-52 object-contain" />
        </div>
      ) : null}

      {checkout.pixCopyPaste ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Pix copia e cola</p>
          <p className="mt-2 max-h-24 overflow-y-auto rounded-lg border border-white/10 bg-[#070B16] p-3 text-xs leading-5 text-slate-300">
            {checkout.pixCopyPaste}
          </p>
          <button
            type="button"
            onClick={() => void onCopyPix()}
            className="acc-button-primary mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 text-sm font-black transition"
          >
            <Copy aria-hidden="true" className="size-4" />
            Copiar código Pix
          </button>
          {copyNotice ? <p className="mt-2 text-sm font-bold text-emerald-300">{copyNotice}</p> : null}
        </div>
      ) : null}

      {checkout.paymentUrl ? (
        <a
          href={checkout.paymentUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#1463FF] px-4 text-sm font-black text-white transition hover:bg-[#1D74FF]"
        >
          Abrir pagamento
        </a>
      ) : null}
    </section>
  )
}

function AccountMediaGallery({ account }: { account: Account }) {
  const mediaItems = useMemo(() => getAccountMediaItems(account), [account])
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(mediaItems[0]?.id ?? null)
  const selectedMedia = mediaItems.find((item) => item.id === selectedMediaId) ?? mediaItems[0]

  return (
    <section className="space-y-3">
      <AccountArtwork
        account={account}
        media={selectedMedia}
        variant="details"
        controls={Boolean(selectedMedia && inferMediaType(selectedMedia) === 'video')}
        className="rounded-xl shadow-[0_20px_70px_rgba(0,0,0,0.32)]"
      />

      {mediaItems.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {mediaItems.map((item) => (
            <MediaThumbnail
              key={item.id}
              media={item}
              selected={item.id === selectedMedia?.id}
              onSelect={() => setSelectedMediaId(item.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function MediaThumbnail({ media, selected, onSelect }: { media: AccountMedia; selected: boolean; onSelect: () => void }) {
  const mediaType = inferMediaType(media)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const failed = failedUrl === media.url

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative aspect-video overflow-hidden rounded-lg border bg-[#101827] transition',
        selected ? 'border-[#38BDF8] shadow-[0_0_18px_rgba(56,189,248,0.18)]' : 'border-white/10 hover:border-blue-300/50',
      )}
      title={mediaType === 'video' ? 'Selecionar vídeo' : 'Selecionar imagem'}
    >
      {!failed && mediaType === 'video' ? (
        <>
          <video src={media.url} muted playsInline preload="metadata" className="size-full object-cover" onError={() => setFailedUrl(media.url)} />
          <span className="absolute inset-0 flex items-center justify-center bg-black/18 text-white">
            <PlayCircle aria-hidden="true" className="size-6 drop-shadow" />
          </span>
        </>
      ) : null}

      {!failed && mediaType === 'image' ? (
        <img src={media.url} alt="Miniatura da mídia da conta" className="size-full object-cover" onError={() => setFailedUrl(media.url)} />
      ) : null}

      {failed ? (
        <span className="flex size-full items-center justify-center px-2 text-center text-[11px] font-bold text-slate-400">
          Mídia indisponível
        </span>
      ) : null}
    </button>
  )
}
