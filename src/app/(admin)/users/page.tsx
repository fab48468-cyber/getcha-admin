import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import UserSearchBar from './UserSearchBar'

type UserListRow = {
  id: string
  nickname: string | null
  phone_number: string | null
  signup_provider: string | null
  coin_balance: number | null
  token_balance: number | null
  is_active: boolean | null
  penalty_until: string | null
  created_at: string | null
}

const PAGE_SIZE = 20

const PROVIDER_STYLES: Record<string, { backgroundColor: string; color: string; label: string }> = {
  kakao: { backgroundColor: '#FEE500', color: '#1A1A1A', label: 'kakao' },
  google: { backgroundColor: '#DBEAFE', color: '#2563EB', label: 'google' },
  apple: { backgroundColor: '#111827', color: '#FFFFFF', label: 'apple' },
  email: { backgroundColor: '#F3F4F6', color: '#6B7280', label: 'email' },
}

function getNumberParam(value: string | string[] | undefined, fallback: number) {
  const rawValue = Array.isArray(value) ? value[0] : value
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function getStringParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

function getFilterQuery(value: string) {
  return value.replace(/[%(),]/g, ' ').trim()
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR')
}

function ProviderBadge({ provider }: { provider: string | null }) {
  const key = (provider ?? 'email').toLowerCase()
  const style = PROVIDER_STYLES[key] ?? PROVIDER_STYLES.email

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

function getUserStatus(user: Pick<UserListRow, 'is_active' | 'penalty_until'>) {
  if (user.is_active === false) {
    return { label: '정지', backgroundColor: '#FEE2E2', color: '#DC2626' }
  }

  const penaltyUntil = user.penalty_until ? new Date(user.penalty_until) : null
  if (penaltyUntil && penaltyUntil.getTime() > Date.now()) {
    return { label: '패널티', backgroundColor: '#FEF3C7', color: '#D97706' }
  }

  return { label: '정상', backgroundColor: '#EEFBD0', color: '#5B8B1E' }
}

function StatusBadge({ user }: { user: Pick<UserListRow, 'is_active' | 'penalty_until'> }) {
  const style = getUserStatus(user)

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

function buildPageHref(q: string, page: number) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))

  const query = params.toString()
  return query ? `/users?${query}` : '/users'
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const q = getStringParam(resolvedSearchParams.q)
  const filterQuery = getFilterQuery(q)
  const page = getNumberParam(resolvedSearchParams.page, 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const adminClient = createAdminClient()
  let query = adminClient
    .from('users')
    .select(
      'id, nickname, phone_number, signup_provider, coin_balance, token_balance, is_active, penalty_until, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filterQuery) {
    query = query.or(`nickname.ilike.%${filterQuery}%,phone_number.ilike.%${filterQuery}%`)
  }

  const { data, count } = await query
  const users = (data ?? []) as UserListRow[]
  const totalCount = count ?? 0
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1)

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
          유저 관리
        </h2>
      </div>

      <UserSearchBar initialQuery={q} />

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#F9F9F9' }}>
            <tr>
              {['닉네임', '전화번호', '가입방법', '코인', '토큰', '상태', '가입일', '관리'].map(
                (header) => (
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
                )
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td
                  style={{
                    color: '#1A1A1A',
                    fontSize: 14,
                    fontWeight: 800,
                    padding: 16,
                    borderBottom: '1px solid #F0EEEA',
                  }}
                >
                  {user.nickname || '-'}
                </td>
                <td style={{ color: '#6B7280', fontSize: 14, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {user.phone_number || '-'}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <ProviderBadge provider={user.signup_provider} />
                </td>
                <td style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {(user.coin_balance ?? 0).toLocaleString()}
                </td>
                <td style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {(user.token_balance ?? 0).toLocaleString()}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <StatusBadge user={user} />
                </td>
                <td style={{ color: '#6B7280', fontSize: 14, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {formatDate(user.created_at)}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <Link
                    href={`/users/${user.id}`}
                    style={{
                      color: '#8B5CF6',
                      fontSize: 13,
                      fontWeight: 900,
                      textDecoration: 'none',
                    }}
                  >
                    상세
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: 32 }}>
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
        }}
      >
        <div style={{ color: '#6B7280', fontSize: 13, fontWeight: 700 }}>
          총 {totalCount.toLocaleString()}명 · {page} / {totalPages} 페이지
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href={buildPageHref(q, Math.max(page - 1, 1))}
            aria-disabled={page <= 1}
            style={{
              backgroundColor: page <= 1 ? '#F3F4F6' : '#FFFFFF',
              color: page <= 1 ? '#9CA3AF' : '#1A1A1A',
              border: '1px solid #E0DDD8',
              borderRadius: 10,
              padding: '9px 13px',
              fontSize: 13,
              fontWeight: 800,
              textDecoration: 'none',
              pointerEvents: page <= 1 ? 'none' : 'auto',
            }}
          >
            이전
          </Link>
          <Link
            href={buildPageHref(q, page + 1)}
            aria-disabled={page >= totalPages}
            style={{
              backgroundColor: page >= totalPages ? '#F3F4F6' : '#FFFFFF',
              color: page >= totalPages ? '#9CA3AF' : '#1A1A1A',
              border: '1px solid #E0DDD8',
              borderRadius: 10,
              padding: '9px 13px',
              fontSize: 13,
              fontWeight: 800,
              textDecoration: 'none',
              pointerEvents: page >= totalPages ? 'none' : 'auto',
            }}
          >
            다음
          </Link>
        </div>
      </div>
    </div>
  )
}
