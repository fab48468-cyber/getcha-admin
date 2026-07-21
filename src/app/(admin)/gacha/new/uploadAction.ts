'use server'

import { getAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function uploadGachaThumbnailAction(formData: FormData) {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const file = formData.get('file') as File | null
  if (!file) return { error: '파일이 없습니다.' }

  const ext = ALLOWED_MIME[file.type]
  if (!ext) {
    return { error: 'JPG, PNG, WEBP 형식만 업로드할 수 있습니다.' }
  }

  const adminClient = createAdminClient()
  const fileName = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data, error } = await adminClient.storage
    .from('gacha-images')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) return { error: error.message }

  const { data: urlData } = adminClient.storage
    .from('gacha-images')
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl }
}
