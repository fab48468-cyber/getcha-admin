'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser, requireWriteAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = {
  error: string
  success?: string
}

type ShipmentStatus =
  | 'requested'
  | 'preparing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'on_hold'

type RpcResult = {
  success?: boolean
  message?: string
  reason?: string
  status_changed?: boolean
  from?: string
  to?: string
  refunded_coin?: number
  refunded_token?: number
  unlocked_items?: number
}

const VALID_STATUSES = new Set<ShipmentStatus>([
  'requested',
  'preparing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'on_hold',
])

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function getStatus(formData: FormData) {
  const rawStatus = (getString(formData, 'action_status') ||
    getString(formData, 'status')) as ShipmentStatus
  return VALID_STATUSES.has(rawStatus) ? rawStatus : null
}

function getRpcErrorMessage(data: RpcResult | null) {
  if (data?.message) return data.message

  switch (data?.reason) {
    case 'tracking_required':
      return '발송 처리에는 택배사와 송장번호가 필요합니다.'
    case 'not_admin':
    case 'unauthorized':
      return '권한이 없습니다.'
    case 'invalid_shipment':
      return '배송 정보를 찾을 수 없습니다.'
    case 'invalid_status':
      return '올바르지 않은 상태값입니다.'
    default:
      return `처리에 실패했습니다. (${data?.reason ?? 'unknown'})`
  }
}

export async function updateShipmentAction(
  shipmentId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const nextStatus = getStatus(formData)
  const courierCompany = getString(formData, 'courier_company')
  const trackingNumber = getString(formData, 'tracking_number')
  const trackingUrl = getString(formData, 'tracking_url')
  const adminMemo = getString(formData, 'admin_memo')

  if (!nextStatus) {
    return { error: '변경할 배송 상태를 선택해 주세요.' }
  }

  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc('admin_update_shipment_status', {
    p_shipment_id: shipmentId,
    p_new_status: nextStatus,
    p_admin_user_id: admin.id,
    p_courier_company: courierCompany || null,
    p_tracking_number: trackingNumber || null,
    p_tracking_url: trackingUrl || null,
    p_memo: adminMemo || null,
  })

  if (error) {
    return { error: error.message }
  }

  const result = data as RpcResult | null
  if (!result?.success) {
    return { error: getRpcErrorMessage(result) }
  }

  revalidatePath('/shipments')
  revalidatePath(`/shipments/${shipmentId}`)

  if (result.status_changed === false) {
    return { error: '', success: '송장 정보가 저장되었습니다.' }
  }

  const parts: string[] = [`${result.from} → ${result.to} 처리했습니다.`]
  if (Number(result.refunded_coin) > 0) {
    parts.push(`코인 ${result.refunded_coin}개 환불`)
  }
  if (Number(result.refunded_token) > 0) {
    parts.push(`토큰 ${result.refunded_token}개 환불`)
  }
  if (Number(result.unlocked_items) > 0) {
    parts.push(`상품 ${result.unlocked_items}개 잠금 해제`)
  }

  return { error: '', success: parts.join(' · ') }
}

const BULK_NEXT_STATUSES = new Set(['preparing', 'packed'] as const)

export type BulkUpdateShipmentResult = {
  succeeded: number
  failed: { id: string; reason: string; message: string }[]
  error?: string
}

export async function bulkUpdateShipmentStatusAction(
  shipmentIds: string[],
  nextStatus: 'preparing' | 'packed'
): Promise<BulkUpdateShipmentResult> {
  if (shipmentIds.length > 100) {
    return {
      succeeded: 0,
      failed: [],
      error: '한 번에 최대 100건까지 처리할 수 있습니다.',
    }
  }

  if (!BULK_NEXT_STATUSES.has(nextStatus)) {
    return {
      succeeded: 0,
      failed: [],
      error: '허용되지 않은 상태값입니다.',
    }
  }

  const admin = await requireWriteAdmin()
  if (!admin) {
    return {
      succeeded: 0,
      failed: [],
      error: '권한이 없습니다.',
    }
  }

  const adminClient = createAdminClient()
  const failed: BulkUpdateShipmentResult['failed'] = []
  let succeeded = 0

  for (const shipmentId of shipmentIds) {
    const { data, error } = await adminClient.rpc('admin_update_shipment_status', {
      p_shipment_id: shipmentId,
      p_new_status: nextStatus,
      p_admin_user_id: admin.id,
      p_courier_company: null,
      p_tracking_number: null,
      p_tracking_url: null,
      p_memo: null,
    })

    if (error) {
      failed.push({
        id: shipmentId,
        reason: 'rpc_error',
        message: error.message,
      })
      continue
    }

    const result = data as RpcResult | null
    if (!result?.success) {
      failed.push({
        id: shipmentId,
        reason: result?.reason ?? 'unknown',
        message: getRpcErrorMessage(result),
      })
      continue
    }

    succeeded += 1
  }

  revalidatePath('/shipments')

  return { succeeded, failed }
}
