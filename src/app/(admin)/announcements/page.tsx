import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CATEGORY_STYLES,
  formatDate,
  getExposureStatus,
  type AnnouncementCategory,
  type AnnouncementRow,
} from './announcement-utils'

function CategoryBadge({ category }: { category: AnnouncementCategory }) {
  const style =
    CATEGORY_STYLES[category] ?? CATEGORY_STYLES.general

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

function ExposureBadge({
  publishedAt,
  expiresAt,
}: {
  publishedAt: string | null
  expiresAt: string | null
}) {
  const status = getExposureStatus(publishedAt, expiresAt)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: status.backgroundColor,
        color: status.color,
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {status.label}
    </span>
  )
}

export default async function AnnouncementsPage() {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('announcements')
    .select(
      'id, title, content, category, is_pinned, published_at, expires_at, created_at, updated_at, created_by'
    )
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  const announcements = (data ?? []) as AnnouncementRow[]

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
          공지사항
        </h2>
        <Link
          href="/announcements/new"
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
          새 공지 등록
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
              {['제목', '카테고리', '고정', '노출상태', '등록일', '관리'].map(
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
            {announcements.map((item) => (
              <tr key={item.id}>
                <td
                  style={{
                    color: '#1A1A1A',
                    fontSize: 14,
                    fontWeight: 800,
                    padding: 16,
                    borderBottom: '1px solid #F0EEEA',
                  }}
                >
                  {item.title}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <CategoryBadge
                    category={
                      (item.category as AnnouncementCategory) || 'general'
                    }
                  />
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
                  {item.is_pinned ? '📌 고정' : '-'}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                  <ExposureBadge
                    publishedAt={item.published_at}
                    expiresAt={item.expires_at}
                  />
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
                    href={`/announcements/${item.id}`}
                    style={{
                      color: '#8B5CF6',
                      fontSize: 14,
                      fontWeight: 800,
                      textDecoration: 'none',
                    }}
                  >
                    수정
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {announcements.length === 0 && (
          <div
            style={{
              color: '#6B7280',
              fontSize: 14,
              padding: 32,
              textAlign: 'center',
            }}
          >
            등록된 공지가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
