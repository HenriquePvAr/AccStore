import { PlayCircle } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { getAccountMediaItems, inferMediaMimeType, inferMediaType } from '../lib/media'
import { cn } from '../lib/utils'
import type { Account, AccountCategory, AccountMedia } from '../services/types'

type AccountTheme = 'starter' | 'balanced' | 'advanced' | 'rare' | 'complete'

interface ThemeStyle {
  background: string
  accent: string
  glow: string
}

const themeStyles: Record<AccountTheme, ThemeStyle> = {
  starter: {
    background: 'linear-gradient(135deg, #070B16 0%, #182033 54%, #070B16 100%)',
    accent: '#94A3B8',
    glow: 'rgba(148,163,184,0.22)',
  },
  balanced: {
    background: 'linear-gradient(135deg, #06100C 0%, #0C3F31 48%, #070B16 100%)',
    accent: '#34D399',
    glow: 'rgba(34,197,94,0.26)',
  },
  advanced: {
    background: 'linear-gradient(135deg, #07101D 0%, #102A66 45%, #080A18 100%)',
    accent: '#60A5FA',
    glow: 'rgba(96,165,250,0.3)',
  },
  rare: {
    background: 'linear-gradient(135deg, #090717 0%, #31106A 52%, #070B16 100%)',
    accent: '#38BDF8',
    glow: 'rgba(56,189,248,0.28)',
  },
  complete: {
    background: 'linear-gradient(135deg, #06070A 0%, #1E1A4A 45%, #070B16 100%)',
    accent: '#1463FF',
    glow: 'rgba(20,99,255,0.3)',
  },
}

const fallbackImageByTheme: Record<AccountTheme, string> = {
  starter: '/assets/accstore/card-starter.png',
  balanced: '/assets/accstore/card-balanced.png',
  advanced: '/assets/accstore/card-advanced.png',
  rare: '/assets/accstore/card-rare.png',
  complete: '/assets/accstore/card-complete.png',
}

const themeByCategory: Record<AccountCategory, AccountTheme> = {
  Básica: 'starter',
  Intermediária: 'balanced',
  Avançada: 'advanced',
  Premium: 'rare',
  Completa: 'complete',
  Rara: 'rare',
}

interface AccountArtworkProps {
  account: Account
  variant?: 'card' | 'details'
  className?: string
  media?: AccountMedia
  controls?: boolean
}

export function AccountArtwork({ account, variant = 'card', className, media, controls = false }: AccountArtworkProps) {
  const themeName = themeByCategory[account.category] ?? 'advanced'
  const theme = themeStyles[themeName]
  const accountMedia = useMemo(() => getAccountMediaItems(account), [account])
  const selectedMedia = media ?? accountMedia.find((item) => item.isCover) ?? accountMedia[0]
  const fallbackSrc = variant === 'details' ? '/assets/accstore/account-detail-cover.png' : fallbackImageByTheme[themeName]
  const assetSrc = selectedMedia?.url || fallbackSrc
  const assetType = selectedMedia ? inferMediaType(selectedMedia) : inferMediaType(assetSrc)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc === assetSrc
  const showDecor = !(assetType === 'video' && controls && !failed)
  const style = {
    '--account-accent': theme.accent,
    '--account-glow': theme.glow,
    background: theme.background,
  } as CSSProperties

  return (
    <div
      style={style}
      className={cn(
        'relative isolate overflow-hidden rounded-lg border border-[rgba(120,140,255,0.18)] bg-[#0B1222] shadow-[inset_0_-70px_110px_rgba(0,0,0,0.48)]',
        variant === 'details' ? 'aspect-[16/10]' : 'aspect-[16/9]',
        className,
      )}
    >
      {!failed && assetType === 'video' ? (
        <video
          controls={controls}
          muted={!controls}
          playsInline
          preload="metadata"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedSrc(assetSrc)}
        >
          <source src={assetSrc} type={inferMediaMimeType(assetSrc, 'video')} />
        </video>
      ) : null}

      {!failed && assetType === 'image' ? (
        <img
          src={assetSrc}
          alt={`Imagem da ${account.title}`}
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedSrc(assetSrc)}
        />
      ) : null}

      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#101827]/80 px-6 text-center text-sm font-bold text-slate-300">
          Não foi possível carregar a mídia.
        </div>
      ) : null}

      {showDecor ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/76 via-[#070B16]/10 to-black/8" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_22%,var(--account-glow),transparent_30%),linear-gradient(115deg,rgba(20,99,255,0.1),transparent_34%,rgba(56,189,248,0.1)_78%)] mix-blend-screen" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.1)_24%,transparent_44%,rgba(255,255,255,0.06)_66%,transparent_82%)] opacity-40" />
          <div className="pointer-events-none absolute -right-10 top-4 h-32 w-32 rounded-full bg-[var(--account-glow)] blur-3xl" />
        </>
      ) : null}

      {assetType === 'video' && !controls && !failed ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur">
            <PlayCircle aria-hidden="true" className="size-7" />
          </span>
        </div>
      ) : null}
    </div>
  )
}
