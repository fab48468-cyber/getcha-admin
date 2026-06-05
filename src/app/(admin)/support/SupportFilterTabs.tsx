'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

export type InquiryStatus = 'pending' | 'in_progress' | 'answered' | 'closed'

export type SupportInquiryListRow = {
  id: string
  user_id: string | null
  category: string | null
  title: string | null
  status: InquiryStatus
  created_at: string | null
  nickname: string
}

const STATUS_STYLES: Record<
  InquiryStatus,
  { label: string; backgroundColor: string; color: string }
> = {
  pending: { label: '대기중', backgroundColor: '#FEF3C7', color: '#D97706' },
  in_progress: { label: '처리중', backgroundColor: '#EEF0FF', color: '#8B5CF6' },
  answered: { label: '완료', backgroundColor: '#EEFBD0', color: '#5B8B1E' },
  closed: { label: '종료', backgroundColor: '#F5F5F5', color: '#6B6B6B' },
}

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  payment: { label: '결제', color: '#3B82F6' },
  shipping: { label: '배송', color: '#22C55E' },
  account: { label: '계정', color: '#8B5CF6' },
  product: { label: '상품', color: '#F97316' },
  etc: { label: '기타', color: '#6B7280' },
}

const FILTER_TABS = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기중' },
  { key: 'in_progress', label: '처리중' },
  { key: 'answered', label: '완료' },
  { key: 'closed', label: '종료' },
] as const

type FilterKey = (typeof FILTER_TABS)[number]['key']

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`
}

export function StatusBadge({ status }: { status: InquiryStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending

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

function CategoryBadge({ category }: { category: string | null }) {
  const key = category && category in CATEGORY_STYLES ? category : 'etc'
  const style = CATEGORY_STYLES[key]

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

export default function SupportFilterTabs({
  inquiries,
}: {
  inquiries: SupportInquiryListRow[]
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const counts = useMemo(() => {
    return inquiries.reduce<Record<FilterKey, number>>(
      (acc, inquiry) => {
        acc.all += 1
        if (inquiry.status in acc) {
          acc[inquiry.status] += 1
        }
        return acc
      },
      {
        all: 0,
        pending: 0,
        in_progress: 0,
        answered: 0,
        closed: 0,
      }
    )
  }, [inquiries])

  const filteredInquiries =
    activeFilter === 'all'
      ? inquiries
      : inquiries.filter((inquiry) => inquiry.status === activeFilter)

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
              {['접수일', '유저(닉네임)', '카테고리', '제목', '상태', '관리'].map(
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
            {filteredInquiries.map((inquiry) => (
              <tr key={inquiry.id}>
                <td style={{ color: '#6B7280', fontSize: 14, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {formatDate(inquiry.created_at)}
                </td>
                <td style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 800, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {inquiry.nickname}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <CategoryBadge category={inquiry.category} />
                </td>
                <td style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700, padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  {inquiry.title || '-'}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <StatusBadge status={inquiry.status} />
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <Link
                    href={`/support/${inquiry.id}`}
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

        {filteredInquiries.length === 0 && (
          <div
            style={{
              color: '#6B7280',
              fontSize: 14,
              padding: 32,
              textAlign: 'center',
            }}
          >
            표시할 문의가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
