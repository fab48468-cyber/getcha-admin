import { Suspense } from 'react'
import { getAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import ShipmentFilterTabs, {
  type ShipmentListRow,
  type ShipmentStatus,
  type ShipmentStatusCounts,
} from './ShipmentFilterTabs'
import ShipmentSearchBar from './ShipmentSearchBar'

const PAGE_SIZE = 20

const VALID_STATUSES = new Set<ShipmentStatus>([
  'requested',
  'preparing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'on_hold',
])

const STATUS_COUNT_KEYS = [
  'requested',
  'preparing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'on_hold',
] as const satisfies readonly ShipmentStatus[]

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

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const q = getStringParam(resolvedSearchParams.q)
  const filterQuery = getFilterQuery(q)
  const statusParam = getStringParam(resolvedSearchParams.status)
  const activeStatus =
    statusParam && VALID_STATUSES.has(statusParam as ShipmentStatus)
      ? (statusParam as ShipmentStatus)
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
    .from('shipments')
    .select(
      'id, user_id, status, recipient_name, courier_company, tracking_number, coin_fee, requested_at, users(nickname)',
      { count: 'exact' }
    )
    .order('requested_at', { ascending: false })
    .range(from, to)

  if (activeStatus !== 'all') {
    listQuery = listQuery.eq('status', activeStatus)
  }

  if (filterQuery) {
    const orParts = [
      `recipient_name.ilike.%${filterQuery}%`,
      `recipient_phone.ilike.%${filterQuery}%`,
      `tracking_number.ilike.%${filterQuery}%`,
    ]
    if (matchedUserIds.length > 0) {
      orParts.push(`user_id.in.(${matchedUserIds.join(',')})`)
    }
    listQuery = listQuery.or(orParts.join(','))
  }

  const [listResult, allCountResult, ...statusCountResults] = await Promise.all([
    listQuery,
    adminClient.from('shipments').select('id', { count: 'exact', head: true }),
    ...STATUS_COUNT_KEYS.map((status) =>
      adminClient
        .from('shipments')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
    ),
  ])

  const shipments = (listResult.data ?? []) as ShipmentListRow[]
  const totalCount = listResult.count ?? 0
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1)

  const counts: ShipmentStatusCounts = {
    all: allCountResult.count ?? 0,
    requested: 0,
    preparing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    on_hold: 0,
  }

  STATUS_COUNT_KEYS.forEach((status, index) => {
    counts[status] = statusCountResults[index].count ?? 0
  })

  const admin = await getAdminUser()
  const canExport = Boolean(admin && admin.role !== 'cs')
  const exportParams = new URLSearchParams()
  if (activeStatus !== 'all') exportParams.set('status', activeStatus)
  if (q) exportParams.set('q', q)
  const exportHref = exportParams.toString()
    ? `/shipments/export?${exportParams.toString()}`
    : '/shipments/export'

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
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

        {canExport && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <a
              href={exportHref}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
                border: '1px solid #E0DDD8',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 900,
                textDecoration: 'none',
              }}
            >
              CSV 내보내기
            </a>
            <span style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 700 }}>
              현재 필터 기준
            </span>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <ShipmentSearchBar initialQuery={q} />
      </Suspense>

      <ShipmentFilterTabs
        shipments={shipments}
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
