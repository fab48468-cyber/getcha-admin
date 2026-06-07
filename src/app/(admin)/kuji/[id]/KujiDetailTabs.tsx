'use client'

import { useActionState, useState } from 'react'
import ImageCropUpload from '@/components/ImageCropUpload'
import {
  createKujiProductAction,
  createKujiTicketsAction,
  updateKujiSeriesAction,
  deleteKujiSeriesAction,
} from '../actions'
import { uploadKujiImageAction } from './uploadAction'

type Series = {
  id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  coin_price_per_ticket: number | null
  status: 'active' | 'completed' | 'closed'
  total_tickets: number | null
  remaining_tickets: number | null
  last_one_product_id: string | null
}

type Product = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  grade: string | null
  is_last_one: boolean | null
  display_order: number | null
}

type TicketCounts = {
  available: number
  selecting: number
  sold: number
  total: number
}

type KujiDetailTabsProps = {
  series: Series
  products: Product[]
  ticketCounts: TicketCounts
  ticketCountByProduct: Record<string, number>
}

const initialActionState = { error: '', success: '' }

function getGradeColor(grade: string | null | undefined) {
  const normalized = (grade ?? '').trim().toLowerCase()

  if (normalized === 'last_one') return '#DC2626'
  if (normalized === 's') return '#7C3AED'
  if (normalized === 'a') return '#2563EB'
  if (normalized === 'b') return '#059669'

  return '#6B7280'
}

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

function GradeBadge({ grade }: { grade: Product['grade'] }) {
  const displayGrade = grade?.trim() || '-'
  const color = getGradeColor(grade)

  return (
    <span
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 900,
      }}
    >
      {displayGrade}
    </span>
  )
}

function SeriesEditForm({
  series,
  lastOneProducts,
}: {
  series: Series
  lastOneProducts: Product[]
}) {
  const [state, formAction, isPending] = useActionState(
    updateKujiSeriesAction.bind(null, series.id),
    initialActionState
  )
  const [thumbUrl, setThumbUrl] = useState(series.thumbnail_url ?? '')

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
          <label style={labelStyle}>썸네일 이미지</label>
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt="현재 썸네일"
              style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 10, border: '1px solid #E0DDD8', marginBottom: 8 }}
            />
          )}
          <ImageCropUpload
            onUploaded={(url) => setThumbUrl(url)}
            uploadAction={uploadKujiImageAction}
            aspect={1}
            maxSize={800}
          />
          <input name="thumbnail_url" type="hidden" value={thumbUrl} />
        </div>

        <div>
          <label style={labelStyle}>티켓 코인 가격</label>
          <input
            name="coin_price_per_ticket"
            type="number"
            min={0}
            defaultValue={series.coin_price_per_ticket ?? 100}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>상태</label>
            <select name="status" defaultValue={series.status} style={inputStyle}>
              <option value="active">active</option>
              <option value="completed">completed</option>
              <option value="closed">closed</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>라스트원 상품</label>
            <select
              name="last_one_product_id"
              defaultValue={series.last_one_product_id ?? ''}
              style={inputStyle}
            >
              <option value="">없음</option>
              {lastOneProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
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
    createKujiProductAction.bind(null, seriesId),
    initialActionState
  )
  const [imageUrl, setImageUrl] = useState('')
  const [isLastOne, setIsLastOne] = useState(false)

  function handleClose() {
    setIsLastOne(false)
    onClose()
  }

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
            onClick={handleClose}
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
                uploadAction={uploadKujiImageAction}
                aspect={1}
                maxSize={800}
              />
              <input name="image_url" type="hidden" value={imageUrl} />
            </div>
            <div>
              <label style={labelStyle}>등급</label>
              <input
                name="grade"
                type="text"
                required
                placeholder="예: A, B, last_one, 특상 등"
                defaultValue=""
                style={inputStyle}
              />
              <p style={{ color: '#6B7280', fontSize: 12, margin: '6px 0 0' }}>
                등급명을 자유롭게 입력하세요 (예: A, B, C, last_one)
              </p>
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#1A1A1A',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <input
                name="is_last_one"
                type="checkbox"
                checked={isLastOne}
                onChange={(e) => setIsLastOne(e.target.checked)}
              />
              라스트원 상품
            </label>
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

function ProductCard({ product }: { product: Product }) {
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
          <GradeBadge grade={product.grade} />
          {product.is_last_one && (
            <span
              style={{
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                borderRadius: 999,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              LAST ONE
            </span>
          )}
        </div>
        {product.description && (
          <p style={{ color: '#6B7280', fontSize: 13, margin: '8px 0 0' }}>
            {product.description}
          </p>
        )}
      </div>
    </div>
  )
}

function TicketCreateForm({
  series,
  products,
  ticketCountByProduct,
}: {
  series: Series
  products: Product[]
  ticketCountByProduct: Record<string, number>
}) {
  const [state, formAction, isPending] = useActionState(
    createKujiTicketsAction.bind(null, series.id),
    initialActionState
  )
  const isClosed = series.status === 'closed'

  return (
    <form action={formAction}>
      <ActionMessage error={state?.error} success={state?.success} />

      {!isClosed && (
        <div
          style={{
            backgroundColor: '#FFF7ED',
            color: '#D97706',
            border: '1px solid #FDBA74',
            borderRadius: 10,
            padding: 12,
            fontSize: 14,
            fontWeight: 800,
            marginBottom: 16,
          }}
        >
          티켓 생성은 status가 closed인 시리즈에서만 가능합니다.
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 160px',
              gap: 12,
              alignItems: 'center',
              borderBottom: '1px solid #F0EEEA',
              paddingBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ color: '#1A1A1A', fontSize: 14 }}>{product.name}</strong>
              <GradeBadge grade={product.grade} />
              <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 700 }}>
                현재 {(ticketCountByProduct[product.id] ?? 0).toLocaleString()}장
              </span>
            </div>
            <input
              name={`quantity_${product.id}`}
              type="number"
              min={0}
              disabled={!isClosed}
              placeholder="생성 수량"
              style={inputStyle}
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isPending || !isClosed || products.length === 0}
        style={{
          backgroundColor: '#8CC63F',
          color: '#1A1A1A',
          border: 'none',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 14,
          fontWeight: 900,
          cursor: isPending || !isClosed ? 'not-allowed' : 'pointer',
          opacity: isPending || !isClosed ? 0.6 : 1,
          marginTop: 18,
        }}
      >
        {isPending ? '생성 중...' : '티켓 생성'}
      </button>
    </form>
  )
}

export default function KujiDetailTabs({
  series,
  products,
  ticketCounts,
  ticketCountByProduct,
}: KujiDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'series' | 'products' | 'tickets'>(
    'series'
  )
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const lastOneProducts = products.filter((product) => product.is_last_one)

  const tabs = [
    { key: 'series', label: '시리즈 정보 수정' },
    { key: 'products', label: '상품 목록' },
    { key: 'tickets', label: '티켓 관리' },
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
            <SeriesEditForm series={series} lastOneProducts={lastOneProducts} />
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
              시리즈를 삭제하면 관련 상품과 티켓도 모두 삭제됩니다. 이 작업은 되돌릴 수 없어요.
            </p>
            <ActionMessage error={deleteError} />
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
                  disabled={isDeleting}
                  onClick={async () => {
                    setDeleteError('')
                    setIsDeleting(true)
                    const result = await deleteKujiSeriesAction(series.id)
                    // 성공 시 액션 내부 redirect()가 throw되어 여기 도달 안 함.
                    // 여기 도달했다면 result에 error가 담겨 반환된 경우.
                    if (result?.error) {
                      setDeleteError(result.error)
                    }
                    setIsDeleting(false)
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
                  {isDeleting ? '삭제 중...' : '삭제 확인'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteError('')
                  }}
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
              <ProductCard key={product.id} product={product} />
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

      {activeTab === 'tickets' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #E0DDD8',
              padding: 20,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            {[
              ['available', ticketCounts.available],
              ['selecting', ticketCounts.selecting],
              ['sold', ticketCounts.sold],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>
                  {label}
                </div>
                <div
                  style={{
                    color: '#1A1A1A',
                    fontSize: 28,
                    fontWeight: 900,
                    marginTop: 4,
                  }}
                >
                  {Number(value).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #E0DDD8',
              padding: 20,
            }}
          >
            <h3
              style={{
                color: '#1A1A1A',
                fontSize: 18,
                fontWeight: 900,
                margin: '0 0 16px',
              }}
            >
              티켓 bulk 생성
            </h3>
            <TicketCreateForm
              series={series}
              products={products}
              ticketCountByProduct={ticketCountByProduct}
            />
          </div>
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
