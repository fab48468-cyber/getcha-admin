'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireWriteAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/adminLog'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = {
  error: string
  success?: string
}

const CATEGORIES = ['general', 'event', 'maintenance', 'update'] as const

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function parseDatetimeLocal(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function parseAnnouncementForm(formData: FormData) {
  const title = getString(formData, 'title')
  const content = getString(formData, 'content')
  const category = getString(formData, 'category') || 'general'
  const isPinned = formData.get('is_pinned') === 'on'
  const publishedAt = parseDatetimeLocal(getString(formData, 'published_at'))
  const expiresAt = parseDatetimeLocal(getString(formData, 'expires_at'))

  return { title, content, category, isPinned, publishedAt, expiresAt }
}

function validateAnnouncementFields(fields: ReturnType<typeof parseAnnouncementForm>) {
  if (!fields.title) {
    return '제목을 입력해 주세요.'
  }
  if (!fields.content) {
    return '내용을 입력해 주세요.'
  }
  if (!CATEGORIES.includes(fields.category as (typeof CATEGORIES)[number])) {
    return '올바른 카테고리를 선택해 주세요.'
  }
  return null
}

export async function createAnnouncementAction(
  _prevState: ActionState,
  formData: FormData
) {
  const admin = await requireWriteAdmin()
  if (!admin) {
    return { error: '이 작업을 수행할 권한이 없습니다.' }
  }

  const fields = parseAnnouncementForm(formData)
  const validationError = validateAnnouncementFields(fields)
  if (validationError) {
    return { error: validationError }
  }

  const adminClient = createAdminClient()
  const { data: inserted, error } = await adminClient
    .from('announcements')
    .insert({
      title: fields.title,
      content: fields.content,
      category: fields.category,
      is_pinned: fields.isPinned,
      published_at: fields.publishedAt,
      expires_at: fields.expiresAt,
      created_by: admin.id,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  await logAdminAction({
    adminUserId: admin.id,
    actionType: 'content_create',
    targetType: 'announcements',
    targetId: inserted?.id,
    details: { table: 'announcements', name: fields.title },
  })

  revalidatePath('/announcements')
  redirect('/announcements')
}

export async function updateAnnouncementAction(
  announcementId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const admin = await requireWriteAdmin()
  if (!admin) {
    return { error: '이 작업을 수행할 권한이 없습니다.' }
  }

  const fields = parseAnnouncementForm(formData)
  const validationError = validateAnnouncementFields(fields)
  if (validationError) {
    return { error: validationError }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('announcements')
    .update({
      title: fields.title,
      content: fields.content,
      category: fields.category,
      is_pinned: fields.isPinned,
      published_at: fields.publishedAt,
      expires_at: fields.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', announcementId)

  if (error) {
    return { error: error.message }
  }

  await logAdminAction({
    adminUserId: admin.id,
    actionType: 'content_update',
    targetType: 'announcements',
    targetId: announcementId,
    details: { table: 'announcements', name: fields.title },
  })

  revalidatePath('/announcements')
  revalidatePath(`/announcements/${announcementId}`)
  return { error: '', success: '저장되었습니다.' }
}

export async function deleteAnnouncementAction(announcementId: string) {
  const admin = await requireWriteAdmin()
  if (!admin) {
    redirect('/login')
  }

  const adminClient = createAdminClient()
  const { data: existing } = await adminClient
    .from('announcements')
    .select('title')
    .eq('id', announcementId)
    .single()

  const { error } = await adminClient
    .from('announcements')
    .delete()
    .eq('id', announcementId)

  if (error) {
    throw new Error(error.message)
  }

  await logAdminAction({
    adminUserId: admin.id,
    actionType: 'content_delete',
    targetType: 'announcements',
    targetId: announcementId,
    details: { table: 'announcements', name: existing?.title ?? announcementId },
  })

  revalidatePath('/announcements')
  redirect('/announcements')
}
