import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

type GachaSeries = {
  id: string
  name: string
  thumbnail_url: string | null
  coin_price_per_pull: number | null
  status: 'active' | 'sold_out' | 'closed'
  created_at: string | null
}

type InventoryRow = {
  series_id: string
  status: 'available' | 'allocated' | 'sold'
}

const STATUS_STYLES = {
  active: {
    label: '진행 중',
    backgroundColor: '#EEFBD0',
    color: '#5B8B1E',
  },
  sold_out: {
    label: '품절',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
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

function StatusBadge({ status }: { status: GachaSeries['status'] }) {
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

export default async function GachaPage() {
  const adminClient = createAdminClient()
  const { data: seriesData } = await adminClient
    .from('gacha_series')
    .select('id, name, thumbnail_url, coin_price_per_pull, status, created_at')
    .order('created_at', { ascending: false })

  const series = (seriesData ?? []) as GachaSeries[]
  const seriesIds = series.map((item) => item.id)

  const { data: inventoryData } = seriesIds.length
    ? await adminClient
        .from('gacha_inventory')
        .select('series_id, status')
        .in('series_id', seriesIds)
    : { data: [] }

  const inventoryRows = (inventoryData ?? []) as InventoryRow[]
  const inventoryCounts = inventoryRows.reduce(
    (acc, row) => {
      if (!acc[row.series_id]) {
        acc[row.series_id] = { total: 0, available: 0, sold: 0 }
      }

      acc[row.series_id].total += 1
      if (row.status === 'available') acc[row.series_id].available += 1
      if (row.status === 'sold') acc[row.series_id].sold += 1

      return acc
    },
    {} as Record<string, { total: number; available: number; sold: number }>
  )

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
          가챠 관리
        </h2>
        <Link
          href="/gacha/new"
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
          새 가챠 등록
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
              {['썸네일', '시리즈명', '상태', '가격', '재고(가용/전체)', '등록일', '관리'].map(
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
            {series.map((item) => {
              const counts = inventoryCounts[item.id] ?? {
                total: 0,
                available: 0,
                sold: 0,
              }

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
                    {(item.coin_price_per_pull ?? 0).toLocaleString()} coin
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
                    {counts.available.toLocaleString()} / {counts.total.toLocaleString()}
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
                      href={`/gacha/${item.id}`}
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
            등록된 가챠 시리즈가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
