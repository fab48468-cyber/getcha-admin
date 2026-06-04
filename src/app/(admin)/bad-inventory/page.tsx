import { createAdminClient } from '@/lib/supabase/admin'
import BadInventoryTabs, { type BadInventoryListRow } from './BadInventoryTabs'

type BadInventoryRow = {
  id: string
  product_id: string
  product_type: 'gacha' | 'kuji'
  pool_type: 'random_exchange' | 'mystery_gacha'
  source: 'user_return' | 'admin_stock'
  status: 'available' | 'consumed'
  is_featured: boolean
  admin_note: string | null
  consumed_at: string | null
  consumed_by_user_id: string | null
  consumed_purpose: string | null
  created_at: string | null
  updated_at: string | null
}

type ProductRow = {
  id: string
  name: string
  image_url: string | null
  grade: string | null
  series_id: string
}

type SeriesRow = {
  id: string
  name: string
}

export default async function BadInventoryPage() {
  const adminClient = createAdminClient()
  const { data: inventoryData } = await adminClient
    .from('bad_inventory')
    .select(
      'id, product_id, product_type, pool_type, source, status, is_featured, admin_note, consumed_at, consumed_by_user_id, consumed_purpose, created_at, updated_at'
    )
    .order('created_at', { ascending: false })

  const rows = (inventoryData ?? []) as BadInventoryRow[]

  const gachaProductIds = [
    ...new Set(
      rows
        .filter((row) => row.product_type === 'gacha')
        .map((row) => row.product_id)
    ),
  ]
  const kujiProductIds = [
    ...new Set(
      rows
        .filter((row) => row.product_type === 'kuji')
        .map((row) => row.product_id)
    ),
  ]

  const [{ data: gachaProducts }, { data: kujiProducts }] = await Promise.all([
    gachaProductIds.length
      ? adminClient
          .from('gacha_products')
          .select('id, name, image_url, grade, series_id')
          .in('id', gachaProductIds)
      : { data: [] },
    kujiProductIds.length
      ? adminClient
          .from('kuji_products')
          .select('id, name, image_url, grade, series_id')
          .in('id', kujiProductIds)
      : { data: [] },
  ])

  const gachaProductsList = (gachaProducts ?? []) as ProductRow[]
  const kujiProductsList = (kujiProducts ?? []) as ProductRow[]

  const gachaSeriesIds = [
    ...new Set(gachaProductsList.map((product) => product.series_id)),
  ]
  const kujiSeriesIds = [
    ...new Set(kujiProductsList.map((product) => product.series_id)),
  ]

  const [{ data: gachaSeries }, { data: kujiSeries }] = await Promise.all([
    gachaSeriesIds.length
      ? adminClient.from('gacha_series').select('id, name').in('id', gachaSeriesIds)
      : { data: [] },
    kujiSeriesIds.length
      ? adminClient.from('kuji_series').select('id, name').in('id', kujiSeriesIds)
      : { data: [] },
  ])

  const gachaProductMap = Object.fromEntries(
    gachaProductsList.map((product) => [product.id, product])
  )
  const kujiProductMap = Object.fromEntries(
    kujiProductsList.map((product) => [product.id, product])
  )
  const gachaSeriesMap = Object.fromEntries(
    ((gachaSeries ?? []) as SeriesRow[]).map((series) => [series.id, series.name])
  )
  const kujiSeriesMap = Object.fromEntries(
    ((kujiSeries ?? []) as SeriesRow[]).map((series) => [series.id, series.name])
  )

  const items: BadInventoryListRow[] = rows.map((row) => {
    const product =
      row.product_type === 'gacha'
        ? gachaProductMap[row.product_id]
        : kujiProductMap[row.product_id]
    const seriesName = product
      ? row.product_type === 'gacha'
        ? gachaSeriesMap[product.series_id]
        : kujiSeriesMap[product.series_id]
      : undefined

    return {
      ...row,
      product_name: product?.name ?? '(삭제된 상품)',
      product_image_url: product?.image_url ?? null,
      product_grade: product?.grade ?? null,
      series_name: seriesName ?? '-',
    }
  })

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            color: '#1A1A1A',
            fontSize: 24,
            fontWeight: 900,
            margin: 0,
          }}
        >
          악성재고 관리
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
          랜덤교환·미스터리가챠 풀의 악성재고를 조회하고 운영자 재고를 등록합니다.
        </p>
      </div>

      <BadInventoryTabs items={items} />
    </div>
  )
}
