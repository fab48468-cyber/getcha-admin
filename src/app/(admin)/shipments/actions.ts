'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/auth'
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
  const { data: currentShipment, error: currentError } = await adminClient
    .from('shipments')
    .select('status')
    .eq('id', shipmentId)
    .single()

  if (currentError || !currentShipment) {
    return { error: currentError?.message ?? '배송 정보를 찾을 수 없습니다.' }
  }

  const oldStatus = currentShipment.status as ShipmentStatus
  const statusChanged = oldStatus !== nextStatus
  const now = new Date().toISOString()
  const updatePayload: Record<string, string | null> = {
    status: nextStatus,
    courier_company: courierCompany || null,
    tracking_number: trackingNumber || null,
    tracking_url: trackingUrl || null,
    admin_memo: adminMemo || null,
  }

  if (statusChanged && nextStatus === 'packed') updatePayload.packed_at = now
  if (statusChanged && nextStatus === 'shipped') updatePayload.shipped_at = now
  if (statusChanged && nextStatus === 'delivered') updatePayload.delivered_at = now

  const { error: updateError } = await adminClient
    .from('shipments')
    .update(updatePayload)
    .eq('id', shipmentId)

  if (updateError) {
    return { error: updateError.message }
  }

  if (statusChanged) {
    const { error: logError } = await adminClient
      .from('shipment_status_logs')
      .insert({
        shipment_id: shipmentId,
        old_status: oldStatus,
        new_status: nextStatus,
        memo: adminMemo || null,
        changed_by: admin.id,
        changed_by_role: 'admin',
      })

    if (logError) {
      return { error: logError.message }
    }
  }

  revalidatePath('/shipments')
  revalidatePath(`/shipments/${shipmentId}`)
  return { error: '', success: '저장되었습니다.' }
}
