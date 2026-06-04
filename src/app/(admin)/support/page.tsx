import { createAdminClient } from '@/lib/supabase/admin'
import SupportFilterTabs, { type SupportInquiryListRow } from './SupportFilterTabs'

export default async function SupportPage() {
  const adminClient = createAdminClient()
  const { data: inquiriesData } = await adminClient
    .from('support_inquiries')
    .select('id, user_id, category, title, status, created_at')
    .order('created_at', { ascending: false })

  const userIds = [
    ...new Set(
      (inquiriesData ?? [])
        .map((inquiry) => inquiry.user_id)
        .filter((userId): userId is string => Boolean(userId))
    ),
  ]

  const { data: usersData } = userIds.length
    ? await adminClient.from('users').select('id, nickname').in('id', userIds)
    : { data: [] }

  const userMap = Object.fromEntries(
    (usersData ?? []).map((user) => [user.id, user.nickname])
  )

  const inquiries: SupportInquiryListRow[] = (inquiriesData ?? []).map((inquiry) => ({
    ...inquiry,
    nickname: inquiry.user_id ? userMap[inquiry.user_id] ?? '-' : '-',
  }))

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
          고객센터 관리
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
          고객 문의 접수 현황과 답변 상태를 관리합니다.
        </p>
      </div>

      <SupportFilterTabs inquiries={inquiries} />
    </div>
  )
}
