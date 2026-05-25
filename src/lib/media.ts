import type { Account, AccountMedia, MediaType } from '../services/types'

const videoExtensions = ['.mp4', '.webm', '.mov']
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp']

function normalizedUrl(url: string) {
  return url.split('?')[0]?.split('#')[0]?.toLowerCase() ?? ''
}

export function inferMediaType(media?: Pick<AccountMedia, 'type' | 'url'> | string | null): MediaType {
  if (!media) return 'image'

  if (typeof media !== 'string' && (media.type === 'image' || media.type === 'video')) {
    return media.type
  }

  const rawValue = typeof media === 'string' ? media : media.url
  const lowerValue = rawValue.toLowerCase()

  if (lowerValue.startsWith('video/')) return 'video'
  if (lowerValue.startsWith('image/')) return 'image'

  const url = normalizedUrl(rawValue)

  if (videoExtensions.some((extension) => url.endsWith(extension))) {
    return 'video'
  }

  if (imageExtensions.some((extension) => url.endsWith(extension))) {
    return 'image'
  }

  return 'image'
}

export function inferMediaMimeType(url: string, type?: MediaType) {
  const cleanUrl = normalizedUrl(url)

  if ((type ?? inferMediaType(url)) === 'video') {
    if (cleanUrl.endsWith('.webm')) return 'video/webm'
    if (cleanUrl.endsWith('.mov')) return 'video/quicktime'
    return 'video/mp4'
  }

  if (cleanUrl.endsWith('.png')) return 'image/png'
  if (cleanUrl.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

export function getAccountMediaItems(account: Account) {
  const media = account.media.filter((item) => item.url)

  if (media.length > 0) {
    return media
  }

  if (!account.coverMediaUrl) {
    return []
  }

  return [
    {
      id: `${account.id}-cover`,
      accountId: account.id,
      url: account.coverMediaUrl,
      type: inferMediaType(account.coverMediaUrl),
      isCover: true,
      createdAt: account.createdAt,
    },
  ] satisfies AccountMedia[]
}
