export const BANNER_LINK_TYPES = [
  'none',
  'gacha_detail',
  'kuji_detail',
  'external_url',
] as const

export type BannerLinkType = (typeof BANNER_LINK_TYPES)[number]

export type HomeBannerRow = {
  id: string
  title: string
  image_url: string
  link_type: BannerLinkType
  link_value: string | null
  display_order: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}

export type GachaSeriesPickerRow = {
  id: string
  name: string
  thumbnail_url: string | null
  status: string
}

export type KujiSeriesPickerRow = {
  id: string
  name: string
  thumbnail_url: string | null
  status: string
  remaining_tickets: number | null
}

export const BANNER_BUCKET = 'banner-images'

export const LINK_TYPE_LABELS: Record<BannerLinkType, string> = {
  none: '이동 없음',
  gacha_detail: '가챠 상세',
  kuji_detail: '쿠지 상세',
  external_url: '외부 URL',
}

export function isBannerLinkType(value: string): value is BannerLinkType {
  return (BANNER_LINK_TYPES as readonly string[]).includes(value)
}

/** public URL에서 banner-images 버킷 경로 추출. 해당 버킷이 아니면 null */
export function extractBannerStoragePath(imageUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BANNER_BUCKET}/`
  const idx = imageUrl.indexOf(marker)
  if (idx === -1) return null
  const path = imageUrl.slice(idx + marker.length)
  if (!path) return null
  try {
    return decodeURIComponent(path.split('?')[0] ?? path)
  } catch {
    return path.split('?')[0] ?? path
  }
}

export function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatBannerPeriod(
  startsAt: string | null,
  endsAt: string | null
) {
  if (!startsAt && !endsAt) return '상시'
  const format = (value: string) =>
    new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  if (startsAt && endsAt) return `${format(startsAt)} ~ ${format(endsAt)}`
  if (startsAt) return `${format(startsAt)} ~`
  return `~ ${format(endsAt!)}`
}
