'use client'

import { useActionState, useMemo, useRef, useState, useTransition } from 'react'
import {
  createBannerAction,
  deleteBannerAction,
  updateBannerAction,
} from './actions'
import BannerImageField from './BannerImageField'
import { uploadBannerImageAction } from './uploadAction'
import {
  LINK_TYPE_LABELS,
  toDatetimeLocalValue,
  type BannerLinkType,
  type GachaSeriesPickerRow,
  type KujiSeriesPickerRow,
} from './banner-utils'

const initialState: { error: string; success?: string } = { error: '' }

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

type BannerFormProps = {
  mode: 'create' | 'edit'
  bannerId?: string
  defaultDisplayOrder: number
  gachaSeries: GachaSeriesPickerRow[]
  kujiSeries: KujiSeriesPickerRow[]
  initial?: {
    title: string
    image_url: string
    link_type: BannerLinkType
    link_value: string | null
    display_order: number
    is_active: boolean
    starts_at: string | null
    ends_at: string | null
  }
}

function statusBadgeStyle(status: string) {
  if (status === 'active') {
    return { backgroundColor: '#EEFBD0', color: '#5B8B1E', label: 'active' }
  }
  if (status === 'sold_out' || status === 'completed') {
    return { backgroundColor: '#FEE2E2', color: '#DC2626', label: status }
  }
  if (status === 'closed') {
    return { backgroundColor: '#F5F5F5', color: '#6B6B6B', label: status }
  }
  return { backgroundColor: '#DBEAFE', color: '#3B82F6', label: status }
}

function sortActiveFirst<T extends { status: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aActive = a.status === 'active' ? 0 : 1
    const bActive = b.status === 'active' ? 0 : 1
    return aActive - bActive
  })
}

export default function BannerForm({
  mode,
  bannerId,
  defaultDisplayOrder,
  gachaSeries,
  kujiSeries,
  initial,
}: BannerFormProps) {
  const serverAction =
    mode === 'create'
      ? createBannerAction
      : updateBannerAction.bind(null, bannerId!)

  const croppedBlobRef = useRef<Blob | null>(null)
  const uploadedUrlRef = useRef<string | null>(null)
  const [linkType, setLinkType] = useState<BannerLinkType>(
    initial?.link_type ?? 'none'
  )
  const [linkValue, setLinkValue] = useState(initial?.link_value ?? '')
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocalValue(initial?.starts_at ?? null)
  )
  const [endsAt, setEndsAt] = useState(
    toDatetimeLocalValue(initial?.ends_at ?? null)
  )
  const [clientError, setClientError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  const sortedGacha = useMemo(
    () => sortActiveFirst(gachaSeries),
    [gachaSeries]
  )
  const sortedKuji = useMemo(() => sortActiveFirst(kujiSeries), [kujiSeries])

  const externalUrlInvalid =
    linkType === 'external_url' &&
    linkValue.trim().length > 0 &&
    !/^https:\/\//i.test(linkValue.trim())

  const periodInvalid =
    Boolean(startsAt) &&
    Boolean(endsAt) &&
    new Date(endsAt).getTime() <= new Date(startsAt).getTime()

  const missingLinkTarget =
    (linkType === 'gacha_detail' || linkType === 'kuji_detail') &&
    !linkValue.trim()

  const saveDisabled =
    externalUrlInvalid ||
    periodInvalid ||
    missingLinkTarget ||
    (linkType === 'external_url' && !linkValue.trim())

  async function clientAction(
    prevState: { error: string; success?: string },
    formData: FormData
  ): Promise<{ error: string; success?: string }> {
    setClientError('')

    if (croppedBlobRef.current && !uploadedUrlRef.current) {
      setIsUploading(true)
      try {
        const uploadFd = new FormData()
        uploadFd.append('file', croppedBlobRef.current, 'banner.jpg')
        const uploaded = await uploadBannerImageAction(uploadFd)
        if (uploaded.error || !uploaded.url) {
          return { error: uploaded.error ?? '이미지 업로드에 실패했습니다.' }
        }
        uploadedUrlRef.current = uploaded.url
      } finally {
        setIsUploading(false)
      }
    } else if (mode === 'create' && !uploadedUrlRef.current) {
      return { error: '이미지를 선택해 주세요.' }
    }

    formData.set('image_url', uploadedUrlRef.current ?? '')
    formData.set('starts_at', startsAt ? new Date(startsAt).toISOString() : '')
    formData.set('ends_at', endsAt ? new Date(endsAt).toISOString() : '')

    const result = await serverAction(prevState, formData)
    return result ?? { error: '' }
  }

  const [state, formAction, isPending] = useActionState<
    { error: string; success?: string },
    FormData
  >(clientAction, initialState)

  function handleLinkTypeChange(next: BannerLinkType) {
    setLinkType(next)
    setLinkValue('')
  }

  function handleDelete() {
    if (!bannerId) return
    if (
      !window.confirm(
        '이 배너를 삭제할까요? 앱에서 즉시 사라집니다.'
      )
    ) {
      return
    }
    startDeleteTransition(async () => {
      await deleteBannerAction(bannerId)
    })
  }

  return (
    <div>
      <form action={formAction}>
        {(state?.error || clientError) && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {clientError || state.error}
          </div>
        )}

        <input
          type="hidden"
          name="previous_image_url"
          value={initial?.image_url ?? ''}
        />
        <input type="hidden" name="image_url" value="" />
        <input type="hidden" name="link_value" value={linkValue} />

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>제목 (내부 관리용)</label>
            <input
              name="title"
              required
              defaultValue={initial?.title ?? ''}
              placeholder="예: 3월 신작 가챠 프로모 — 앱에 노출되지 않는 메모"
              style={inputStyle}
            />
          </div>

          <BannerImageField
            existingUrl={initial?.image_url}
            onCroppedChange={(blob) => {
              croppedBlobRef.current = blob
              uploadedUrlRef.current = null
            }}
          />

          <div>
            <label style={labelStyle}>링크 유형</label>
            <select
              name="link_type"
              value={linkType}
              onChange={(e) =>
                handleLinkTypeChange(e.target.value as BannerLinkType)
              }
              style={inputStyle}
            >
              {(Object.keys(LINK_TYPE_LABELS) as BannerLinkType[]).map((key) => (
                <option key={key} value={key}>
                  {LINK_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {linkType === 'external_url' && (
            <div>
              <label style={labelStyle}>외부 URL</label>
              <input
                type="url"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="https://example.com"
                style={inputStyle}
              />
              {externalUrlInvalid && (
                <p
                  style={{
                    color: '#DC2626',
                    fontSize: 12,
                    fontWeight: 700,
                    marginTop: 6,
                  }}
                >
                  https:// 로 시작하는 URL만 저장할 수 있습니다.
                </p>
              )}
            </div>
          )}

          {linkType === 'gacha_detail' && (
            <div>
              <label style={labelStyle}>가챠 시리즈</label>
              <div
                style={{
                  display: 'grid',
                  gap: 8,
                  maxHeight: 320,
                  overflowY: 'auto',
                  border: '1px solid #E0DDD8',
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                {sortedGacha.map((series) => {
                  const badge = statusBadgeStyle(series.status)
                  const selected = linkValue === series.id
                  return (
                    <button
                      key={series.id}
                      type="button"
                      onClick={() => setLinkValue(series.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 10,
                        borderRadius: 8,
                        border: selected
                          ? '2px solid #8CC63F'
                          : '1px solid #E0DDD8',
                        backgroundColor: selected ? '#F7FBEA' : '#FFFFFF',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          overflow: 'hidden',
                          backgroundColor: '#F5F5F5',
                          flexShrink: 0,
                        }}
                      >
                        {series.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={series.thumbnail_url}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: '#1A1A1A',
                            fontSize: 14,
                            fontWeight: 800,
                          }}
                        >
                          {series.name}
                        </div>
                      </div>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: '4px 8px',
                          fontSize: 11,
                          fontWeight: 800,
                          backgroundColor: badge.backgroundColor,
                          color: badge.color,
                          flexShrink: 0,
                        }}
                      >
                        {badge.label}
                      </span>
                    </button>
                  )
                })}
                {sortedGacha.length === 0 && (
                  <p style={{ color: '#6B7280', fontSize: 13, margin: 8 }}>
                    등록된 가챠 시리즈가 없습니다.
                  </p>
                )}
              </div>
            </div>
          )}

          {linkType === 'kuji_detail' && (
            <div>
              <label style={labelStyle}>쿠지 시리즈</label>
              <div
                style={{
                  display: 'grid',
                  gap: 8,
                  maxHeight: 320,
                  overflowY: 'auto',
                  border: '1px solid #E0DDD8',
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                {sortedKuji.map((series) => {
                  const badge = statusBadgeStyle(series.status)
                  const selected = linkValue === series.id
                  return (
                    <button
                      key={series.id}
                      type="button"
                      onClick={() => setLinkValue(series.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 10,
                        borderRadius: 8,
                        border: selected
                          ? '2px solid #8CC63F'
                          : '1px solid #E0DDD8',
                        backgroundColor: selected ? '#F7FBEA' : '#FFFFFF',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          overflow: 'hidden',
                          backgroundColor: '#F5F5F5',
                          flexShrink: 0,
                        }}
                      >
                        {series.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={series.thumbnail_url}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: '#1A1A1A',
                            fontSize: 14,
                            fontWeight: 800,
                          }}
                        >
                          {series.name}
                        </div>
                        <div
                          style={{
                            color: '#6B7280',
                            fontSize: 12,
                            marginTop: 2,
                          }}
                        >
                          잔여 티켓 {series.remaining_tickets ?? 0}
                        </div>
                      </div>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: '4px 8px',
                          fontSize: 11,
                          fontWeight: 800,
                          backgroundColor: badge.backgroundColor,
                          color: badge.color,
                          flexShrink: 0,
                        }}
                      >
                        {badge.label}
                      </span>
                    </button>
                  )
                })}
                {sortedKuji.length === 0 && (
                  <p style={{ color: '#6B7280', fontSize: 13, margin: 8 }}>
                    등록된 쿠지 시리즈가 없습니다.
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
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
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={initial?.is_active ?? false}
              />
              활성 (기본 off — 등록 후 목록에서 확인한 뒤 켜는 것을 권장)
            </label>
          </div>

          <div>
            <label style={labelStyle}>표시 순서</label>
            <input
              name="display_order"
              type="number"
              required
              defaultValue={initial?.display_order ?? defaultDisplayOrder}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>게시 시작 (비우면 상시)</label>
            <input
              name="starts_at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>게시 종료 (비우면 상시)</label>
            <input
              name="ends_at"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              style={inputStyle}
            />
            {periodInvalid && (
              <p
                style={{
                  color: '#DC2626',
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 6,
                }}
              >
                종료 일시는 시작 일시보다 이후여야 합니다.
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 20,
          }}
        >
          <button
            type="submit"
            disabled={
              isPending || isDeleting || isUploading || saveDisabled
            }
            style={{
              backgroundColor: '#8CC63F',
              color: '#1A1A1A',
              border: 'none',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 900,
              cursor:
                isPending || isDeleting || isUploading || saveDisabled
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                isPending || isDeleting || isUploading || saveDisabled
                  ? 0.6
                  : 1,
            }}
          >
            {isUploading
              ? '이미지 업로드 중...'
              : isPending
                ? '저장 중...'
                : '저장'}
          </button>

          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending || isDeleting || isUploading}
              style={{
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                border: '1px solid #FCA5A5',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 900,
                cursor:
                  isPending || isDeleting || isUploading
                    ? 'not-allowed'
                    : 'pointer',
                opacity: isPending || isDeleting || isUploading ? 0.6 : 1,
              }}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
