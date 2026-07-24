import { createAdminClient } from '@/lib/supabase/admin'
import PushNotificationForm from './PushNotificationForm'

type PushSendLogRow = {
  id: string
  admin_user_id: string
  title: string
  target: 'all' | 'user'
  sent_count: number
  failed_count: number
  created_at: string
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR')
}

export default async function PushNotificationPage() {
  const adminClient = createAdminClient()
  const { data: logData } = await adminClient
    .from('push_send_logs')
    .select(
      'id, admin_user_id, title, target, sent_count, failed_count, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(20)

  const logs = (logData ?? []) as PushSendLogRow[]
  const adminIds = [...new Set(logs.map((row) => row.admin_user_id))]

  const { data: adminsData } = adminIds.length
    ? await adminClient
        .from('admins')
        .select('id, display_name')
        .in('id', adminIds)
    : { data: [] as { id: string; display_name: string | null }[] }

  const adminNameMap = Object.fromEntries(
    (adminsData ?? []).map((admin) => [admin.id, admin.display_name])
  )

  return (
    <div>
      <h2 style={{ color: '#1A1A1A', fontSize: 24, fontWeight: 900, margin: '0 0 20px' }}>
        푸시 알림 발송
      </h2>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          padding: 20,
          maxWidth: 600,
        }}
      >
        <PushNotificationForm />
      </div>

      <div style={{ marginTop: 32 }}>
        <h3
          style={{
            color: '#1A1A1A',
            fontSize: 18,
            fontWeight: 800,
            margin: '0 0 14px',
          }}
        >
          최근 발송 이력
        </h3>

        {logs.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
            발송 이력이 없습니다.
          </p>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #E0DDD8',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F7F6F3' }}>
                  {['발송시각', '발송자', '제목', '대상', '성공', '실패'].map(
                    (label) => (
                      <th
                        key={label}
                        style={{
                          textAlign: 'left',
                          padding: '12px 14px',
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#6B7280',
                          borderBottom: '1px solid #E0DDD8',
                        }}
                      >
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => {
                  const sender =
                    adminNameMap[row.admin_user_id] ??
                    row.admin_user_id.slice(0, 8)
                  return (
                    <tr key={row.id}>
                      <td
                        style={{
                          padding: '12px 14px',
                          fontSize: 13,
                          color: '#1A1A1A',
                          borderBottom: '1px solid #F0EEEA',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDateTime(row.created_at)}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          fontSize: 13,
                          color: '#1A1A1A',
                          borderBottom: '1px solid #F0EEEA',
                        }}
                      >
                        {sender}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          fontSize: 13,
                          color: '#1A1A1A',
                          borderBottom: '1px solid #F0EEEA',
                        }}
                      >
                        {row.title}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          fontSize: 13,
                          color: '#1A1A1A',
                          borderBottom: '1px solid #F0EEEA',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.target === 'all' ? '전체 발송' : '개인 발송'}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          fontSize: 13,
                          color: '#5B8B1E',
                          fontWeight: 700,
                          borderBottom: '1px solid #F0EEEA',
                        }}
                      >
                        {row.sent_count}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          fontSize: 13,
                          color: row.failed_count > 0 ? '#DC2626' : '#6B7280',
                          fontWeight: 700,
                          borderBottom: '1px solid #F0EEEA',
                        }}
                      >
                        {row.failed_count}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
