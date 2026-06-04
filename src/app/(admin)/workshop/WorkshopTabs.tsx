'use client'

import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'
import { addConfirmExchangeInventoryAction } from './actions'

export type ConfirmExchangeListRow = {
  id: string
  series_id: string
  product_id: string
  token_price: number | null
  status: 'available' | 'reserved' | 'used'
  admin_note: string | null
  created_at: string | null
  product_name: string
  product_image_url: string | null
  product_grade: string | null
  series_name: string
}

export type GachaSeriesOption = {
  id: string
  name: string
}

export type GachaProductOption = {
  id: string
  name: string
  image_url: string | null
  grade: string | null
  series_id: string
}

export type RandomExchangePoolSummary = {
  gacha_count: number | null
  kuji_count: number | null
  total_available: number | null
}

export type RandomExchangeListRow = {
  id: string
  product_name: string
  product_type: 'gacha' | 'kuji'
  source: 'user_return' | 'admin_stock'
  status: 'available' | 'consumed'
  created_at: string | null
}

export type SynthesisLogRow = {
  id: string
  user_id: string
  nickname: string
  submitted_count: number | null
  total_coin_value: number | null
  token_rewarded: number | null
  reroll_ticket_rewarded: number | null
  created_at: string | null
}

type MainTabKey = 'confirm_exchange' | 'random_exchange' | 'synthesis'

const MAIN_TABS: { key: MainTabKey; label: string }[] = [
  { key: 'confirm_exchange', label: '확정교환 재고' },
  { key: 'random_exchange', label: '랜덤교환 현황' },
  { key: 'synthesis', label: '합성 유입 현황' },
]

const initialActionState = { error: '', success: '' }

const inputStyle = {
  width: '100%',
  border: '1px solid #E0DDD8',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  color: '#1A1A1A',
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 6,
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

function formatNumber(value: number | null) {
  if (value == null) return '-'
  return value.toLocaleString()
}

function ProductImage({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{
          width: 48,
          height: 48,
          objectFit: 'cover',
          borderRadius: 8,
          border: '1px solid #E0DDD8',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        border: '1px solid #E0DDD8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      없음
    </div>
  )
}

function ConfirmStatusBadge({ status }: { status: ConfirmExchangeListRow['status'] }) {
  const styles = {
    available: { bg: '#EEFBD0', color: '#5B8B1E', label: '사용가능' },
    reserved: { bg: '#FEF3C7', color: '#D97706', label: '예약중' },
    used: { bg: '#F5F5F5', color: '#6B6B6B', label: '사용완료' },
  }[status]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: styles.bg,
        color: styles.color,
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {styles.label}
    </span>
  )
}

function StatusSummaryCard({
  label,
  value,
  accentColor,
}: {
  label: string
  value: number
  accentColor: string
}) {
  return (
    <div
      style={{
        flex: '1 1 160px',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E0DDD8',
        padding: '16px 20px',
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 6px', fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ color: accentColor, fontSize: 28, fontWeight: 900, margin: 0 }}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function PoolSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        flex: '1 1 160px',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E0DDD8',
        padding: '16px 20px',
      }}
    >
      <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 6px', fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ color: '#1A1A1A', fontSize: 28, fontWeight: 900, margin: 0 }}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function SourceBadge({ source }: { source: RandomExchangeListRow['source'] }) {
  const isUserReturn = source === 'user_return'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: isUserReturn ? '#EEFBD0' : '#DBEAFE',
        color: isUserReturn ? '#5B8B1E' : '#2563EB',
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {isUserReturn ? '유저 반납' : '운영자 등록'}
    </span>
  )
}

function RandomStatusBadge({ status }: { status: RandomExchangeListRow['status'] }) {
  const available = status === 'available'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: available ? '#EEFBD0' : '#F5F5F5',
        color: available ? '#5B8B1E' : '#6B6B6B',
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {available ? '사용가능' : '소진'}
    </span>
  )
}

function ActionMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null

  return (
    <div
      style={{
        backgroundColor: error ? '#FEE2E2' : '#EEFBD0',
        color: error ? '#DC2626' : '#5B8B1E',
        border: error ? '1px solid #FCA5A5' : '1px solid #B7E46B',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        fontWeight: 800,
        marginBottom: 16,
      }}
    >
      {error || success}
    </div>
  )
}

function AddInventoryModal({
  allSeries,
  allProducts,
  onClose,
}: {
  allSeries: GachaSeriesOption[]
  allProducts: GachaProductOption[]
  onClose: () => void
}) {
  const [selectedSeriesId, setSelectedSeriesId] = useState(allSeries[0]?.id ?? '')
  const [state, formAction, isPending] = useActionState(
    addConfirmExchangeInventoryAction,
    initialActionState
  )

  const seriesProducts = useMemo(
    () => allProducts.filter((product) => product.series_id === selectedSeriesId),
    [allProducts, selectedSeriesId]
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h3 style={{ color: '#1A1A1A', fontSize: 18, fontWeight: 900, margin: 0 }}>
            확정교환 재고 추가
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        <form action={formAction}>
          <ActionMessage error={state?.error} success={state?.success} />

          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={labelStyle}>시리즈</label>
              <select
                name="series_id"
                value={selectedSeriesId}
                onChange={(e) => setSelectedSeriesId(e.target.value)}
                style={inputStyle}
                required
              >
                {allSeries.length === 0 ? (
                  <option value="">등록된 시리즈 없음</option>
                ) : (
                  allSeries.map((series) => (
                    <option key={series.id} value={series.id}>
                      {series.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label style={labelStyle}>상품</label>
              <select
                name="product_id"
                style={inputStyle}
                required
                disabled={seriesProducts.length === 0}
                defaultValue={seriesProducts[0]?.id}
                key={selectedSeriesId}
              >
                {seriesProducts.length === 0 ? (
                  <option value="">해당 시리즈에 상품 없음</option>
                ) : (
                  seriesProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                      {product.grade ? ` (${product.grade})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label style={labelStyle}>토큰 가격</label>
              <input
                name="token_price"
                type="number"
                min={1}
                defaultValue={3}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>수량</label>
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>메모</label>
              <textarea
                name="admin_note"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || allSeries.length === 0}
            style={{
              backgroundColor: '#8CC63F',
              color: '#1A1A1A',
              border: 'none',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 900,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
              marginTop: 18,
              width: '100%',
            }}
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>
    </div>
  )
}

function DataTable({
  headers,
  rows,
  renderRow,
  emptyMessage,
}: {
  headers: string[]
  rows: { id: string }[]
  renderRow: (row: { id: string }) => React.ReactNode
  emptyMessage: string
}) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E0DDD8',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead style={{ backgroundColor: '#F9F9F9' }}>
            <tr>
              {headers.map((header) => (
                <th key={header} style={thStyle}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div
          style={{
            color: '#6B7280',
            fontSize: 14,
            padding: 32,
            textAlign: 'center',
          }}
        >
          {emptyMessage}
        </div>
      )}
    </div>
  )
}

function ConfirmExchangeTab({
  inventoryItems,
  statusCounts,
  allSeries,
  allProducts,
}: {
  inventoryItems: ConfirmExchangeListRow[]
  statusCounts: { available: number; reserved: number; used: number }
  allSeries: GachaSeriesOption[]
  allProducts: GachaProductOption[]
}) {
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  const filteredItems = useMemo(() => {
    if (seriesFilter === 'all') return inventoryItems
    return inventoryItems.filter((item) => item.series_id === seriesFilter)
  }, [inventoryItems, seriesFilter])

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatusSummaryCard
          label="사용가능"
          value={statusCounts.available}
          accentColor="#5B8B1E"
        />
        <StatusSummaryCard
          label="예약중"
          value={statusCounts.reserved}
          accentColor="#D97706"
        />
        <StatusSummaryCard label="사용완료" value={statusCounts.used} accentColor="#6B6B6B" />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <label style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>시리즈 필터</label>
        <select
          value={seriesFilter}
          onChange={(e) => setSeriesFilter(e.target.value)}
          style={{
            ...inputStyle,
            width: 'auto',
            minWidth: 200,
          }}
        >
          <option value="all">전체</option>
          {allSeries.map((series) => (
            <option key={series.id} value={series.id}>
              {series.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        headers={[
          '이미지',
          '상품명',
          '시리즈',
          '등급',
          '토큰가격',
          '상태',
          '등록일',
          '메모',
        ]}
        rows={filteredItems}
        renderRow={(item) => {
          const row = item as ConfirmExchangeListRow
          return (
            <tr key={row.id}>
              <td style={tdStyle}>
                <ProductImage url={row.product_image_url} name={row.product_name} />
              </td>
              <td
                style={{
                  ...tdStyle,
                  color: '#1A1A1A',
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {row.product_name}
              </td>
              <td style={{ ...tdStyle, color: '#6B7280', fontSize: 14 }}>{row.series_name}</td>
              <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                {row.product_grade ?? '-'}
              </td>
              <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                {formatNumber(row.token_price)}
              </td>
              <td style={tdStyle}>
                <ConfirmStatusBadge status={row.status} />
              </td>
              <td style={{ ...tdStyle, color: '#6B7280', fontSize: 14 }}>
                {formatDate(row.created_at)}
              </td>
              <td
                style={{
                  ...tdStyle,
                  color: '#6B7280',
                  fontSize: 13,
                  maxWidth: 200,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {row.admin_note?.trim() || '-'}
              </td>
            </tr>
          )
        }}
        emptyMessage="표시할 재고가 없습니다."
      />

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            backgroundColor: '#8CC63F',
            color: '#1A1A1A',
            border: 'none',
            borderRadius: 10,
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          재고 추가
        </button>
      </div>

      {showAddModal && (
        <AddInventoryModal
          allSeries={allSeries}
          allProducts={allProducts}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  )
}

function RandomExchangeTab({
  poolSummary,
  randomExchangeItems,
}: {
  poolSummary: RandomExchangePoolSummary | null
  randomExchangeItems: RandomExchangeListRow[]
}) {
  const gachaCount = Number(poolSummary?.gacha_count ?? 0)
  const kujiCount = Number(poolSummary?.kuji_count ?? 0)
  const totalAvailable = Number(poolSummary?.total_available ?? 0)

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <PoolSummaryCard label="가챠 상품 수" value={gachaCount} />
        <PoolSummaryCard label="쿠지 상품 수" value={kujiCount} />
        <PoolSummaryCard label="전체 사용가능" value={totalAvailable} />
      </div>

      <DataTable
        headers={['상품명', '종류', '출처', '상태', '등록일']}
        rows={randomExchangeItems}
        renderRow={(item) => {
          const row = item as RandomExchangeListRow
          return (
            <tr key={row.id}>
              <td
                style={{
                  ...tdStyle,
                  color: '#1A1A1A',
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {row.product_name}
              </td>
              <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                {row.product_type === 'gacha' ? '가챠' : '쿠지'}
              </td>
              <td style={tdStyle}>
                <SourceBadge source={row.source} />
              </td>
              <td style={tdStyle}>
                <RandomStatusBadge status={row.status} />
              </td>
              <td style={{ ...tdStyle, color: '#6B7280', fontSize: 14 }}>
                {formatDate(row.created_at)}
              </td>
            </tr>
          )
        }}
        emptyMessage="최근 랜덤교환 풀 재고가 없습니다."
      />

      <div style={{ marginTop: 16 }}>
        <Link
          href="/bad-inventory"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: '#2563EB',
            fontSize: 14,
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          악성재고 관리 페이지로 이동 →
        </Link>
      </div>
    </>
  )
}

const synthesisUserSelectStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #E0DDD8',
  fontSize: 14,
  outline: 'none',
  minWidth: 200,
}

function SynthesisTab({ synthesisLogs }: { synthesisLogs: SynthesisLogRow[] }) {
  const [userFilter, setUserFilter] = useState('all')

  const userOptions = useMemo(() => {
    const nicknames = [
      ...new Set(synthesisLogs.map((log) => log.nickname).filter(Boolean)),
    ]
    return nicknames.sort((a, b) => a.localeCompare(b, 'ko'))
  }, [synthesisLogs])

  const filteredLogs = useMemo(() => {
    if (userFilter === 'all') return synthesisLogs
    return synthesisLogs.filter((log) => log.nickname === userFilter)
  }, [synthesisLogs, userFilter])

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <label style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>유저</label>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          style={synthesisUserSelectStyle}
        >
          <option value="all">전체</option>
          {userOptions.map((nickname) => (
            <option key={nickname} value={nickname}>
              {nickname}
            </option>
          ))}
        </select>
      </div>

      <DataTable
      headers={[
        '일시',
        '유저',
        '제출수량',
        '코인가치',
        '토큰보상',
        '리롤권보상',
      ]}
      rows={filteredLogs}
      renderRow={(item) => {
        const row = item as SynthesisLogRow
        return (
          <tr key={row.id}>
            <td style={{ ...tdStyle, color: '#6B7280', fontSize: 14 }}>
              {formatDate(row.created_at)}
            </td>
            <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>
              {row.nickname}
            </td>
            <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
              {formatNumber(row.submitted_count)}
            </td>
            <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
              {formatNumber(row.total_coin_value)}
            </td>
            <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
              {formatNumber(row.token_rewarded)}
            </td>
            <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
              {formatNumber(row.reroll_ticket_rewarded)}
            </td>
          </tr>
        )
      }}
      emptyMessage={
        userFilter === 'all'
          ? '합성 유입 기록이 없습니다.'
          : '선택한 유저의 합성 유입 기록이 없습니다.'
      }
    />
    </>
  )
}

export default function WorkshopTabs({
  inventoryItems,
  statusCounts,
  allSeries,
  allProducts,
  poolSummary,
  randomExchangeItems,
  synthesisLogs,
}: {
  inventoryItems: ConfirmExchangeListRow[]
  statusCounts: { available: number; reserved: number; used: number }
  allSeries: GachaSeriesOption[]
  allProducts: GachaProductOption[]
  poolSummary: RandomExchangePoolSummary | null
  randomExchangeItems: RandomExchangeListRow[]
  synthesisLogs: SynthesisLogRow[]
}) {
  const [activeTab, setActiveTab] = useState<MainTabKey>('confirm_exchange')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {MAIN_TABS.map((tab) => {
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

      {activeTab === 'confirm_exchange' && (
        <ConfirmExchangeTab
          inventoryItems={inventoryItems}
          statusCounts={statusCounts}
          allSeries={allSeries}
          allProducts={allProducts}
        />
      )}

      {activeTab === 'random_exchange' && (
        <RandomExchangeTab
          poolSummary={poolSummary}
          randomExchangeItems={randomExchangeItems}
        />
      )}

      {activeTab === 'synthesis' && <SynthesisTab synthesisLogs={synthesisLogs} />}
    </div>
  )
}
