import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import BannerForm from '../BannerForm'
import type {
  BannerLinkType,
  GachaSeriesPickerRow,
  HomeBannerRow,
  KujiSeriesPickerRow,
} from '../banner-utils'

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  const [bannerResult, gachaResult, kujiResult] = await Promise.all([
    adminClient
      .from('home_banners')
      .select(
        'id, title, image_url, link_type, link_value, display_order, is_active, starts_at, ends_at, created_at, updated_at'
      )
      .eq('id', id)
      .single(),
    adminClient
      .from('gacha_series')
      .select('id, name, thumbnail_url, status')
      .order('created_at', { ascending: false }),
    adminClient
      .from('kuji_series')
      .select('id, name, thumbnail_url, status, remaining_tickets')
      .order('created_at', { ascending: false }),
  ])

  if (bannerResult.error || !bannerResult.data) {
    notFound()
  }

  const banner = bannerResult.data as HomeBannerRow

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
          배너 수정
        </h2>
        <Link
          href="/banners"
          style={{
            color: '#8B5CF6',
            fontSize: 14,
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          목록으로
        </Link>
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          padding: 20,
          maxWidth: 720,
        }}
      >
        <BannerForm
          mode="edit"
          bannerId={banner.id}
          defaultDisplayOrder={banner.display_order}
          gachaSeries={(gachaResult.data ?? []) as GachaSeriesPickerRow[]}
          kujiSeries={(kujiResult.data ?? []) as KujiSeriesPickerRow[]}
          initial={{
            title: banner.title,
            image_url: banner.image_url,
            link_type: banner.link_type as BannerLinkType,
            link_value: banner.link_value,
            display_order: banner.display_order,
            is_active: banner.is_active,
            starts_at: banner.starts_at,
            ends_at: banner.ends_at,
          }}
        />
      </div>
    </div>
  )
}
