import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import KujiDetailTabs from './KujiDetailTabs'

type KujiSeries = {
  id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  coin_price_per_ticket: number | null
  status: 'active' | 'completed' | 'closed'
  total_tickets: number | null
  remaining_tickets: number | null
  last_one_product_id: string | null
}

type KujiProduct = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  grade: string | null
  is_last_one: boolean | null
  display_order: number | null
}

type TicketRow = {
  status: 'available' | 'selecting' | 'sold'
}

export default async function KujiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  const [{ data: seriesData }, { data: productsData }, { data: ticketsData }] =
    await Promise.all([
      adminClient
        .from('kuji_series')
        .select(
          'id, name, description, thumbnail_url, coin_price_per_ticket, status, total_tickets, remaining_tickets, last_one_product_id'
        )
        .eq('id', id)
        .single(),
      adminClient
        .from('kuji_products')
        .select('id, name, description, image_url, grade, is_last_one, display_order')
        .eq('series_id', id)
        .order('display_order', { ascending: true }),
      adminClient.from('kuji_tickets').select('status').eq('series_id', id),
    ])

  if (!seriesData) {
    notFound()
  }

  const series = seriesData as KujiSeries
  const products = (productsData ?? []) as KujiProduct[]
  const ticketCounts = ((ticketsData ?? []) as TicketRow[]).reduce(
    (acc, row) => {
      acc[row.status] += 1
      acc.total += 1
      return acc
    },
    { available: 0, selecting: 0, sold: 0, total: 0 }
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
            쿠지 상세/수정
          </p>
        </div>

        <Link
          href="/kuji"
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

      <KujiDetailTabs
        series={series}
        products={products}
        ticketCounts={ticketCounts}
      />
    </div>
  )
}
