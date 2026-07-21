'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

type RefundResult = {
  success?: boolean
  message?: string
  reason?: string
  rolled_back?: boolean
}

function getRefundErrorMessage(data: RefundResult | null) {
  if (data?.message) return data.message

  switch (data?.reason) {
    case 'coins_already_used':
      return '코인을 이미 사용해 전액 환불이 불가능합니다.'
    case 'not_refundable':
      return '이미 환불됐거나 환불할 수 없는 상태입니다.'
    case 'unsupported_provider':
      return '스토어 결제(IAP)는 앱스토어/플레이스토어에서 환불해야 합니다.'
    case 'pg_cancel_failed':
      return data.rolled_back === true
        ? 'PG 결제 취소에 실패했지만 코인은 복구되었습니다.'
        : 'PG 결제 취소에 실패했고 코인 복구에도 실패했습니다. 즉시 확인이 필요합니다.'
    case 'missing_payment_key':
      return 'PG 거래번호가 없습니다. 토스 관리자에서 수동 취소가 필요합니다.'
    default:
      return `환불에 실패했습니다. (${data?.reason ?? 'unknown'})`
  }
}

export async function refundChargeAction(
  chargeId: string,
  userId: string,
  reason: string
) {
  const admin = await getAdminUser()
  if (!admin) return { error: '관리자 인증이 필요합니다.' }
  if (!reason?.trim()) return { error: '환불 사유를 입력해 주세요.' }

  // Edge Function 은 세션 JWT 로 관리자 여부를 검증한다 → 반드시 세션 클라이언트 사용
  const supabase = await createClient()
  const { data, error } = await supabase.functions.invoke('admin-refund-charge', {
    body: { chargeId, reason: reason.trim() },
  })

  if (error) return { error: `환불 요청 실패: ${error.message}` }

  const result = data as RefundResult | null
  if (!result?.success) {
    const message = getRefundErrorMessage(result)
    if (result?.reason === 'pg_cancel_failed' && result.rolled_back !== true) {
      return {
        error: `⚠️ 위험: 코인이 차감된 채 PG 취소·복구가 모두 실패했습니다. ${message}`,
        critical: true,
      }
    }
    return { error: message }
  }

  revalidatePath(`/users/${userId}`)
  return { error: '', success: result.message ?? '환불이 완료되었습니다.' }
}
