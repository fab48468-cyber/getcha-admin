'use client'

import { useActionState, useState } from 'react'
import ImageCropUpload from '@/components/ImageCropUpload'
import {
  addGachaInventoryAction,
  createGachaProductAction,
  updateGachaSeriesAction,
  deleteGachaSeriesAction,
} from '../actions'
import { uploadGachaImageAction } from './uploadAction'

type Series = {
  id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  coin_price_per_pull: number | null
  status: 'active' | 'sold_out' | 'closed'
  max_concurrent_users: number | null
}

type Product = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  grade: string | null
  display_order: number | null
}

type InventoryCounts = Record<
  string,
  {
    available: number
    allocated: number
    sold: number
    total: number
  }
>

type GachaDetailTabsProps = {
  series: Series
  products: Product[]
  inventoryCounts: InventoryCounts
}

const initialActionState = { error: '', success: '' }

const inputStyle = {
  width: '100%',
  border: '1px solid #E0DDD8',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
} as const

const labelStyle = {
  display: 'block',
  color: '#1A1A1A',
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 6,
} as const

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

function SeriesEditForm({ series }: { series: Series }) {
  const [state, formAction, isPending] = useActionState(
    updateGachaSeriesAction.bind(null, series.id),
    initialActionState
  )

  return (
    <form action={formAction}>
      <ActionMessage error={state?.error} success={state?.success} />

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={labelStyle}>시리즈명</label>
          <input name="name" required defaultValue={series.name} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>설명</label>
          <textarea
            name="description"
            rows={5}
            defaultValue={series.description ?? ''}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={labelStyle}>썸네일 URL</label>
          <input
            name="thumbnail_url"
            type="text"
            defaultValue={series.thumbnail_url ?? ''}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>뽑기 코인 가격</label>
            <input
              name="coin_price_per_pull"
              type="number"
              min={0}
              defaultValue={series.coin_price_per_pull ?? 100}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>최대 동시 참여자 수</label>
            <input
              name="max_concurrent_users"
              type="number"
              min={1}
              defaultValue={series.max_concurrent_users ?? 10}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>상태</label>
          <select name="status" defaultValue={series.status} style={inputStyle}>
            <option value="active">active</option>
            <option value="sold_out">sold_out</option>
            <option value="closed">closed</option>
          </select>
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
          marginTop: 20,
        }}
      >
        {isPending ? '저장 중...' : '저장'}
      </button>
    </form>
  )
}

function ProductCreateModal({
  seriesId,
  onClose,
}: {
  seriesId: string
  onClose: () => void
}) {
  const [state, formAction, isPending] = useActionState(
    createGachaProductAction.bind(null, seriesId),
    initialActionState
  )
  const [imageUrl, setImageUrl] = useState('')

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
            상품 추가
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
              <label style={labelStyle}>상품명</label>
              <input name="name" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>이미지</label>
              <ImageCropUpload
                onUploaded={(url) => setImageUrl(url)}
                uploadAction={uploadGachaImageAction}
                aspect={1}
                maxSize={800}
              />
              <input name="image_url" type="hidden" value={imageUrl} />
            </div>
            <div>
              <label style={labelStyle}>등급</label>
              <select name="grade" defaultValue="A" style={inputStyle}>
                {['S', 'A', 'B', 'C', 'D', 'E'].map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>노출 순서</label>
              <input name="display_order" type="number" defaultValue={0} style={inputStyle} />
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
            {isPending ? '저장 중...' : '상품 저장'}
          </button>
        </form>
      </div>
    </div>
  )
}

function InventoryAddForm({
  seriesId,
  productId,
}: {
  seriesId: string
  productId: string
}) {
  const [state, formAction, isPending] = useActionState(
    addGachaInventoryAction.bind(null, seriesId, productId),
    initialActionState
  )

  return (
    <form action={formAction} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        name="quantity"
        type="number"
        min={1}
        placeholder="수량"
        style={{ ...inputStyle, width: 110 }}
      />
      <button
        type="submit"
        disabled={isPending}
        style={{
          backgroundColor: '#8CC63F',
          color: '#1A1A1A',
          border: 'none',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 13,
          fontWeight: 900,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        추가
      </button>
      {(state?.error || state?.success) && (
        <span
          style={{
            color: state.error ? '#DC2626' : '#5B8B1E',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {state.error || state.success}
        </span>
      )}
    </form>
  )
}

function ProductCard({
  product,
  counts,
}: {
  product: Product
  counts: InventoryCounts[string]
}) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E0DDD8',
        padding: 16,
        display: 'flex',
        gap: 14,
      }}
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          style={{
            width: 88,
            height: 88,
            objectFit: 'cover',
            borderRadius: 10,
            border: '1px solid #E0DDD8',
          }}
        />
      ) : (
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 10,
            backgroundColor: '#E5E7EB',
            flexShrink: 0,
          }}
        />
      )}

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ color: '#1A1A1A', fontSize: 15 }}>{product.name}</strong>
          <span
            style={{
              backgroundColor: '#F0EEFF',
              color: '#8B5CF6',
              borderRadius: 999,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {product.grade ?? '-'}
          </span>
        </div>
        <p style={{ color: '#6B7280', fontSize: 13, margin: '8px 0 0' }}>
          가용 {counts.available.toLocaleString()} / 전체 {counts.total.toLocaleString()}
        </p>
      </div>
    </div>
  )
}

export default function GachaDetailTabs({
  series,
  products,
  inventoryCounts,
}: GachaDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'series' | 'products' | 'inventory'>(
    'series'
  )
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const tabs = [
    { key: 'series', label: '시리즈 정보 수정' },
    { key: 'products', label: '상품 목록' },
    { key: 'inventory', label: '재고 관리' },
  ] as const

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tabs.map((tab) => {
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

      {activeTab === 'series' && (
        <div style={{ display: 'grid', gap: 12, maxWidth: 760 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #E0DDD8',
              padding: 20,
            }}
          >
            <SeriesEditForm series={series} />
          </div>

          <div
            style={{
              backgroundColor: '#FEF2F2',
              borderRadius: 12,
              border: '1px solid #FCA5A5',
              padding: 20,
            }}
          >
            <h3 style={{ color: '#991B1B', fontSize: 15, fontWeight: 900, margin: '0 0 8px' }}>
              위험 구역
            </h3>
            <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 14px' }}>
              시리즈를 삭제하면 관련 상품과 재고도 모두 삭제됩니다. 이 작업은 되돌릴 수 없어요.
            </p>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  backgroundColor: '#EF4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                시리즈 삭제
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#991B1B', fontWeight: 700 }}>
                  정말 삭제할까요?
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteGachaSeriesAction(series.id)
                  }}
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  삭제 확인
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    backgroundColor: '#fff',
                    color: '#6B7280',
                    border: '1px solid #E0DDD8',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setIsProductModalOpen(true)}
              style={{
                backgroundColor: '#8CC63F',
                color: '#1A1A1A',
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 14,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              상품 추가
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                counts={
                  inventoryCounts[product.id] ?? {
                    available: 0,
                    allocated: 0,
                    sold: 0,
                    total: 0,
                  }
                }
              />
            ))}
          </div>

          {products.length === 0 && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E0DDD8',
                color: '#6B7280',
                fontSize: 14,
                padding: 32,
                textAlign: 'center',
              }}
            >
              등록된 상품이 없습니다.
            </div>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
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
                {['상품', '현재 재고 현황', '재고 추가'].map((header) => (
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
              {products.map((product) => {
                const counts = inventoryCounts[product.id] ?? {
                  available: 0,
                  allocated: 0,
                  sold: 0,
                  total: 0,
                }

                return (
                  <tr key={product.id}>
                    <td
                      style={{
                        color: '#1A1A1A',
                        fontSize: 14,
                        fontWeight: 800,
                        padding: 16,
                        borderBottom: '1px solid #F0EEEA',
                      }}
                    >
                      {product.name}
                    </td>
                    <td
                      style={{
                        color: '#6B7280',
                        fontSize: 14,
                        padding: 16,
                        borderBottom: '1px solid #F0EEEA',
                      }}
                    >
                      available {counts.available.toLocaleString()} / allocated{' '}
                      {counts.allocated.toLocaleString()} / sold{' '}
                      {counts.sold.toLocaleString()}
                    </td>
                    <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                      <InventoryAddForm seriesId={series.id} productId={product.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {products.length === 0 && (
            <div
              style={{
                color: '#6B7280',
                fontSize: 14,
                padding: 32,
                textAlign: 'center',
              }}
            >
              재고를 추가할 상품이 없습니다.
            </div>
          )}
        </div>
      )}

      {isProductModalOpen && (
        <ProductCreateModal
          seriesId={series.id}
          onClose={() => setIsProductModalOpen(false)}
        />
      )}
    </div>
  )
}
