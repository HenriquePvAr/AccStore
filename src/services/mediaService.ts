import { requireSupabase } from '../lib/supabaseClient'
import type { MediaType, UploadedMedia } from './types'

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
const accountBucket = 'account-media'
const proposalBucket = 'proposal-media'
const avatarBucket = 'avatars'

function assertFileAllowed(file: File) {
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error(`Arquivo ${file.name} inválido. Use JPG, PNG, WEBP, MP4, WEBM ou MOV.`)
  }
}

function getMediaType(file: File): MediaType {
  return file.type.startsWith('video') ? 'video' : 'image'
}

function safeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '-')
    .toLowerCase()
}

async function uploadFiles(bucket: string, files: File[], userId?: string): Promise<UploadedMedia[]> {
  const supabase = requireSupabase()
  const basePath = userId || 'anonymous'

  return Promise.all(
    files.map(async (file) => {
      assertFileAllowed(file)
      const path = `${basePath}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        upsert: false,
      })

      if (error) {
        throw error
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)

      return {
        path,
        url: data.publicUrl,
        type: getMediaType(file),
      }
    }),
  )
}

export async function uploadAccountMedia(files: File[], userId?: string) {
  return uploadFiles(accountBucket, files, userId)
}

export async function uploadProposalMedia(files: File[], userId?: string) {
  return uploadFiles(proposalBucket, files, userId)
}

export async function uploadAvatar(file: File, userId: string) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Envie uma imagem JPG, PNG ou WEBP.')
  }

  const supabase = requireSupabase()
  const path = `${userId}/avatar-${Date.now()}-${safeFileName(file.name)}`
  const { error } = await supabase.storage.from(avatarBucket).upload(path, file, {
    contentType: file.type,
    upsert: true,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from(avatarBucket).getPublicUrl(path)

  return {
    path,
    url: data.publicUrl,
    type: 'image' as const,
  }
}

export async function deleteMedia(idOrPath: string, bucket = accountBucket) {
  const supabase = requireSupabase()
  const { error } = await supabase.storage.from(bucket).remove([idOrPath])

  if (error) {
    throw error
  }
}
