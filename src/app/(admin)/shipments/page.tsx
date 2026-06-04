import { createAdminClient } from '@/lib/supabase/admin'
import ShipmentFilterTabs, { type ShipmentListRow } from './ShipmentFilterTabs'

export default async function ShipmentsPage() {
  const adminClient = createAdminClient()
  const { data: shipmentsData } = await adminClient
    .from('shipments')
    .select(
      'id, user_id, status, recipient_name, courier_company, tracking_number, coin_fee, requested_at, users(nickname)'
    )
    .order('requested_at', { ascending: false })

  const shipments = (shipmentsData ?? []) as ShipmentListRow[]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            color: '#1A1A1A',
            fontSize: 24,
            fontWeight: 900,
            margin: 0,
          }}
        >
          배송 관리
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
          배송 신청부터 완료까지 상태와 운송장 정보를 관리합니다.
        </p>
      </div>

      <ShipmentFilterTabs shipments={shipments} />
    </div>
  )
}
