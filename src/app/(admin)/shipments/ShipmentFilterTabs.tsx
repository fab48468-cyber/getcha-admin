'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import {
  bulkUpdateShipmentStatusAction,
  type BulkUpdateShipmentResult,
} from './actions'

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

const BULK_ACTIONS: Partial<
  Record<FilterKey, { nextStatus: 'preparing' | 'packed'; label: string; confirmLabel: string }>
> = {
  requested: {
    nextStatus: 'preparing',
    label: '준비중 처리',
    confirmLabel: '준비중',
  },
  preparing: {
    nextStatus: 'packed',
    label: '포장완료 처리',
    confirmLabel: '포장완료',
  },
}

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

function formatBulkResultBanner(result: BulkUpdateShipmentResult) {
  const lines = [`성공 ${result.succeeded}건 · 실패 ${result.failed.length}건`]

  if (result.failed.length > 0) {
    const grouped = new Map<string, string[]>()
    for (const item of result.failed) {
      const ids = grouped.get(item.reason) ?? []
      ids.push(item.id)
      grouped.set(item.reason, ids)
    }

    for (const [reason, ids] of grouped) {
      lines.push(`${reason}(${ids.length}건): ${ids.join(', ')}`)
    }
  }

  return lines
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkResult, setBulkResult] = useState<BulkUpdateShipmentResult | null>(null)
  const [bulkError, setBulkError] = useState('')
  const [isPending, startTransition] = useTransition()
  const bulkAction = BULK_ACTIONS[activeStatus]
  const pageIds = shipments.map((shipment) => shipment.id)
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const selectedCount = selectedIds.size

  useEffect(() => {
    setSelectedIds(new Set())
    setBulkResult(null)
    setBulkError('')
  }, [activeStatus, page, q])

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(pageIds))
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkUpdate() {
    if (!bulkAction || selectedCount === 0) return

    const confirmed = window.confirm(
      `선택한 ${selectedCount}건을 ${bulkAction.confirmLabel} 상태로 변경합니다.`
    )
    if (!confirmed) return

    const ids = [...selectedIds]
    startTransition(async () => {
      const result = await bulkUpdateShipmentStatusAction(ids, bulkAction.nextStatus)
      if (result.error) {
        setBulkError(result.error)
        setBulkResult(null)
        return
      }
      setBulkError('')
      setBulkResult(result)
      setSelectedIds(new Set())
    })
  }

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

      {bulkAction && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
            padding: '12px 14px',
            backgroundColor: '#F9F9F9',
            border: '1px solid #E0DDD8',
            borderRadius: 10,
          }}
        >
          <button
            type="button"
            onClick={handleBulkUpdate}
            disabled={selectedCount === 0 || isPending}
            style={{
              backgroundColor: selectedCount === 0 || isPending ? '#E5E7EB' : '#8CC63F',
              color: selectedCount === 0 || isPending ? '#9CA3AF' : '#1A1A1A',
              border: 'none',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 900,
              cursor: selectedCount === 0 || isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {isPending
              ? '처리 중...'
              : `선택 ${selectedCount}건 ${bulkAction.label}`}
          </button>
          <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 700 }}>
            현재 페이지에서 선택한 건만 처리합니다.
          </span>
        </div>
      )}

      {(bulkError || bulkResult) && (
        <div
          style={{
            marginBottom: 12,
            padding: '12px 14px',
            borderRadius: 10,
            border: `1px solid ${bulkError || (bulkResult && bulkResult.failed.length > 0) ? '#FECACA' : '#BBF7D0'}`,
            backgroundColor:
              bulkError || (bulkResult && bulkResult.failed.length > 0) ? '#FEF2F2' : '#F0FDF4',
            color: '#1A1A1A',
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: 'pre-line',
          }}
        >
          {bulkError || (bulkResult ? formatBulkResultBanner(bulkResult).join('\n') : '')}
        </div>
      )}

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
              <th
                style={{
                  color: '#6B7280',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '14px 16px',
                  textAlign: 'left',
                  borderBottom: '1px solid #E0DDD8',
                  width: 44,
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="현재 페이지 전체 선택"
                />
              </th>
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
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(shipment.id)}
                    onChange={() => toggleOne(shipment.id)}
                    aria-label={`${shipment.id} 선택`}
                  />
                </td>
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
