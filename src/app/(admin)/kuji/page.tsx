import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

type KujiSeries = {
  id: string
  name: string
  thumbnail_url: string | null
  coin_price_per_ticket: number | null
  status: 'active' | 'completed' | 'closed'
  total_tickets: number | null
  remaining_tickets: number | null
  created_at: string | null
}

const STATUS_STYLES = {
  active: {
    label: '진행 중',
    backgroundColor: '#EEFBD0',
    color: '#5B8B1E',
  },
  completed: {
    label: '완판',
    backgroundColor: '#EEF0FF',
    color: '#8B5CF6',
  },
  closed: {
    label: '종료',
    backgroundColor: '#F5F5F5',
    color: '#6B6B6B',
  },
} as const

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR')
}

function StatusBadge({ status }: { status: KujiSeries['status'] }) {
  const style = STATUS_STYLES[status]

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
        fontWeight: 800,
      }}
    >
      {style.label}
    </span>
  )
}

export default async function KujiPage() {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('kuji_series')
    .select(
      'id, name, thumbnail_url, coin_price_per_ticket, status, total_tickets, remaining_tickets, created_at'
    )
    .order('created_at', { ascending: false })

  const series = (data ?? []) as KujiSeries[]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            color: '#1A1A1A',
            fontSize: 24,
            fontWeight: 900,
            margin: 0,
          }}
        >
          쿠지 관리
        </h2>
        <Link
          href="/kuji/new"
          style={{
            backgroundColor: '#8CC63F',
            color: '#1A1A1A',
            borderRadius: 10,
            padding: '10px 14px',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 900,
          }}
        >
          새 쿠지 등록
        </Link>
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
              {[
                '썸네일',
                '시리즈명',
                '상태',
                '가격',
                '티켓(잔여/전체)',
                '판매율',
                '등록일',
                '관리',
              ].map((header) => (
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
            {series.map((item) => {
              const total = Number(item.total_tickets ?? 0)
              const remaining = Number(item.remaining_tickets ?? 0)
              const sold = Math.max(total - remaining, 0)
              const saleRate = total > 0 ? Math.round((sold / total) * 100) : 0

              return (
                <tr key={item.id}>
                  <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.name}
                        style={{
                          width: 60,
                          height: 60,
                          objectFit: 'cover',
                          borderRadius: 10,
                          border: '1px solid #E0DDD8',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 10,
                          backgroundColor: '#E5E7EB',
                        }}
                      />
                    )}
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
                    {item.name}
                  </td>
                  <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                    <StatusBadge status={item.status} />
                  </td>
                  <td
                    style={{
                      color: '#1A1A1A',
                      fontSize: 14,
                      fontWeight: 700,
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                    }}
                  >
                    {(item.coin_price_per_ticket ?? 0).toLocaleString()} coin
                  </td>
                  <td
                    style={{
                      color: '#1A1A1A',
                      fontSize: 14,
                      fontWeight: 700,
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                    }}
                  >
                    {remaining.toLocaleString()} / {total.toLocaleString()}
                  </td>
                  <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 90,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: '#E5E7EB',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${saleRate}%`,
                            height: '100%',
                            backgroundColor: '#8CC63F',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          color: '#1A1A1A',
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {saleRate}%
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      color: '#6B7280',
                      fontSize: 14,
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                    }}
                  >
                    {formatDate(item.created_at)}
                  </td>
                  <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                    <Link
                      href={`/kuji/${item.id}`}
                      style={{
                        color: '#8B5CF6',
                        fontSize: 14,
                        fontWeight: 800,
                        textDecoration: 'none',
                      }}
                    >
                      상세/수정
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {series.length === 0 && (
          <div
            style={{
              color: '#6B7280',
              fontSize: 14,
              padding: 32,
              textAlign: 'center',
            }}
          >
            등록된 쿠지 시리즈가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
