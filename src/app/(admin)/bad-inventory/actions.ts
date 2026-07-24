'use server'

import { revalidatePath } from 'next/cache'
import { requireWriteAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/adminLog'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = {
  error: string
  success?: string
}

type PoolType = 'random_exchange' | 'mystery_gacha'
type ProductType = 'gacha' | 'kuji'
type Source = 'user_return' | 'admin_stock'

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function getPoolType(formData: FormData): PoolType | null {
  const value = getString(formData, 'pool_type')
  return value === 'random_exchange' || value === 'mystery_gacha' ? value : null
}

function getProductType(formData: FormData): ProductType | null {
  const value = getString(formData, 'product_type')
  return value === 'gacha' || value === 'kuji' ? value : null
}

export async function addBadInventoryAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireWriteAdmin()
  if (!admin) {
    return { error: '이 작업을 수행할 권한이 없습니다.' }
  }

  const poolType = getPoolType(formData)
  const productType = getProductType(formData)
  const productId = getString(formData, 'product_id')
  const adminNote = getString(formData, 'admin_note')
  const isFeatured = formData.get('is_featured') === 'on'

  if (!poolType) {
    return { error: '풀 유형이 올바르지 않습니다.' }
  }
  if (!productType) {
    return { error: '상품 종류를 선택해 주세요.' }
  }
  if (!productId) {
    return { error: '상품 ID를 입력해 주세요.' }
  }

  const adminClient = createAdminClient()
  const productTable =
    productType === 'gacha' ? 'gacha_products' : 'kuji_products'
  const { data: product, error: productError } = await adminClient
    .from(productTable)
    .select('id')
    .eq('id', productId)
    .single()

  if (productError || !product) {
    return { error: '해당 상품을 찾을 수 없습니다. ID를 확인해 주세요.' }
  }

  const source: Source = 'admin_stock'
  const insertPayload: Record<string, unknown> = {
    product_id: productId,
    product_type: productType,
    pool_type: poolType,
    source,
    status: 'available',
    admin_note: adminNote || null,
  }

  if (poolType === 'mystery_gacha') {
    insertPayload.is_featured = isFeatured
  }

  const { data: inserted, error: insertError } = await adminClient
    .from('bad_inventory')
    .insert(insertPayload)
    .select('id')
    .single()

  if (insertError) {
    return { error: insertError.message }
  }

  await logAdminAction({
    adminUserId: admin.id,
    actionType: 'content_create',
    targetType: 'bad_inventory',
    targetId: inserted?.id,
    details: { table: 'bad_inventory', pool_type: poolType, product_type: productType },
  })

  revalidatePath('/bad-inventory')
  return { error: '', success: '재고가 추가되었습니다.' }
}

export async function toggleFeaturedAction(
  itemId: string,
  isFeatured: boolean
): Promise<{ error?: string }> {
  const admin = await requireWriteAdmin()
  if (!admin) {
    return { error: '이 작업을 수행할 권한이 없습니다.' }
  }
  if (!itemId) {
    return { error: '항목 ID가 필요합니다.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('bad_inventory')
    .update({ is_featured: isFeatured })
    .eq('id', itemId)
    .eq('pool_type', 'mystery_gacha')

  if (error) {
    return { error: error.message }
  }

  await logAdminAction({
    adminUserId: admin.id,
    actionType: 'content_update',
    targetType: 'bad_inventory',
    targetId: itemId,
    details: { table: 'bad_inventory', is_featured: isFeatured },
  })

  revalidatePath('/bad-inventory')
  return {}
}

export async function consumeItemAction(
  itemId: string
): Promise<{ error?: string }> {
  const admin = await requireWriteAdmin()
  if (!admin) {
    return { error: '이 작업을 수행할 권한이 없습니다.' }
  }
  if (!itemId) {
    return { error: '항목 ID가 필요합니다.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('bad_inventory')
    .update({
      status: 'consumed',
      consumed_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('status', 'available')

  if (error) {
    return { error: error.message }
  }

  await logAdminAction({
    adminUserId: admin.id,
    actionType: 'content_update',
    targetType: 'bad_inventory',
    targetId: itemId,
    details: { table: 'bad_inventory', status: 'consumed' },
  })

  revalidatePath('/bad-inventory')
  return {}
}
