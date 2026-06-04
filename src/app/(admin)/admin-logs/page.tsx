import { createAdminClient } from '@/lib/supabase/admin'
import AdminLogsClient, { type AdminLogRow } from './AdminLogsClient'

type AdminActionDbRow = {
  id: string
  admin_user_id: string | null
  action_type: string
  target_user_id: string | null
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string | null
}

export default async function AdminLogsPage() {
  const adminClient = createAdminClient()

  const { data: actionsData, error } = await adminClient
    .from('admin_actions')
    .select(
      'id, admin_user_id, action_type, target_user_id, target_type, target_id, details, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
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
            관리자 로그
          </h2>
        </div>
        <p style={{ color: '#DC2626', fontSize: 14 }}>{error.message}</p>
      </div>
    )
  }

  const actions = (actionsData ?? []) as AdminActionDbRow[]

  const userIds = [
    ...new Set(
      actions
        .flatMap((action) => [action.admin_user_id, action.target_user_id])
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const { data: usersData } = userIds.length
    ? await adminClient.from('users').select('id, nickname').in('id', userIds)
    : { data: [] }

  const nicknameMap = Object.fromEntries(
    (usersData ?? []).map((user) => [user.id, user.nickname])
  )

  const logs: AdminLogRow[] = actions.map((action) => ({
    id: action.id,
    action_type: action.action_type,
    created_at: action.created_at,
    admin_nickname: action.admin_user_id
      ? nicknameMap[action.admin_user_id] ?? '-'
      : '-',
    target_nickname: action.target_user_id
      ? nicknameMap[action.target_user_id] ?? '-'
      : '-',
    details: action.details,
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
          관리자 로그
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
          관리자가 수행한 코인·토큰 지급/회수, 계정 제재 등의 이력을 조회합니다.
        </p>
      </div>

      <AdminLogsClient logs={logs} />
    </div>
  )
}
