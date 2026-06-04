import { createAdminClient } from '@/lib/supabase/admin'
import WorkshopTabs, {
  type ConfirmExchangeListRow,
  type GachaProductOption,
  type GachaSeriesOption,
  type RandomExchangeListRow,
  type RandomExchangePoolSummary,
  type SynthesisLogRow,
} from './WorkshopTabs'

type InventoryRow = {
  id: string
  series_id: string
  product_id: string
  token_price: number | null
  status: 'available' | 'reserved' | 'used'
  admin_note: string | null
  created_at: string | null
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

type BadInventoryRow = {
  id: string
  product_id: string
  product_type: 'gacha' | 'kuji'
  source: 'user_return' | 'admin_stock'
  status: 'available' | 'consumed'
  created_at: string | null
}

type SynthesisLogDbRow = {
  id: string
  user_id: string
  submitted_count: number | null
  total_coin_value: number | null
  token_rewarded: number | null
  reroll_ticket_rewarded: number | null
  created_at: string | null
  users: { nickname: string | null } | { nickname: string | null }[] | null
}

function getNickname(users: SynthesisLogDbRow['users']) {
  const user = Array.isArray(users) ? users[0] : users
  return user?.nickname ?? '-'
}

async function enrichBadInventoryRows(
  adminClient: ReturnType<typeof createAdminClient>,
  rows: BadInventoryRow[]
): Promise<RandomExchangeListRow[]> {
  const gachaProductIds = [
    ...new Set(
      rows.filter((row) => row.product_type === 'gacha').map((row) => row.product_id)
    ),
  ]
  const kujiProductIds = [
    ...new Set(
      rows.filter((row) => row.product_type === 'kuji').map((row) => row.product_id)
    ),
  ]

  const [{ data: gachaProducts }, { data: kujiProducts }] = await Promise.all([
    gachaProductIds.length
      ? adminClient
          .from('gacha_products')
          .select('id, name')
          .in('id', gachaProductIds)
      : { data: [] },
    kujiProductIds.length
      ? adminClient
          .from('kuji_products')
          .select('id, name')
          .in('id', kujiProductIds)
      : { data: [] },
  ])

  const gachaMap = Object.fromEntries(
    ((gachaProducts ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
  )
  const kujiMap = Object.fromEntries(
    ((kujiProducts ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
  )

  return rows.map((row) => ({
    id: row.id,
    product_name:
      row.product_type === 'gacha'
        ? (gachaMap[row.product_id] ?? '(삭제된 상품)')
        : (kujiMap[row.product_id] ?? '(삭제된 상품)'),
    product_type: row.product_type,
    source: row.source,
    status: row.status,
    created_at: row.created_at,
  }))
}

export default async function WorkshopPage() {
  const adminClient = createAdminClient()

  const [
    { data: inventoryData },
    { data: allSeriesData },
    { data: allProductsData },
    { data: poolSummaryData },
    { data: randomExchangeData },
    { data: synthesisData },
  ] = await Promise.all([
    adminClient
      .from('confirm_exchange_inventory')
      .select(
        'id, series_id, product_id, token_price, status, admin_note, created_at'
      )
      .order('created_at', { ascending: false }),
    adminClient.from('gacha_series').select('id, name').order('name', { ascending: true }),
    adminClient
      .from('gacha_products')
      .select('id, name, image_url, grade, series_id')
      .order('name', { ascending: true }),
    adminClient.from('random_exchange_pool_summary').select('*').maybeSingle(),
    adminClient
      .from('bad_inventory')
      .select('id, product_id, product_type, source, status, created_at')
      .eq('pool_type', 'random_exchange')
      .order('created_at', { ascending: false })
      .limit(20),
    adminClient
      .from('synthesis_log')
      .select(
        'id, user_id, submitted_count, total_coin_value, token_rewarded, reroll_ticket_rewarded, created_at, users(nickname)'
      )
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const inventoryRows = (inventoryData ?? []) as InventoryRow[]
  const allSeries = (allSeriesData ?? []) as GachaSeriesOption[]
  const allProducts = (allProductsData ?? []) as GachaProductOption[]

  const productIds = [...new Set(inventoryRows.map((row) => row.product_id))]
  const seriesIds = [...new Set(inventoryRows.map((row) => row.series_id))]

  const [{ data: productsData }, { data: seriesData }] = await Promise.all([
    productIds.length
      ? adminClient
          .from('gacha_products')
          .select('id, name, image_url, grade, series_id')
          .in('id', productIds)
      : { data: [] },
    seriesIds.length
      ? adminClient.from('gacha_series').select('id, name').in('id', seriesIds)
      : { data: [] },
  ])

  const productMap = Object.fromEntries(
    ((productsData ?? []) as ProductRow[]).map((product) => [product.id, product])
  )
  const seriesMap = Object.fromEntries(
    ((seriesData ?? []) as SeriesRow[]).map((series) => [series.id, series.name])
  )

  const inventoryItems: ConfirmExchangeListRow[] = inventoryRows.map((row) => {
    const product = productMap[row.product_id]
    return {
      id: row.id,
      series_id: row.series_id,
      product_id: row.product_id,
      token_price: row.token_price,
      status: row.status,
      admin_note: row.admin_note,
      created_at: row.created_at,
      product_name: product?.name ?? '(삭제된 상품)',
      product_image_url: product?.image_url ?? null,
      product_grade: product?.grade ?? null,
      series_name: seriesMap[row.series_id] ?? '-',
    }
  })

  const statusCounts = inventoryRows.reduce(
    (acc, row) => {
      acc[row.status] += 1
      return acc
    },
    { available: 0, reserved: 0, used: 0 }
  )

  const poolSummary = (poolSummaryData ?? null) as RandomExchangePoolSummary | null
  const randomExchangeItems = await enrichBadInventoryRows(
    adminClient,
    (randomExchangeData ?? []) as BadInventoryRow[]
  )

  const synthesisLogs: SynthesisLogRow[] = ((synthesisData ?? []) as SynthesisLogDbRow[]).map(
    (row) => ({
      id: row.id,
      user_id: row.user_id,
      nickname: getNickname(row.users),
      submitted_count: row.submitted_count,
      total_coin_value: row.total_coin_value,
      token_rewarded: row.token_rewarded,
      reroll_ticket_rewarded: row.reroll_ticket_rewarded,
      created_at: row.created_at,
    })
  )

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
          공방 관리
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
          확정교환 재고, 랜덤교환 풀, 합성 유입 현황을 한곳에서 관리합니다.
        </p>
      </div>

      <WorkshopTabs
        inventoryItems={inventoryItems}
        statusCounts={statusCounts}
        allSeries={allSeries}
        allProducts={allProducts}
        poolSummary={poolSummary}
        randomExchangeItems={randomExchangeItems}
        synthesisLogs={synthesisLogs}
      />
    </div>
  )
}
