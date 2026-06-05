'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadGachaThumbnailAction(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return { error: '파일이 없습니다.' }

  const adminClient = createAdminClient()
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data, error } = await adminClient.storage
    .from('gacha-images')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) return { error: error.message }

  const { data: urlData } = adminClient.storage
    .from('gacha-images')
    .getPublicUrl(data.path)

  return { url: urlData.publicUrl }
}
