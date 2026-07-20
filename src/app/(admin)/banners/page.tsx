import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import BannerListClient from './BannerListClient'
import type { HomeBannerRow } from './banner-utils'

export default async function BannersPage() {
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('home_banners')
    .select(
      'id, title, image_url, link_type, link_value, display_order, is_active, starts_at, ends_at, created_at, updated_at'
    )
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  const banners = (data ?? []) as HomeBannerRow[]

  const gachaIds = banners
    .filter((b) => b.link_type === 'gacha_detail' && b.link_value)
    .map((b) => b.link_value!)
  const kujiIds = banners
    .filter((b) => b.link_type === 'kuji_detail' && b.link_value)
    .map((b) => b.link_value!)

  const seriesNameById: Record<string, string> = {}

  if (gachaIds.length > 0) {
    const { data: gachaRows } = await adminClient
      .from('gacha_series')
      .select('id, name')
      .in('id', gachaIds)
    for (const row of gachaRows ?? []) {
      seriesNameById[row.id as string] = row.name as string
    }
  }

  if (kujiIds.length > 0) {
    const { data: kujiRows } = await adminClient
      .from('kuji_series')
      .select('id, name')
      .in('id', kujiIds)
    for (const row of kujiRows ?? []) {
      seriesNameById[row.id as string] = row.name as string
    }
  }

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
          홈 배너
        </h2>
        <Link
          href="/banners/new"
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
          새 배너 등록
        </Link>
      </div>

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
          목록을 불러오지 못했습니다: {error.message}
        </div>
      )}

      <BannerListClient banners={banners} seriesNameById={seriesNameById} />
    </div>
  )
}
