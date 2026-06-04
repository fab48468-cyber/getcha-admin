import { createAdminClient } from '@/lib/supabase/admin'
import DexTabs, {
  type CompletedUserRow,
  type SeriesStat,
} from './DexTabs'

type SeriesRow = {
  id: string
  name: string
}

type DexRow = {
  id: string
  user_id: string
  series_id: string
  is_completed: boolean
  opened_at: string | null
  completed_at: string | null
}

type CollectionRow = {
  id: string
  dex_id: string
  user_id: string
  product_id: string
  collected_at: string | null
}

type ProductRow = {
  id: string
  name: string
  series_id: string
}

type CompletedDexDbRow = {
  id: string
  user_id: string
  series_id: string
  completed_at: string | null
  users: { nickname: string | null } | { nickname: string | null }[] | null
}

function getNickname(users: CompletedDexDbRow['users']) {
  const user = Array.isArray(users) ? users[0] : users
  return user?.nickname ?? '-'
}

function calcRate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

export default async function DexPage() {
  const adminClient = createAdminClient()

  const [
    { data: seriesData },
    { data: dexData },
    { data: collectionsData },
    { data: productsData },
    { data: completedDexData },
  ] = await Promise.all([
    adminClient.from('gacha_series').select('id, name').order('name', { ascending: true }),
    adminClient
      .from('gacha_dex')
      .select('id, user_id, series_id, is_completed, opened_at, completed_at'),
    adminClient
      .from('gacha_dex_collections')
      .select('id, dex_id, user_id, product_id, collected_at'),
    adminClient
      .from('gacha_products')
      .select('id, name, series_id')
      .order('name', { ascending: true }),
    adminClient
      .from('gacha_dex')
      .select('id, user_id, series_id, completed_at, users(nickname)')
      .eq('is_completed', true)
      .order('completed_at', { ascending: false }),
  ])

  const seriesList = (seriesData ?? []) as SeriesRow[]
  const dexRows = (dexData ?? []) as DexRow[]
  const collectionRows = (collectionsData ?? []) as CollectionRow[]
  const products = (productsData ?? []) as ProductRow[]

  const seriesNameMap = Object.fromEntries(seriesList.map((s) => [s.id, s.name]))

  const dexBySeries = dexRows.reduce(
    (acc, row) => {
      if (!acc[row.series_id]) acc[row.series_id] = []
      acc[row.series_id].push(row)
      return acc
    },
    {} as Record<string, DexRow[]>
  )

  const collectionCountByProduct = collectionRows.reduce(
    (acc, row) => {
      acc[row.product_id] = (acc[row.product_id] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const productsBySeries = products.reduce(
    (acc, product) => {
      if (!acc[product.series_id]) acc[product.series_id] = []
      acc[product.series_id].push(product)
      return acc
    },
    {} as Record<string, ProductRow[]>
  )

  const seriesStats: SeriesStat[] = seriesList.map((series) => {
    const dexList = dexBySeries[series.id] ?? []
    const totalDex = dexList.length
    const completedCount = dexList.filter((d) => d.is_completed).length
    const seriesProducts = productsBySeries[series.id] ?? []

    const productRates = seriesProducts
      .map((product) => {
        const collectedCount = collectionCountByProduct[product.id] ?? 0
        return {
          productId: product.id,
          productName: product.name,
          collectedCount,
          collectionRate: calcRate(collectedCount, totalDex),
        }
      })
      .sort((a, b) => b.collectionRate - a.collectionRate)

    return {
      id: series.id,
      name: series.name,
      totalDex,
      completedCount,
      completionRate: calcRate(completedCount, totalDex),
      productCount: seriesProducts.length,
      productRates,
    }
  })

  const completedUsers: CompletedUserRow[] = (
    (completedDexData ?? []) as CompletedDexDbRow[]
  ).map((row) => ({
    id: row.id,
    userId: row.user_id,
    nickname: getNickname(row.users),
    seriesId: row.series_id,
    seriesName: seriesNameMap[row.series_id] ?? '-',
    completedAt: row.completed_at,
  }))

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
          도감북 관리
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
          시리즈별 도감 현황, 완성 유저, 상품별 수집률을 조회합니다.
        </p>
      </div>

      <DexTabs seriesStats={seriesStats} completedUsers={completedUsers} />
    </div>
  )
}
