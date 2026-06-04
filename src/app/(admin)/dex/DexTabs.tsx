'use client'

import { Fragment, useMemo, useState } from 'react'

export type ProductRate = {
  productId: string
  productName: string
  collectedCount: number
  collectionRate: number
}

export type SeriesStat = {
  id: string
  name: string
  totalDex: number
  completedCount: number
  completionRate: number
  productCount: number
  productRates: ProductRate[]
}

export type CompletedUserRow = {
  id: string
  userId: string
  nickname: string
  seriesId: string
  seriesName: string
  completedAt: string | null
}

type TabKey = 'series' | 'completed' | 'products'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'series', label: '시리즈별 도감 현황' },
  { key: 'completed', label: '완성 유저 목록' },
  { key: 'products', label: '상품별 수집률' },
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
  padding: 16,
  borderBottom: '1px solid #F0EEEA',
  verticalAlign: 'middle' as const,
}

const selectStyle = {
  border: '1px solid #E0DDD8',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  fontWeight: 700,
  color: '#1A1A1A',
  backgroundColor: '#FFFFFF',
  minWidth: 200,
  cursor: 'pointer',
}

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

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(Math.max(percent, 0), 100)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 999,
          backgroundColor: '#F0EEEA',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            backgroundColor: '#8CC63F',
          }}
        />
      </div>
      <span style={{ color: '#1A1A1A', fontSize: 13, fontWeight: 800, minWidth: 44 }}>
        {clamped}%
      </span>
    </div>
  )
}

function SeriesOverviewTab({ seriesStats }: { seriesStats: SeriesStat[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div style={cardStyle}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#FAFAF8' }}>
            <th style={thStyle}>시리즈명</th>
            <th style={thStyle}>전체 도감 수</th>
            <th style={thStyle}>완성 유저 수</th>
            <th style={thStyle}>완성률</th>
            <th style={thStyle}>상품 수</th>
          </tr>
        </thead>
        <tbody>
          {seriesStats.map((series) => {
            const expanded = expandedId === series.id

            return (
              <Fragment key={series.id}>
                <tr
                  onClick={() =>
                    setExpandedId((prev) => (prev === series.id ? null : series.id))
                  }
                  style={{
                    cursor: 'pointer',
                    backgroundColor: expanded ? '#FAFFF5' : 'transparent',
                  }}
                >
                  <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>
                    <span style={{ marginRight: 8 }}>{expanded ? '▼' : '▶'}</span>
                    {series.name}
                  </td>
                  <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                    {series.totalDex.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                    {series.completedCount.toLocaleString()}
                  </td>
                  <td style={tdStyle}>
                    <ProgressBar percent={series.completionRate} />
                  </td>
                  <td style={{ ...tdStyle, color: '#6B7280', fontSize: 14, fontWeight: 700 }}>
                    {series.productCount.toLocaleString()}
                  </td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={5} style={{ padding: 0, borderBottom: '1px solid #E0DDD8' }}>
                      <div
                        style={{
                          padding: '16px 20px 20px',
                          backgroundColor: '#FAFAF8',
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 12px',
                            color: '#6B7280',
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {series.name} · 상품별 수집률
                        </p>
                        {series.productRates.length === 0 ? (
                          <p style={{ margin: 0, color: '#6B7280', fontSize: 14 }}>
                            등록된 상품이 없습니다.
                          </p>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    ...thStyle,
                                    padding: '10px 12px',
                                    backgroundColor: '#FFFFFF',
                                  }}
                                >
                                  상품명
                                </th>
                                <th
                                  style={{
                                    ...thStyle,
                                    padding: '10px 12px',
                                    backgroundColor: '#FFFFFF',
                                  }}
                                >
                                  수집 유저 수
                                </th>
                                <th
                                  style={{
                                    ...thStyle,
                                    padding: '10px 12px',
                                    backgroundColor: '#FFFFFF',
                                  }}
                                >
                                  수집률
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {series.productRates.map((product) => (
                                <tr key={product.productId}>
                                  <td
                                    style={{
                                      ...tdStyle,
                                      padding: '12px',
                                      backgroundColor: '#FFFFFF',
                                      fontWeight: 700,
                                      fontSize: 14,
                                    }}
                                  >
                                    {product.productName}
                                  </td>
                                  <td
                                    style={{
                                      ...tdStyle,
                                      padding: '12px',
                                      backgroundColor: '#FFFFFF',
                                      fontSize: 14,
                                    }}
                                  >
                                    {product.collectedCount.toLocaleString()} /{' '}
                                    {series.totalDex.toLocaleString()}
                                  </td>
                                  <td
                                    style={{
                                      ...tdStyle,
                                      padding: '12px',
                                      backgroundColor: '#FFFFFF',
                                    }}
                                  >
                                    <ProgressBar percent={product.collectionRate} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>

      {seriesStats.length === 0 && (
        <div
          style={{
            color: '#6B7280',
            fontSize: 14,
            padding: 32,
            textAlign: 'center',
          }}
        >
          등록된 시리즈가 없습니다.
        </div>
      )}
    </div>
  )
}

function CompletedUsersTab({
  completedUsers,
  seriesStats,
}: {
  completedUsers: CompletedUserRow[]
  seriesStats: SeriesStat[]
}) {
  const [seriesFilter, setSeriesFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (seriesFilter === 'all') return completedUsers
    return completedUsers.filter((row) => row.seriesId === seriesFilter)
  }, [completedUsers, seriesFilter])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="completed-series-filter"
          style={{
            display: 'block',
            color: '#1A1A1A',
            fontSize: 13,
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          시리즈 필터
        </label>
        <select
          id="completed-series-filter"
          value={seriesFilter}
          onChange={(e) => setSeriesFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="all">전체 시리즈</option>
          {seriesStats.map((series) => (
            <option key={series.id} value={series.id}>
              {series.name}
            </option>
          ))}
        </select>
      </div>

      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#FAFAF8' }}>
              <th style={thStyle}>유저 닉네임</th>
              <th style={thStyle}>시리즈명</th>
              <th style={thStyle}>완성일</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>
                  {row.nickname}
                </td>
                <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                  {row.seriesName}
                </td>
                <td style={{ ...tdStyle, color: '#6B7280', fontSize: 14 }}>
                  {formatDate(row.completedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div
            style={{
              color: '#6B7280',
              fontSize: 14,
              padding: 32,
              textAlign: 'center',
            }}
          >
            {seriesFilter === 'all'
              ? '완성한 유저가 없습니다.'
              : '선택한 시리즈의 완성 유저가 없습니다.'}
          </div>
        )}
      </div>
    </div>
  )
}

function ProductCollectionTab({ seriesStats }: { seriesStats: SeriesStat[] }) {
  const [selectedSeriesId, setSelectedSeriesId] = useState(
    seriesStats[0]?.id ?? ''
  )

  const selected = useMemo(
    () => seriesStats.find((s) => s.id === selectedSeriesId) ?? null,
    [seriesStats, selectedSeriesId]
  )

  const sortedProducts = useMemo(() => {
    if (!selected) return []
    return [...selected.productRates].sort(
      (a, b) => b.collectionRate - a.collectionRate
    )
  }, [selected])

  if (seriesStats.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: 32, textAlign: 'center', color: '#6B7280' }}>
        등록된 시리즈가 없습니다.
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="product-series-select"
          style={{
            display: 'block',
            color: '#1A1A1A',
            fontSize: 13,
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          시리즈 선택
        </label>
        <select
          id="product-series-select"
          value={selectedSeriesId}
          onChange={(e) => setSelectedSeriesId(e.target.value)}
          style={selectStyle}
        >
          {seriesStats.map((series) => (
            <option key={series.id} value={series.id}>
              {series.name}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 12px', fontWeight: 700 }}>
          전체 도감 수: {selected.totalDex.toLocaleString()} · 기준 분모로 수집률 계산
        </p>
      )}

      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#FAFAF8' }}>
              <th style={thStyle}>상품명</th>
              <th style={thStyle}>수집 유저 수</th>
              <th style={thStyle}>수집률</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((product) => (
              <tr key={product.productId}>
                <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>
                  {product.productName}
                </td>
                <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                  {product.collectedCount.toLocaleString()} /{' '}
                  {(selected?.totalDex ?? 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  <ProgressBar percent={product.collectionRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedProducts.length === 0 && (
          <div
            style={{
              color: '#6B7280',
              fontSize: 14,
              padding: 32,
              textAlign: 'center',
            }}
          >
            선택한 시리즈에 등록된 상품이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}

export default function DexTabs({
  seriesStats,
  completedUsers,
}: {
  seriesStats: SeriesStat[]
  completedUsers: CompletedUserRow[]
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('series')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
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
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'series' && <SeriesOverviewTab seriesStats={seriesStats} />}
      {activeTab === 'completed' && (
        <CompletedUsersTab completedUsers={completedUsers} seriesStats={seriesStats} />
      )}
      {activeTab === 'products' && <ProductCollectionTab seriesStats={seriesStats} />}
    </div>
  )
}
