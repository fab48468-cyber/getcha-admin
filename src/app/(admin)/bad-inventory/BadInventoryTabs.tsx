'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addBadInventoryAction,
  consumeItemAction,
  toggleFeaturedAction,
} from './actions'

export type BadInventoryListRow = {
  id: string
  product_id: string
  product_type: 'gacha' | 'kuji'
  pool_type: 'random_exchange' | 'mystery_gacha'
  source: 'user_return' | 'admin_stock'
  status: 'available' | 'consumed'
  is_featured: boolean
  admin_note: string | null
  created_at: string | null
  product_name: string
  product_image_url: string | null
  product_grade: string | null
  series_name: string
}

type PoolTabKey = 'random_exchange' | 'mystery_gacha'
type ProductFilterKey = 'all' | 'gacha' | 'kuji'

const POOL_TABS = [
  { key: 'random_exchange' as const, label: '랜덤교환 풀' },
  { key: 'mystery_gacha' as const, label: '미스터리가챠 풀' },
]

const PRODUCT_FILTERS = [
  { key: 'all' as const, label: '전체' },
  { key: 'gacha' as const, label: '가챠' },
  { key: 'kuji' as const, label: '쿠지' },
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

function SourceBadge({ source }: { source: BadInventoryListRow['source'] }) {
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

function StatusBadge({ status }: { status: BadInventoryListRow['status'] }) {
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

function ProductTypeLabel({ productType }: { productType: 'gacha' | 'kuji' }) {
  return (
    <span style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
      {productType === 'gacha' ? '가챠' : '쿠지'}
    </span>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        flex: '1 1 140px',
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

function ActionMessage({
  error,
  success,
}: {
  error?: string
  success?: string
}) {
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
  title,
  poolType,
  showFeatured,
  onClose,
}: {
  title: string
  poolType: PoolTabKey
  showFeatured: boolean
  onClose: () => void
}) {
  const [state, formAction, isPending] = useActionState(
    addBadInventoryAction,
    initialActionState
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
            {title}
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
          <input type="hidden" name="pool_type" value={poolType} />
          <ActionMessage error={state?.error} success={state?.success} />

          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={labelStyle}>상품 종류</label>
              <select name="product_type" defaultValue="gacha" style={inputStyle}>
                <option value="gacha">가챠</option>
                <option value="kuji">쿠지</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>상품 ID</label>
              <input name="product_id" required style={inputStyle} placeholder="UUID" />
            </div>
            {showFeatured && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#1A1A1A',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" name="is_featured" />
                추천 상품으로 등록
              </label>
            )}
            <div>
              <label style={labelStyle}>관리자 메모</label>
              <textarea
                name="admin_note"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
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

function FeaturedToggle({ item }: { item: BadInventoryListRow }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleChange(checked: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await toggleFeaturedAction(item.id, checked)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      <input
        type="checkbox"
        checked={item.is_featured}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.checked)}
        style={{ width: 18, height: 18, cursor: isPending ? 'not-allowed' : 'pointer' }}
      />
      {error && (
        <p style={{ color: '#DC2626', fontSize: 11, margin: '4px 0 0' }}>{error}</p>
      )}
    </div>
  )
}

function ConsumeButton({ item }: { item: BadInventoryListRow }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (item.status !== 'available') {
    return <span style={{ color: '#9CA3AF', fontSize: 13 }}>-</span>
  }

  function handleConsume() {
    if (!confirm('이 재고를 소진 처리할까요?')) return
    setError(null)
    startTransition(async () => {
      const result = await consumeItemAction(item.id)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleConsume}
        disabled={isPending}
        style={{
          backgroundColor: '#FFFFFF',
          color: '#6B7280',
          border: '1px solid #E0DDD8',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 13,
          fontWeight: 800,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? '처리 중...' : '소진 처리'}
      </button>
      {error && (
        <p style={{ color: '#DC2626', fontSize: 11, margin: '4px 0 0' }}>{error}</p>
      )}
    </div>
  )
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

export default function BadInventoryTabs({
  items,
}: {
  items: BadInventoryListRow[]
}) {
  const [activePool, setActivePool] = useState<PoolTabKey>('random_exchange')
  const [productFilter, setProductFilter] = useState<ProductFilterKey>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  const poolItems = useMemo(
    () => items.filter((item) => item.pool_type === activePool),
    [items, activePool]
  )

  const randomExchangeItems = useMemo(
    () => items.filter((item) => item.pool_type === 'random_exchange'),
    [items]
  )

  const mysteryItems = useMemo(
    () => items.filter((item) => item.pool_type === 'mystery_gacha'),
    [items]
  )

  const filteredRandomItems = useMemo(() => {
    if (productFilter === 'all') return randomExchangeItems
    return randomExchangeItems.filter((item) => item.product_type === productFilter)
  }, [randomExchangeItems, productFilter])

  const randomStats = useMemo(
    () => ({
      available: randomExchangeItems.filter((i) => i.status === 'available').length,
      consumed: randomExchangeItems.filter((i) => i.status === 'consumed').length,
    }),
    [randomExchangeItems]
  )

  const mysteryStats = useMemo(
    () => ({
      available: mysteryItems.filter((i) => i.status === 'available').length,
      featured: mysteryItems.filter((i) => i.is_featured).length,
    }),
    [mysteryItems]
  )

  const displayItems =
    activePool === 'random_exchange' ? filteredRandomItems : poolItems

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {POOL_TABS.map((tab) => {
          const active = activePool === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActivePool(tab.key)
                setProductFilter('all')
              }}
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

      {activePool === 'random_exchange' ? (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <SummaryCard label="사용가능" value={randomStats.available} />
            <SummaryCard label="소진" value={randomStats.consumed} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {PRODUCT_FILTERS.map((tab) => {
              const active = productFilter === tab.key
              const count =
                tab.key === 'all'
                  ? randomExchangeItems.length
                  : randomExchangeItems.filter((i) => i.product_type === tab.key)
                      .length

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setProductFilter(tab.key)}
                  style={{
                    backgroundColor: active ? '#1A1A1A' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#6B7280',
                    border: '1px solid #E0DDD8',
                    borderRadius: 999,
                    padding: '7px 12px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {tab.label} {count.toLocaleString()}
                </button>
              )
            })}
          </div>

          <InventoryTable
            headers={[
              '이미지',
              '상품명',
              '시리즈',
              '등급',
              '종류',
              '출처',
              '상태',
              '등록일',
            ]}
            rows={displayItems}
            renderRow={(item) => (
              <tr key={item.id}>
                <td style={tdStyle}>
                  <ProductImage url={item.product_image_url} name={item.product_name} />
                </td>
                <td
                  style={{
                    ...tdStyle,
                    color: '#1A1A1A',
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {item.product_name}
                </td>
                <td style={{ ...tdStyle, color: '#6B7280', fontSize: 14 }}>
                  {item.series_name}
                </td>
                <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                  {item.product_grade ?? '-'}
                </td>
                <td style={tdStyle}>
                  <ProductTypeLabel productType={item.product_type} />
                </td>
                <td style={tdStyle}>
                  <SourceBadge source={item.source} />
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={item.status} />
                </td>
                <td style={{ ...tdStyle, color: '#6B7280', fontSize: 14 }}>
                  {formatDate(item.created_at)}
                </td>
              </tr>
            )}
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
              운영자 재고 추가
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <SummaryCard label="사용가능" value={mysteryStats.available} />
            <SummaryCard label="추천 상품" value={mysteryStats.featured} />
          </div>

          <InventoryTable
            headers={[
              '이미지',
              '상품명',
              '시리즈',
              '등급',
              '종류',
              '추천',
              '상태',
              '등록일',
              '관리',
            ]}
            rows={displayItems}
            renderRow={(item) => (
              <tr key={item.id}>
                <td style={tdStyle}>
                  <ProductImage url={item.product_image_url} name={item.product_name} />
                </td>
                <td
                  style={{
                    ...tdStyle,
                    color: '#1A1A1A',
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {item.product_name}
                </td>
                <td style={{ ...tdStyle, color: '#6B7280', fontSize: 14 }}>
                  {item.series_name}
                </td>
                <td style={{ ...tdStyle, color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                  {item.product_grade ?? '-'}
                </td>
                <td style={tdStyle}>
                  <ProductTypeLabel productType={item.product_type} />
                </td>
                <td style={tdStyle}>
                  <FeaturedToggle item={item} />
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={item.status} />
                </td>
                <td style={{ ...tdStyle, color: '#6B7280', fontSize: 14 }}>
                  {formatDate(item.created_at)}
                </td>
                <td style={tdStyle}>
                  <ConsumeButton item={item} />
                </td>
              </tr>
            )}
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
              미스터리 재고 추가
            </button>
          </div>
        </>
      )}

      {showAddModal && (
        <AddInventoryModal
          title={
            activePool === 'random_exchange'
              ? '운영자 재고 추가 (랜덤교환)'
              : '미스터리 재고 추가'
          }
          poolType={activePool}
          showFeatured={activePool === 'mystery_gacha'}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}

function InventoryTable<T extends { id: string }>({
  headers,
  rows,
  renderRow,
  emptyMessage,
}: {
  headers: string[]
  rows: T[]
  renderRow: (row: T) => React.ReactNode
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
