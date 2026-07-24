'use server'

import { revalidatePath } from 'next/cache'
import { requireWriteAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildTrackingUrl } from '@/lib/tracking'

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
}

export type BulkTrackingInputRow = {
  shipment_id: string
  courier_company: string
  tracking_number: string
}

export type BulkTrackingVerdict = {
  shipment_id: string
  courier_company: string
  tracking_number: string
  status: 'ok' | 'not_found' | 'invalid_status'
  reason: string
  message: string
  recipient_name: string | null
}

export type BulkTrackingExecuteResult = {
  succeeded: number
  failed: { id: string; reason: string; message: string }[]
  error?: string
}

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  requested: '배송신청',
  preparing: '준비중',
  packed: '포장완료',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
  on_hold: '보류',
}

const MAX_ROWS = 500

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
    case 'invalid_transition':
      return '허용되지 않은 상태 전이입니다.'
    default:
      return `처리에 실패했습니다. (${data?.reason ?? 'unknown'})`
  }
}

async function validateRows(
  rows: BulkTrackingInputRow[]
): Promise<{ error?: string; verdicts: BulkTrackingVerdict[] }> {
  if (rows.length > MAX_ROWS) {
    return {
      error: `한 번에 최대 ${MAX_ROWS}행까지 처리할 수 있습니다. 파일을 분할해 주세요.`,
      verdicts: [],
    }
  }

  const adminClient = createAdminClient()
  const ids = [...new Set(rows.map((row) => row.shipment_id))]

  const { data: shipmentsData, error } = await adminClient
    .from('shipments')
    .select('id, status, recipient_name')
    .in('id', ids)

  if (error) {
    return { error: error.message, verdicts: [] }
  }

  const shipmentMap = new Map(
    ((shipmentsData ?? []) as { id: string; status: ShipmentStatus; recipient_name: string | null }[]).map(
      (shipment) => [shipment.id, shipment]
    )
  )

  const verdicts: BulkTrackingVerdict[] = rows.map((row) => {
    const shipment = shipmentMap.get(row.shipment_id)

    if (!shipment) {
      return {
        ...row,
        status: 'not_found',
        reason: 'not_found',
        message: '존재하지 않는 배송 ID',
        recipient_name: null,
      }
    }

    if (shipment.status !== 'packed') {
      return {
        ...row,
        status: 'invalid_status',
        reason: 'invalid_status',
        message: `포장완료 상태가 아닙니다 (현재: ${STATUS_LABELS[shipment.status] ?? shipment.status})`,
        recipient_name: shipment.recipient_name,
      }
    }

    return {
      ...row,
      status: 'ok',
      reason: 'ok',
      message: '처리 가능',
      recipient_name: shipment.recipient_name,
    }
  })

  return { verdicts }
}

export async function validateBulkTrackingAction(
  rows: BulkTrackingInputRow[]
): Promise<{ error?: string; verdicts: BulkTrackingVerdict[] }> {
  const admin = await requireWriteAdmin()
  if (!admin) {
    return { error: '권한이 없습니다.', verdicts: [] }
  }

  return validateRows(rows)
}

export async function executeBulkTrackingAction(
  okRows: BulkTrackingInputRow[]
): Promise<BulkTrackingExecuteResult> {
  const admin = await requireWriteAdmin()
  if (!admin) {
    return { succeeded: 0, failed: [], error: '권한이 없습니다.' }
  }

  const { error, verdicts } = await validateRows(okRows)
  if (error) {
    return { succeeded: 0, failed: [], error }
  }

  const executableRows = verdicts.filter((verdict) => verdict.status === 'ok')
  const preFailed = verdicts
    .filter((verdict) => verdict.status !== 'ok')
    .map((verdict) => ({
      id: verdict.shipment_id,
      reason: verdict.reason,
      message: verdict.message,
    }))

  const adminClient = createAdminClient()
  const failed = [...preFailed]
  let succeeded = 0

  for (const row of executableRows) {
    const trackingUrl = buildTrackingUrl(row.courier_company, row.tracking_number) || null

    const { data, error: rpcError } = await adminClient.rpc('admin_update_shipment_status', {
      p_shipment_id: row.shipment_id,
      p_new_status: 'shipped',
      p_admin_user_id: admin.id,
      p_courier_company: row.courier_company,
      p_tracking_number: row.tracking_number,
      p_tracking_url: trackingUrl,
      p_memo: null,
    })

    if (rpcError) {
      failed.push({
        id: row.shipment_id,
        reason: 'rpc_error',
        message: rpcError.message,
      })
      continue
    }

    const result = data as RpcResult | null
    if (!result?.success) {
      failed.push({
        id: row.shipment_id,
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
