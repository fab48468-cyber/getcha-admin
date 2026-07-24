import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/auth'
import BulkTrackingClient from './BulkTrackingClient'

export default async function BulkTrackingPage() {
  const admin = await getAdminUser()
  if (!admin || admin.role === 'cs') {
    redirect('/shipments')
  }

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
          송장 일괄 업로드
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
          포장완료 건에 송장 정보를 올려 일괄 발송 처리합니다.
        </p>
      </div>

      <BulkTrackingClient />
    </div>
  )
}
