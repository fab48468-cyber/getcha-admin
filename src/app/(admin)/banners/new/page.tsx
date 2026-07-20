import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import BannerForm from '../BannerForm'
import type {
  GachaSeriesPickerRow,
  KujiSeriesPickerRow,
} from '../banner-utils'

export default async function NewBannerPage() {
  const adminClient = createAdminClient()

  const [maxOrderResult, gachaResult, kujiResult] = await Promise.all([
    adminClient
      .from('home_banners')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminClient
      .from('gacha_series')
      .select('id, name, thumbnail_url, status')
      .order('created_at', { ascending: false }),
    adminClient
      .from('kuji_series')
      .select('id, name, thumbnail_url, status, remaining_tickets')
      .order('created_at', { ascending: false }),
  ])

  const maxOrder = maxOrderResult.data?.display_order ?? 0
  const defaultDisplayOrder = Number(maxOrder) + 10

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
          새 배너 등록
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
          mode="create"
          defaultDisplayOrder={defaultDisplayOrder}
          gachaSeries={(gachaResult.data ?? []) as GachaSeriesPickerRow[]}
          kujiSeries={(kujiResult.data ?? []) as KujiSeriesPickerRow[]}
        />
      </div>
    </div>
  )
}
