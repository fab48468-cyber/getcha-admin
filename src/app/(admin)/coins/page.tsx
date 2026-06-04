import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import CoinGrantRevokeForm from './CoinGrantRevokeForm'

type HistoryRow = {
  id: string
  user_id: string
  amount: number
  transaction_type: 'admin_grant' | 'admin_revoke'
  description: string | null
  created_at: string
  asset: 'coin' | 'token'
}

const BADGE_STYLES: Record<
  string,
  { label: string; backgroundColor: string; color: string }
> = {
  coin_grant: { label: '코인 지급', backgroundColor: '#EEFBD0', color: '#5B8B1E' },
  coin_revoke: { label: '코인 회수', backgroundColor: '#FEE2E2', color: '#DC2626' },
  token_grant: { label: '토큰 지급', backgroundColor: '#EEF0FF', color: '#8B5CF6' },
  token_revoke: { label: '토큰 회수', backgroundColor: '#FEF3C7', color: '#D97706' },
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function KindBadge({ asset, transactionType }: { asset: 'coin' | 'token'; transactionType: string }) {
  const key =
    transactionType === 'admin_grant'
      ? `${asset}_grant`
      : `${asset}_revoke`
  const style = BADGE_STYLES[key] ?? {
    label: '-',
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {style.label}
    </span>
  )
}

export default async function CoinsPage() {
  const admin = await getAdminUser()
  if (!admin || admin.role !== 'super_admin') {
    redirect('/')
  }

  const adminClient = createAdminClient()

  const [{ data: coinTxData }, { data: tokenTxData }] = await Promise.all([
    adminClient
      .from('coin_transactions')
      .select('id, user_id, amount, transaction_type, description, created_at')
      .in('transaction_type', ['admin_grant', 'admin_revoke'])
      .order('created_at', { ascending: false })
      .limit(50),
    adminClient
      .from('token_transactions')
      .select('id, user_id, amount, transaction_type, description, created_at')
      .in('transaction_type', ['admin_grant', 'admin_revoke'])
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const historyRows: HistoryRow[] = [
    ...(coinTxData ?? []).map((row) => ({ ...row, asset: 'coin' as const })),
    ...(tokenTxData ?? []).map((row) => ({ ...row, asset: 'token' as const })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 50)

  const userIds = [...new Set(historyRows.map((row) => row.user_id))]
  const txIds = historyRows.map((row) => row.id)

  const [{ data: usersData }, { data: adminActionsData }] = await Promise.all([
    userIds.length
      ? adminClient.from('users').select('id, nickname').in('id', userIds)
      : Promise.resolve({ data: [] }),
    txIds.length
      ? adminClient
          .from('admin_actions')
          .select('target_id, admin_user_id')
          .in('action_type', [
            'coin_grant',
            'coin_revoke',
            'token_grant',
            'token_revoke',
          ])
          .in('target_id', txIds)
      : Promise.resolve({ data: [] }),
  ])

  const nicknameMap = Object.fromEntries(
    (usersData ?? []).map((user) => [user.id, user.nickname])
  )

  const processorMap: Record<string, string> = {}
  const adminIds = [
    ...new Set(
      (adminActionsData ?? [])
        .map((action) => action.admin_user_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  await Promise.all(
    adminIds.map(async (adminId) => {
      const { data } = await adminClient.auth.admin.getUserById(adminId)
      processorMap[adminId] = data.user?.email ?? adminId.slice(0, 8)
    })
  )

  const actionByTargetId = Object.fromEntries(
    (adminActionsData ?? []).map((action) => [action.target_id, action.admin_user_id])
  )

  return (
    <div>
      <div
        style={{
          backgroundColor: '#F0EEFF',
          color: '#8B5CF6',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 20,
        }}
      >
        ⚠️ super_admin 전용 기능입니다
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            color: '#1A1A1A',
            fontSize: 24,
            fontWeight: 900,
            margin: 0,
          }}
        >
          코인/토큰 관리
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
          유저에게 코인·토큰을 지급하거나 회수합니다.
        </p>
      </div>

      <CoinGrantRevokeForm />

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E0DDD8' }}>
          <h3
            style={{
              color: '#1A1A1A',
              fontSize: 16,
              fontWeight: 900,
              margin: 0,
            }}
          >
            최근 관리자 지급/회수 이력
          </h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#F9F9F9' }}>
            <tr>
              {['일시', '유저', '종류', '수량', '사유', '처리자'].map((header) => (
                <th
                  key={header}
                  style={{
                    color: '#6B7280',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '14px 16px',
                    textAlign: 'left',
                    borderBottom: '1px solid #E0DDD8',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historyRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    color: '#6B7280',
                    fontSize: 14,
                    padding: 24,
                    textAlign: 'center',
                  }}
                >
                  이력이 없습니다.
                </td>
              </tr>
            ) : (
              historyRows.map((row) => {
                const adminUserId = actionByTargetId[row.id]
                const processor = adminUserId
                  ? processorMap[adminUserId] ?? '-'
                  : '-'

                return (
                  <tr key={`${row.asset}-${row.id}`}>
                    <td
                      style={{
                        color: '#6B7280',
                        fontSize: 13,
                        padding: 16,
                        borderBottom: '1px solid #F0EEEA',
                      }}
                    >
                      {formatDateTime(row.created_at)}
                    </td>
                    <td
                      style={{
                        color: '#1A1A1A',
                        fontSize: 14,
                        fontWeight: 800,
                        padding: 16,
                        borderBottom: '1px solid #F0EEEA',
                      }}
                    >
                      {nicknameMap[row.user_id] || '-'}
                    </td>
                    <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                      <KindBadge asset={row.asset} transactionType={row.transaction_type} />
                    </td>
                    <td
                      style={{
                        color: row.amount >= 0 ? '#5B8B1E' : '#DC2626',
                        fontSize: 14,
                        fontWeight: 800,
                        padding: 16,
                        borderBottom: '1px solid #F0EEEA',
                      }}
                    >
                      {row.amount >= 0 ? '+' : ''}
                      {row.amount.toLocaleString()}
                    </td>
                    <td
                      style={{
                        color: '#6B7280',
                        fontSize: 14,
                        padding: 16,
                        borderBottom: '1px solid #F0EEEA',
                        maxWidth: 240,
                      }}
                    >
                      {row.description || '-'}
                    </td>
                    <td
                      style={{
                        color: '#6B7280',
                        fontSize: 13,
                        padding: 16,
                        borderBottom: '1px solid #F0EEEA',
                      }}
                    >
                      {processor}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
