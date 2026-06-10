'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = {
  error: string
  success?: string
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function getNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key))
  return Number.isFinite(value) ? value : fallback
}

export async function createGachaSeriesAction(
  _prevState: ActionState,
  formData: FormData
) {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const name = getString(formData, 'name')
  const description = getString(formData, 'description')
  const thumbnailUrl = getString(formData, 'thumbnail_url')
  const coinPricePerPull = getNumber(formData, 'coin_price_per_pull', 100)
  const maxConcurrentUsers = getNumber(formData, 'max_concurrent_users', 10)
  const status = getString(formData, 'status') || 'closed'

  if (!name) {
    return { error: '시리즈명을 입력해 주세요.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('gacha_series').insert({
    name,
    description: description || null,
    thumbnail_url: thumbnailUrl || null,
    coin_price_per_pull: coinPricePerPull,
    max_concurrent_users: maxConcurrentUsers,
    status,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/gacha')
  redirect('/gacha')
}

export async function updateGachaSeriesAction(
  seriesId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const name = getString(formData, 'name')
  const description = getString(formData, 'description')
  const thumbnailUrl = getString(formData, 'thumbnail_url')
  const coinPricePerPull = getNumber(formData, 'coin_price_per_pull', 100)
  const maxConcurrentUsers = getNumber(formData, 'max_concurrent_users', 10)
  const status = getString(formData, 'status') || 'closed'

  if (!name) {
    return { error: '시리즈명을 입력해 주세요.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('gacha_series')
    .update({
      name,
      description: description || null,
      thumbnail_url: thumbnailUrl || null,
      coin_price_per_pull: coinPricePerPull,
      max_concurrent_users: maxConcurrentUsers,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seriesId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/gacha')
  revalidatePath(`/gacha/${seriesId}`)
  return { error: '', success: '저장되었습니다.' }
}

export async function createGachaProductAction(
  seriesId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const name = getString(formData, 'name')
  const description = getString(formData, 'description')
  const imageUrl = getString(formData, 'image_url')
  const grade = getString(formData, 'grade') || 'A'
  const displayOrder = getNumber(formData, 'display_order', 0)

  if (!name) {
    return { error: '상품명을 입력해 주세요.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('gacha_products').insert({
    series_id: seriesId,
    name,
    description: description || null,
    image_url: imageUrl || null,
    grade,
    display_order: displayOrder,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/gacha/${seriesId}`)
  return { error: '', success: '상품이 추가되었습니다.' }
}

export async function addGachaInventoryAction(
  seriesId: string,
  productId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const quantity = getNumber(formData, 'quantity', 0)

  if (quantity < 1) {
    return { error: '추가할 수량을 입력해 주세요.' }
  }

  const rows = Array.from({ length: quantity }, () => ({
    series_id: seriesId,
    product_id: productId,
    status: 'available',
  }))

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('gacha_inventory').insert(rows)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/gacha')
  revalidatePath(`/gacha/${seriesId}`)
  return { error: '', success: `${quantity.toLocaleString()}개 추가되었습니다.` }
}

export async function deleteGachaSeriesAction(seriesId: string) {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('gacha_series')
    .delete()
    .eq('id', seriesId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/gacha')
  redirect('/gacha')
}
