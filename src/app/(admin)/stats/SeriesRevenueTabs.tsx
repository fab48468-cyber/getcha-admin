'use client'

import { useState } from 'react'

export type SeriesRevenueRow = {
  seriesId: string
  seriesName: string
  pullCount: number
  totalCoins: number
}

type TabKey = 'gacha' | 'kuji'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'gacha', label: '가챠' },
  { key: 'kuji', label: '쿠지' },
]

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  border: '1px solid #E0DDD8',
  overflow: 'hidden' as const,
}

const thStyle = {
  color: '#6B7280',
  fontSize: 12,
  fontWeight: 800,
  padding: '14px 16px',
  textAlign: 'left' as const,
  borderBottom: '1px solid #E0DDD8',
}

const tdStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #F0EEEA',
  verticalAlign: 'middle' as const,
  color: '#1A1A1A',
  fontSize: 14,
}

function getRankMedal(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return String(rank)
}

type SeriesRevenueTabsProps = {
  gachaRows: SeriesRevenueRow[]
  kujiRows: SeriesRevenueRow[]
}

export default function SeriesRevenueTabs({
  gachaRows,
  kujiRows,
}: SeriesRevenueTabsProps) {
  const [tab, setTab] = useState<TabKey>('gacha')
  const rows = tab === 'gacha' ? gachaRows : kujiRows

  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {TABS.map(({ key, label }) => {
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: active ? 'none' : '1px solid #E0DDD8',
                backgroundColor: active ? '#8CC63F' : '#FFFFFF',
                color: active ? '#1A1A1A' : '#6B7280',
                fontSize: 14,
                fontWeight: active ? 900 : 600,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 72 }}>순위</th>
              <th style={thStyle}>시리즈명</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>총 뽑기 수</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>총 코인 수익</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    ...tdStyle,
                    textAlign: 'center',
                    color: '#9CA3AF',
                    fontWeight: 600,
                  }}
                >
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const rank = index + 1
                return (
                  <tr key={row.seriesId}>
                    <td style={{ ...tdStyle, fontWeight: 900, fontSize: 16 }}>
                      {getRankMedal(rank)}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{row.seriesName}</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontWeight: 700,
                      }}
                    >
                      {row.pullCount.toLocaleString()}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        fontWeight: 900,
                        color: '#8CC63F',
                      }}
                    >
                      {row.totalCoins.toLocaleString()}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
