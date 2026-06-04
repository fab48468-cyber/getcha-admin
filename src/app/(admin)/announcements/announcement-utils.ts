export type AnnouncementCategory =
  | 'general'
  | 'event'
  | 'maintenance'
  | 'update'

export type AnnouncementRow = {
  id: string
  title: string
  content: string
  category: AnnouncementCategory
  is_pinned: boolean | null
  published_at: string | null
  expires_at: string | null
  created_at: string | null
  updated_at: string | null
  created_by: string | null
}

export const CATEGORY_STYLES: Record<
  AnnouncementCategory,
  { label: string; backgroundColor: string; color: string }
> = {
  general: { label: '일반', backgroundColor: '#DBEAFE', color: '#3B82F6' },
  event: { label: '이벤트', backgroundColor: '#FFEDD5', color: '#F59E0B' },
  maintenance: { label: '점검', backgroundColor: '#FEE2E2', color: '#EF4444' },
  update: { label: '업데이트', backgroundColor: '#EEFBD0', color: '#8CC63F' },
}

export function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR')
}

export function getExposureStatus(
  publishedAt: string | null,
  expiresAt: string | null
) {
  const now = Date.now()
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null
  const publishedMs = publishedAt ? new Date(publishedAt).getTime() : null

  if (expiresMs !== null && expiresMs <= now) {
    return {
      label: '만료',
      backgroundColor: '#FEE2E2',
      color: '#DC2626',
    }
  }

  if (publishedMs === null || publishedMs > now) {
    return {
      label: '미노출',
      backgroundColor: '#F5F5F5',
      color: '#6B6B6B',
    }
  }

  return {
    label: '노출 중',
    backgroundColor: '#EEFBD0',
    color: '#5B8B1E',
  }
}

export function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
