'use server'

import { revalidatePath } from 'next/cache'
import { requireWriteAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = {
  error: string
  success?: string
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function getPositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

export async function addConfirmExchangeInventoryAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireWriteAdmin()
  if (!admin) {
    return { error: '이 작업을 수행할 권한이 없습니다.' }
  }

  const seriesId = getString(formData, 'series_id')
  const productId = getString(formData, 'product_id')
  const tokenPrice = getPositiveInt(getString(formData, 'token_price'), 3)
  const quantity = getPositiveInt(getString(formData, 'quantity'), 1)
  const adminNote = getString(formData, 'admin_note')

  if (!seriesId) {
    return { error: '시리즈를 선택해 주세요.' }
  }
  if (!productId) {
    return { error: '상품을 선택해 주세요.' }
  }
  if (quantity > 500) {
    return { error: '한 번에 추가할 수 있는 수량은 500개 이하입니다.' }
  }

  const adminClient = createAdminClient()
  const { data: product, error: productError } = await adminClient
    .from('gacha_products')
    .select('id, series_id')
    .eq('id', productId)
    .single()

  if (productError || !product) {
    return { error: '해당 상품을 찾을 수 없습니다.' }
  }
  if (product.series_id !== seriesId) {
    return { error: '선택한 상품이 시리즈와 일치하지 않습니다.' }
  }

  const rows = Array.from({ length: quantity }, () => ({
    series_id: seriesId,
    product_id: productId,
    token_price: tokenPrice,
    admin_note: adminNote || null,
    status: 'available' as const,
  }))

  const { error: insertError } = await adminClient
    .from('confirm_exchange_inventory')
    .insert(rows)

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath('/workshop')
  return {
    error: '',
    success: `${quantity.toLocaleString()}건의 확정교환 재고가 추가되었습니다.`,
  }
}
