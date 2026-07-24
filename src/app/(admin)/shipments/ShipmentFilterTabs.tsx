'use client'

import Link from 'next/link'

export type ShipmentStatus =
  | 'requested'
  | 'preparing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'on_hold'

export type ShipmentListRow = {
  id: string
  status: ShipmentStatus
  recipient_name: string | null
  courier_company: string | null
  tracking_number: string | null
  coin_fee: number | null
  requested_at: string | null
  users: { nickname: string | null } | { nickname: string | null }[] | null
}

export type ShipmentStatusCounts = {
  all: number
  requested: number
  preparing: number
  packed: number
  shipped: number
  delivered: number
  cancelled: number
  on_hold: number
}

const STATUS_STYLES: Record<ShipmentStatus, { label: string; color: string }> = {
  requested: { label: '배송신청', color: '#F59E0B' },
  preparing: { label: '준비중', color: '#8B5CF6' },
  packed: { label: '포장완료', color: '#8CC63F' },
  shipped: { label: '배송중', color: '#3B82F6' },
  delivered: { label: '배송완료', color: '#6B7280' },
  cancelled: { label: '취소', color: '#EF4444' },
  on_hold: { label: '보류', color: '#F97316' },
}

const FILTER_TABS = [
  { key: 'all', label: '전체' },
  { key: 'requested', label: '배송신청' },
  { key: 'preparing', label: '준비중' },
  { key: 'packed', label: '포장완료' },
  { key: 'shipped', label: '배송중' },
  { key: 'delivered', label: '배송완료' },
  { key: 'cancelled', label: '취소' },
  { key: 'on_hold', label: '보류' },
] as const

type FilterKey = (typeof FILTER_TABS)[number]['key']

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function getNickname(users: ShipmentListRow['users']) {
  const user = Array.isArray(users) ? users[0] : users
  return user?.nickname || '-'
}

function formatTrackingLabel(
  courierCompany: string | null,
  trackingNumber: string | null
) {
  const courier = courierCompany?.trim() ?? ''
  const tracking = trackingNumber?.trim() ?? ''

  if (courier && tracking) return `${courier} ${tracking}`
  if (courier) return courier
  if (tracking) return tracking
  return '-'
}

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.requested

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: `${style.color}18`,
        color: style.color,
        border: `1px solid ${style.color}`,
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {style.label}
    </span>
  )
}

function buildTabHref(status: FilterKey, q: string) {
  const params = new URLSearchParams()
  if (status !== 'all') params.set('status', status)
  if (q) params.set('q', q)
  const query = params.toString()
  return query ? `/shipments?${query}` : '/shipments'
}

function buildPageHref(status: string, q: string, page: number) {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `/shipments?${query}` : '/shipments'
}

export default function ShipmentFilterTabs({
  shipments,
  counts,
  activeStatus,
  q,
  page,
  totalCount,
  totalPages,
}: {
  shipments: ShipmentListRow[]
  counts: ShipmentStatusCounts
  activeStatus: FilterKey
  q: string
  page: number
  totalCount: number
  totalPages: number
}) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTER_TABS.map((tab) => {
          const active = activeStatus === tab.key

          return (
            <Link
              key={tab.key}
              href={buildTabHref(tab.key, q)}
              style={{
                backgroundColor: active ? '#8CC63F' : '#FFFFFF',
                color: active ? '#1A1A1A' : '#6B7280',
                border: '1px solid #E0DDD8',
                borderRadius: 999,
                padding: '9px 14px',
                fontSize: 14,
                fontWeight: 900,
                textDecoration: 'none',
              }}
            >
              {tab.label} {counts[tab.key].toLocaleString()}
            </Link>
          )
        })}
      </div>

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
              {['신청일', '주문자(닉네임)', '수령인', '상태', '배송비(코인)', '운송장', '관리'].map(
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
            {shipments.map((shipment) => (
              <tr key={shipment.id}>
                <td style={{ color: '#6B7280', fontSize: 14, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {formatDate(shipment.requested_at)}
                </td>
                <td style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 800, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {getNickname(shipment.users)}
                </td>
                <td style={{ color: '#1A1A1A', fontSize: 14, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {shipment.recipient_name ?? '-'}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <StatusBadge status={shipment.status} />
                </td>
                <td style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {(shipment.coin_fee ?? 0).toLocaleString()}
                </td>
                <td style={{ color: '#1A1A1A', fontSize: 14, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {formatTrackingLabel(shipment.courier_company, shipment.tracking_number)}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <Link
                    href={`/shipments/${shipment.id}`}
                    style={{
                      color: '#8B5CF6',
                      fontSize: 14,
                      fontWeight: 800,
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

        {shipments.length === 0 && (
          <div
            style={{
              color: '#6B7280',
              fontSize: 14,
              padding: 32,
              textAlign: 'center',
            }}
          >
            표시할 배송 건이 없습니다.
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
          총 {totalCount.toLocaleString()}건 · {page} / {totalPages} 페이지
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href={buildPageHref(activeStatus, q, Math.max(page - 1, 1))}
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
            href={buildPageHref(activeStatus, q, page + 1)}
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
