'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  deleteBannerAction,
  toggleBannerActiveAction,
} from './actions'
import {
  LINK_TYPE_LABELS,
  formatBannerPeriod,
  type BannerLinkType,
  type HomeBannerRow,
} from './banner-utils'

type BannerListClientProps = {
  banners: HomeBannerRow[]
  seriesNameById: Record<string, string>
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: active ? '#EEFBD0' : '#F5F5F5',
        color: active ? '#5B8B1E' : '#6B6B6B',
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {active ? '활성' : '비활성'}
    </span>
  )
}

function linkSummary(
  banner: HomeBannerRow,
  seriesNameById: Record<string, string>
) {
  const typeLabel =
    LINK_TYPE_LABELS[banner.link_type as BannerLinkType] ?? banner.link_type

  if (banner.link_type === 'none') {
    return typeLabel
  }

  if (banner.link_type === 'external_url') {
    return `${typeLabel}: ${banner.link_value ?? '-'}`
  }

  const name =
    (banner.link_value && seriesNameById[banner.link_value]) ||
    banner.link_value ||
    '-'
  return `${typeLabel}: ${name}`
}

export default function BannerListClient({
  banners,
  seriesNameById,
}: BannerListClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  function handleToggle(banner: HomeBannerRow) {
    setError('')
    setPendingId(banner.id)
    startTransition(async () => {
      const result = await toggleBannerActiveAction(banner.id, !banner.is_active)
      if (result.error) {
        setError(result.error)
        setPendingId(null)
        return
      }
      setPendingId(null)
      router.refresh()
    })
  }

  function handleDelete(banner: HomeBannerRow) {
    if (
      !window.confirm(
        `"${banner.title}" 배너를 삭제할까요?\n앱에서 즉시 사라집니다.`
      )
    ) {
      return
    }

    setError('')
    setPendingId(banner.id)
    startTransition(async () => {
      await deleteBannerAction(banner.id)
    })
  }

  return (
    <div>
      {error && (
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
          {error}
        </div>
      )}

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
                '미리보기',
                '제목',
                '링크',
                '활성',
                '게시 기간',
                '순서',
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
            {banners.map((banner) => {
              const busy = isPending && pendingId === banner.id
              return (
                <tr key={banner.id} style={{ opacity: busy ? 0.6 : 1 }}>
                  <td
                    style={{
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                      width: 96,
                    }}
                  >
                    <div
                      style={{
                        width: 76,
                        aspectRatio: '1.27 / 1',
                        borderRadius: 8,
                        overflow: 'hidden',
                        backgroundColor: '#F5F5F5',
                        border: '1px solid #E0DDD8',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
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
                    {banner.title}
                  </td>
                  <td
                    style={{
                      color: '#374151',
                      fontSize: 13,
                      fontWeight: 600,
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                      maxWidth: 260,
                      wordBreak: 'break-all',
                    }}
                  >
                    {linkSummary(banner, seriesNameById)}
                  </td>
                  <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                    <ActiveBadge active={banner.is_active} />
                  </td>
                  <td
                    style={{
                      color: '#6B7280',
                      fontSize: 13,
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatBannerPeriod(banner.starts_at, banner.ends_at)}
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
                    {banner.display_order}
                  </td>
                  <td
                    style={{
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Link
                        href={`/banners/${banner.id}`}
                        style={{
                          color: '#8B5CF6',
                          fontSize: 14,
                          fontWeight: 800,
                          textDecoration: 'none',
                        }}
                      >
                        수정
                      </Link>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleToggle(banner)}
                        style={{
                          backgroundColor: banner.is_active ? '#F5F5F5' : '#EEFBD0',
                          color: banner.is_active ? '#6B6B6B' : '#5B8B1E',
                          border: '1px solid #E0DDD8',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: busy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {banner.is_active ? '비활성' : '활성'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDelete(banner)}
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          border: '1px solid #FCA5A5',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: busy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {banners.length === 0 && (
          <div
            style={{
              color: '#6B7280',
              fontSize: 14,
              padding: 32,
              textAlign: 'center',
            }}
          >
            등록된 홈 배너가 없습니다. 새 배너를 등록해 주세요.
          </div>
        )}
      </div>
    </div>
  )
}
