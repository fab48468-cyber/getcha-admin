import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import SupportFilterTabs, {
  type InquiryStatus,
  type SupportInquiryListRow,
  type SupportStatusCounts,
} from './SupportFilterTabs'
import SupportSearchBar from './SupportSearchBar'

const PAGE_SIZE = 20

const VALID_STATUSES = new Set<InquiryStatus>([
  'pending',
  'in_progress',
  'answered',
  'closed',
])

const STATUS_COUNT_KEYS = [
  'pending',
  'in_progress',
  'answered',
  'closed',
] as const satisfies readonly InquiryStatus[]

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

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const q = getStringParam(resolvedSearchParams.q)
  const filterQuery = getFilterQuery(q)
  const statusParam = getStringParam(resolvedSearchParams.status)
  const activeStatus =
    statusParam && VALID_STATUSES.has(statusParam as InquiryStatus)
      ? (statusParam as InquiryStatus)
      : 'all'
  const page = getNumberParam(resolvedSearchParams.page, 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const adminClient = createAdminClient()

  let matchedUserIds: string[] = []
  if (filterQuery) {
    const { data: matchedUsers } = await adminClient
      .from('users')
      .select('id')
      .ilike('nickname', `%${filterQuery}%`)
      .limit(50)
    matchedUserIds = (matchedUsers ?? []).map((user) => user.id)
  }

  let listQuery = adminClient
    .from('support_inquiries')
    .select('id, user_id, category, title, status, created_at, assigned_to', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (activeStatus !== 'all') {
    listQuery = listQuery.eq('status', activeStatus)
  }

  if (filterQuery) {
    const orParts = [`title.ilike.%${filterQuery}%`]
    if (matchedUserIds.length > 0) {
      orParts.push(`user_id.in.(${matchedUserIds.join(',')})`)
    }
    listQuery = listQuery.or(orParts.join(','))
  }

  const [listResult, allCountResult, ...statusCountResults] = await Promise.all([
    listQuery,
    adminClient.from('support_inquiries').select('id', { count: 'exact', head: true }),
    ...STATUS_COUNT_KEYS.map((status) =>
      adminClient
        .from('support_inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
    ),
  ])

  const rows = listResult.data ?? []
  const totalCount = listResult.count ?? 0
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1)

  const counts: SupportStatusCounts = {
    all: allCountResult.count ?? 0,
    pending: 0,
    in_progress: 0,
    answered: 0,
    closed: 0,
  }

  STATUS_COUNT_KEYS.forEach((status, index) => {
    counts[status] = statusCountResults[index].count ?? 0
  })

  const userIds = [
    ...new Set(
      rows
        .map((inquiry) => inquiry.user_id)
        .filter((userId): userId is string => Boolean(userId))
    ),
  ]

  const assigneeIds = [
    ...new Set(
      rows
        .map((inquiry) => inquiry.assigned_to)
        .filter((assigneeId): assigneeId is string => Boolean(assigneeId))
    ),
  ]

  const [{ data: usersData }, { data: adminsData }] = await Promise.all([
    userIds.length
      ? adminClient.from('users').select('id, nickname').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; nickname: string | null }[] }),
    assigneeIds.length
      ? adminClient.from('admins').select('id, display_name').in('id', assigneeIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
  ])

  const userMap = Object.fromEntries(
    (usersData ?? []).map((user) => [user.id, user.nickname])
  )
  const adminMap = Object.fromEntries(
    (adminsData ?? []).map((admin) => [admin.id, admin.display_name])
  )

  const inquiries: SupportInquiryListRow[] = rows.map((inquiry) => {
    const assignedTo = inquiry.assigned_to
    let assigneeDisplay = '-'
    if (assignedTo) {
      assigneeDisplay = adminMap[assignedTo] ?? assignedTo.slice(0, 8)
    }

    return {
      id: inquiry.id,
      user_id: inquiry.user_id,
      category: inquiry.category,
      title: inquiry.title,
      status: inquiry.status as InquiryStatus,
      created_at: inquiry.created_at,
      assigned_to: assignedTo,
      nickname: inquiry.user_id ? userMap[inquiry.user_id] ?? '-' : '-',
      assignee_display: assigneeDisplay,
    }
  })

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

      <Suspense fallback={null}>
        <SupportSearchBar initialQuery={q} />
      </Suspense>

      <SupportFilterTabs
        inquiries={inquiries}
        counts={counts}
        activeStatus={activeStatus}
        q={q}
        page={page}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </div>
  )
}
