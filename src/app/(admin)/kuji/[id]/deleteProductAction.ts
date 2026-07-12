'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

const COUNT_LABELS: Record<string, { label: string; unit: string }> = {
  tickets: { label: '티켓', unit: '장' },
  purchases: { label: '구매', unit: '건' },
  purchases_lastone: { label: '라스트원 구매', unit: '건' },
  box_items: { label: '유저 박스', unit: '개' },
  series_lastone: { label: '시리즈 라스트원 지정', unit: '개' },
}

type DeleteResult = {
  success: boolean
  reason?: string
  name?: string
  counts?: Record<string, number>
  deleted?: { id: string; name: string }
  image_url?: string | null
  image_orphaned?: boolean
}

function formatInUseMessage(counts: Record<string, number> | undefined): string {
  const parts: string[] = []
  for (const [key, meta] of Object.entries(COUNT_LABELS)) {
    const value = counts?.[key] ?? 0
    if (value > 0) {
      parts.push(`${meta.label} ${value.toLocaleString()}${meta.unit}`)
    }
  }
  if (parts.length === 0) {
    return '사용 중이라 삭제할 수 없습니다.'
  }
  return `${parts.join(', ')}에서 사용 중이라 삭제할 수 없습니다.`
}

export async function deleteKujiProductAction(
  seriesId: string,
  productId: string
): Promise<{ error?: string }> {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc('admin_delete_product', {
    p_product_type: 'kuji',
    p_product_id: productId,
    p_admin_user_id: admin.id,
  })

  if (error) {
    return { error: error.message }
  }

  const result = (data ?? {}) as DeleteResult

  if (!result.success) {
    if (result.reason === 'in_use') {
      return { error: formatInUseMessage(result.counts) }
    }
    if (result.reason === 'product_not_found') {
      return { error: '상품을 찾을 수 없습니다.' }
    }
    if (result.reason === 'invalid_product_type') {
      return { error: '유효하지 않은 상품 유형입니다.' }
    }
    return { error: result.reason ?? '삭제에 실패했습니다.' }
  }

  if (result.image_orphaned === true && result.image_url) {
    const fileName = result.image_url.split('/').pop()
    if (fileName) {
      const { error: storageError } = await adminClient.storage
        .from('kuji-images')
        .remove([fileName])
      if (storageError) {
        console.error('kuji product image remove failed:', storageError.message)
      }
    }
  }

  revalidatePath('/kuji')
  revalidatePath(`/kuji/${seriesId}`)
  return {}
}
