'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

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

export default function ShipmentFilterTabs({
  shipments,
}: {
  shipments: ShipmentListRow[]
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const counts = useMemo(() => {
    return shipments.reduce(
      (acc, shipment) => {
        acc.all += 1
        if (shipment.status in acc) {
          acc[shipment.status as keyof typeof acc] += 1
        }
        return acc
      },
      {
        all: 0,
        requested: 0,
        preparing: 0,
        packed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      }
    )
  }, [shipments])

  const filteredShipments =
    activeFilter === 'all'
      ? shipments
      : shipments.filter((shipment) => shipment.status === activeFilter)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTER_TABS.map((tab) => {
          const active = activeFilter === tab.key

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              style={{
                backgroundColor: active ? '#8CC63F' : '#FFFFFF',
                color: active ? '#1A1A1A' : '#6B7280',
                border: '1px solid #E0DDD8',
                borderRadius: 999,
                padding: '9px 14px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 900,
              }}
            >
              {tab.label} {counts[tab.key].toLocaleString()}
            </button>
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
            {filteredShipments.map((shipment) => (
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

        {filteredShipments.length === 0 && (
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
    </div>
  )
}
