import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import GachaDetailTabs from './GachaDetailTabs'

type GachaSeries = {
  id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  coin_price_per_pull: number | null
  status: 'active' | 'sold_out' | 'closed'
  max_concurrent_users: number | null
}

type GachaProduct = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  grade: string | null
  display_order: number | null
}

type InventoryRow = {
  product_id: string
  status: 'available' | 'allocated' | 'sold'
}

export default async function GachaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  const [{ data: seriesData }, { data: productsData }, { data: inventoryData }] =
    await Promise.all([
      adminClient
        .from('gacha_series')
        .select(
          'id, name, description, thumbnail_url, coin_price_per_pull, status, max_concurrent_users'
        )
        .eq('id', id)
        .single(),
      adminClient
        .from('gacha_products')
        .select('id, name, description, image_url, grade, display_order')
        .eq('series_id', id)
        .order('display_order', { ascending: true }),
      adminClient
        .from('gacha_inventory')
        .select('product_id, status')
        .eq('series_id', id),
    ])

  if (!seriesData) {
    notFound()
  }

  const series = seriesData as GachaSeries
  const products = (productsData ?? []) as GachaProduct[]
  const inventoryRows = (inventoryData ?? []) as InventoryRow[]
  const inventoryCounts = inventoryRows.reduce(
    (acc, row) => {
      if (!acc[row.product_id]) {
        acc[row.product_id] = {
          available: 0,
          allocated: 0,
          sold: 0,
          total: 0,
        }
      }

      acc[row.product_id].total += 1
      acc[row.product_id][row.status] += 1

      return acc
    },
    {} as Record<
      string,
      { available: number; allocated: number; sold: number; total: number }
    >
  )

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
        <div>
          <h2
            style={{
              color: '#1A1A1A',
              fontSize: 24,
              fontWeight: 900,
              margin: 0,
            }}
          >
            {series.name}
          </h2>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
            가챠 상세/수정
          </p>
        </div>

        <Link
          href="/gacha"
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

      <GachaDetailTabs
        series={series}
        products={products}
        inventoryCounts={inventoryCounts}
      />
    </div>
  )
}
