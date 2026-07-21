'use server'

import { requireWriteAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { BANNER_BUCKET } from './banner-utils'

export async function uploadBannerImageAction(formData: FormData) {
  const admin = await requireWriteAdmin()
  if (!admin) {
    return { error: '이 작업을 수행할 권한이 없습니다.' }
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return { error: '파일이 없습니다.' }
  }

  const adminClient = createAdminClient()
  const fileName = `banner_${Date.now()}.jpg`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data, error } = await adminClient.storage
    .from(BANNER_BUCKET)
    .upload(fileName, buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (error) {
    return { error: error.message }
  }

  const { data: urlData } = adminClient.storage
    .from(BANNER_BUCKET)
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl }
}
