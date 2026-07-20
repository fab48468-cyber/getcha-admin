'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  BANNER_BUCKET,
  extractBannerStoragePath,
  isBannerLinkType,
  type BannerLinkType,
  type GachaSeriesPickerRow,
  type HomeBannerRow,
  type KujiSeriesPickerRow,
} from './banner-utils'

type ActionState = {
  error: string
  success?: string
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function parseDatetimeLocal(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function parseBannerForm(formData: FormData) {
  const title = getString(formData, 'title')
  const imageUrl = getString(formData, 'image_url')
  const previousImageUrl = getString(formData, 'previous_image_url')
  const linkTypeRaw = getString(formData, 'link_type') || 'none'
  const linkValueRaw = getString(formData, 'link_value')
  const displayOrderRaw = getString(formData, 'display_order')
  const isActive = formData.get('is_active') === 'on'
  const startsAt = parseDatetimeLocal(getString(formData, 'starts_at'))
  const endsAt = parseDatetimeLocal(getString(formData, 'ends_at'))

  const displayOrder = Number.parseInt(displayOrderRaw, 10)

  return {
    title,
    imageUrl,
    previousImageUrl: previousImageUrl || null,
    linkTypeRaw,
    linkValueRaw,
    displayOrder,
    isActive,
    startsAt,
    endsAt,
  }
}

function normalizeLinkValue(
  linkType: BannerLinkType,
  linkValueRaw: string
): { linkValue: string | null; error: string | null } {
  if (linkType === 'none') {
    return { linkValue: null, error: null }
  }

  if (!linkValueRaw) {
    if (linkType === 'external_url') {
      return { linkValue: null, error: '외부 URL을 입력해 주세요.' }
    }
    return { linkValue: null, error: '연결할 시리즈를 선택해 주세요.' }
  }

  if (linkType === 'external_url') {
    if (!/^https:\/\//i.test(linkValueRaw)) {
      return {
        linkValue: null,
        error: '외부 URL은 https:// 로 시작해야 합니다.',
      }
    }
    return { linkValue: linkValueRaw, error: null }
  }

  return { linkValue: linkValueRaw, error: null }
}

function validateBannerFields(
  fields: ReturnType<typeof parseBannerForm>,
  options: { requireImage: boolean }
) {
  if (!fields.title) {
    return '제목을 입력해 주세요.'
  }
  if (options.requireImage && !fields.imageUrl) {
    return '이미지를 업로드해 주세요.'
  }
  if (!isBannerLinkType(fields.linkTypeRaw)) {
    return '올바른 링크 유형을 선택해 주세요.'
  }
  if (Number.isNaN(fields.displayOrder)) {
    return '표시 순서를 올바르게 입력해 주세요.'
  }
  if (
    fields.startsAt &&
    fields.endsAt &&
    new Date(fields.endsAt).getTime() <= new Date(fields.startsAt).getTime()
  ) {
    return '종료 일시는 시작 일시보다 이후여야 합니다.'
  }

  const { error } = normalizeLinkValue(fields.linkTypeRaw, fields.linkValueRaw)
  return error
}

async function removeBannerImageBestEffort(
  imageUrl: string | null | undefined
) {
  if (!imageUrl) return
  const path = extractBannerStoragePath(imageUrl)
  if (!path) return

  const adminClient = createAdminClient()
  const { error } = await adminClient.storage.from(BANNER_BUCKET).remove([path])
  if (error) {
    console.error('banner image remove failed:', error.message)
  }
}

export async function listHomeBannersAction(): Promise<{
  data: HomeBannerRow[]
  error?: string
}> {
  const admin = await getAdminUser()
  if (!admin) {
    return { data: [], error: '관리자 인증이 필요합니다.' }
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('home_banners')
    .select(
      'id, title, image_url, link_type, link_value, display_order, is_active, starts_at, ends_at, created_at, updated_at'
    )
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data ?? []) as HomeBannerRow[] }
}

export async function fetchBannerPickerDataAction(): Promise<{
  gacha: GachaSeriesPickerRow[]
  kuji: KujiSeriesPickerRow[]
  error?: string
}> {
  const admin = await getAdminUser()
  if (!admin) {
    return { gacha: [], kuji: [], error: '관리자 인증이 필요합니다.' }
  }

  const adminClient = createAdminClient()

  const [gachaResult, kujiResult] = await Promise.all([
    adminClient
      .from('gacha_series')
      .select('id, name, thumbnail_url, status')
      .order('created_at', { ascending: false }),
    adminClient
      .from('kuji_series')
      .select('id, name, thumbnail_url, status, remaining_tickets')
      .order('created_at', { ascending: false }),
  ])

  if (gachaResult.error) {
    return { gacha: [], kuji: [], error: gachaResult.error.message }
  }
  if (kujiResult.error) {
    return { gacha: [], kuji: [], error: kujiResult.error.message }
  }

  return {
    gacha: (gachaResult.data ?? []) as GachaSeriesPickerRow[],
    kuji: (kujiResult.data ?? []) as KujiSeriesPickerRow[],
  }
}

export async function createBannerAction(
  _prevState: ActionState,
  formData: FormData
) {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const fields = parseBannerForm(formData)
  const validationError = validateBannerFields(fields, { requireImage: true })
  if (validationError) {
    return { error: validationError }
  }

  const linkType = fields.linkTypeRaw as BannerLinkType
  const { linkValue } = normalizeLinkValue(linkType, fields.linkValueRaw)

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('home_banners').insert({
    title: fields.title,
    image_url: fields.imageUrl,
    link_type: linkType,
    link_value: linkValue,
    display_order: fields.displayOrder,
    is_active: fields.isActive,
    starts_at: fields.startsAt,
    ends_at: fields.endsAt,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/banners')
  redirect('/banners')
}

export async function updateBannerAction(
  bannerId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const fields = parseBannerForm(formData)
  const validationError = validateBannerFields(fields, {
    requireImage: !fields.previousImageUrl,
  })
  if (validationError) {
    return { error: validationError }
  }

  const imageUrl = fields.imageUrl || fields.previousImageUrl
  if (!imageUrl) {
    return { error: '이미지를 업로드해 주세요.' }
  }

  const linkType = fields.linkTypeRaw as BannerLinkType
  const { linkValue } = normalizeLinkValue(linkType, fields.linkValueRaw)

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('home_banners')
    .update({
      title: fields.title,
      image_url: imageUrl,
      link_type: linkType,
      link_value: linkValue,
      display_order: fields.displayOrder,
      is_active: fields.isActive,
      starts_at: fields.startsAt,
      ends_at: fields.endsAt,
    })
    .eq('id', bannerId)

  if (error) {
    return { error: error.message }
  }

  if (
    fields.previousImageUrl &&
    imageUrl !== fields.previousImageUrl
  ) {
    await removeBannerImageBestEffort(fields.previousImageUrl)
  }

  revalidatePath('/banners')
  revalidatePath(`/banners/${bannerId}`)
  return { error: '', success: '저장되었습니다.' }
}

export async function toggleBannerActiveAction(
  bannerId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }
  if (!bannerId) {
    return { error: '배너 ID가 필요합니다.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('home_banners')
    .update({ is_active: isActive })
    .eq('id', bannerId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/banners')
  return {}
}

export async function deleteBannerAction(bannerId: string) {
  const admin = await getAdminUser()
  if (!admin) {
    redirect('/login')
  }

  const adminClient = createAdminClient()
  const { data: existing, error: fetchError } = await adminClient
    .from('home_banners')
    .select('id, image_url')
    .eq('id', bannerId)
    .single()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const { error } = await adminClient
    .from('home_banners')
    .delete()
    .eq('id', bannerId)

  if (error) {
    throw new Error(error.message)
  }

  await removeBannerImageBestEffort(existing?.image_url)

  revalidatePath('/banners')
  redirect('/banners')
}
