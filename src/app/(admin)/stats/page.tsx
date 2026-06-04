import { createAdminClient } from '@/lib/supabase/admin'
import DailyPaymentChart, { type DailyPaymentPoint } from './DailyPaymentChart'
import SeriesRevenueTabs, { type SeriesRevenueRow } from './SeriesRevenueTabs'

type ChargeRow = {
  krw_amount: number | string | null
  completed_at: string | null
}

type PullRow = {
  series_id: string
  coin_used: number | string | null
}

type SeriesRow = {
  id: string
  name: string
}

function getTodayStartIso() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

function getMonthStartIso() {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  return monthStart.toISOString()
}

function getThirtyDaysStartIso() {
  const start = new Date()
  start.setDate(start.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

function toLocalDateKey(iso: string) {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function buildLast30DateKeys() {
  const keys: string[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() - 29)

  for (let i = 0; i < 30; i += 1) {
    const yyyy = cursor.getFullYear()
    const mm = String(cursor.getMonth() + 1).padStart(2, '0')
    const dd = String(cursor.getDate()).padStart(2, '0')
    keys.push(`${yyyy}-${mm}-${dd}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  return keys
}

function sumKrwAmount(rows: ChargeRow[]) {
  return rows.reduce((sum, row) => sum + Number(row.krw_amount ?? 0), 0)
}

function buildDailyPaymentData(
  charges: ChargeRow[],
  dateKeys: string[]
): DailyPaymentPoint[] {
  const amountByDate = new Map<string, number>()

  for (const key of dateKeys) {
    amountByDate.set(key, 0)
  }

  for (const charge of charges) {
    if (!charge.completed_at) continue
    const key = toLocalDateKey(charge.completed_at)
    if (!amountByDate.has(key)) continue
    amountByDate.set(
      key,
      (amountByDate.get(key) ?? 0) + Number(charge.krw_amount ?? 0)
    )
  }

  return dateKeys.map((date) => ({
    date,
    amount: amountByDate.get(date) ?? 0,
  }))
}

function buildSeriesRevenueRows(
  pulls: PullRow[],
  seriesList: SeriesRow[]
): SeriesRevenueRow[] {
  const nameById = new Map(seriesList.map((s) => [s.id, s.name]))
  const stats = new Map<string, { pullCount: number; totalCoins: number }>()

  for (const pull of pulls) {
    const seriesId = pull.series_id
    const current = stats.get(seriesId) ?? { pullCount: 0, totalCoins: 0 }
    stats.set(seriesId, {
      pullCount: current.pullCount + 1,
      totalCoins: current.totalCoins + Number(pull.coin_used ?? 0),
    })
  }

  return [...stats.entries()]
    .map(([seriesId, { pullCount, totalCoins }]) => ({
      seriesId,
      seriesName: nameById.get(seriesId) ?? '(삭제된 시리즈)',
      pullCount,
      totalCoins,
    }))
    .sort((a, b) => b.totalCoins - a.totalCoins)
}

type StatCardProps = {
  icon: string
  label: string
  value: string
  color: string
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        border: '1px solid #E0DDD8',
      }}
    >
      <div style={{ color, fontSize: 32, lineHeight: 1 }}>{icon}</div>
      <div
        style={{
          color: '#6B7280',
          fontSize: 12,
          fontWeight: 700,
          marginTop: 14,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: '#1A1A1A',
          fontSize: 28,
          fontWeight: 900,
          marginTop: 6,
        }}
      >
        {value}
      </div>
    </div>
  )
}

export default async function StatsPage() {
  const adminClient = createAdminClient()
  const todayStartIso = getTodayStartIso()
  const monthStartIso = getMonthStartIso()
  const thirtyDaysStartIso = getThirtyDaysStartIso()
  const last30DateKeys = buildLast30DateKeys()

  const [
    todayChargesResult,
    monthChargesResult,
    allChargesResult,
    dailyChargesResult,
    gachaPullsResult,
    kujiPurchasesResult,
    gachaSeriesResult,
    kujiSeriesResult,
  ] = await Promise.all([
    adminClient
      .from('coin_charges')
      .select('krw_amount')
      .eq('status', 'completed')
      .gte('completed_at', todayStartIso),
    adminClient
      .from('coin_charges')
      .select('krw_amount')
      .eq('status', 'completed')
      .gte('completed_at', monthStartIso),
    adminClient
      .from('coin_charges')
      .select('krw_amount')
      .eq('status', 'completed'),
    adminClient
      .from('coin_charges')
      .select('krw_amount, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', thirtyDaysStartIso)
      .not('completed_at', 'is', null),
    adminClient.from('gacha_pulls').select('series_id, coin_used'),
    adminClient.from('kuji_purchases').select('series_id, coin_used'),
    adminClient.from('gacha_series').select('id, name'),
    adminClient.from('kuji_series').select('id, name'),
  ])

  const todayAmount = sumKrwAmount((todayChargesResult.data ?? []) as ChargeRow[])
  const monthAmount = sumKrwAmount((monthChargesResult.data ?? []) as ChargeRow[])
  const totalAmount = sumKrwAmount((allChargesResult.data ?? []) as ChargeRow[])

  const dailyPaymentData = buildDailyPaymentData(
    (dailyChargesResult.data ?? []) as ChargeRow[],
    last30DateKeys
  )

  const gachaRows = buildSeriesRevenueRows(
    (gachaPullsResult.data ?? []) as PullRow[],
    (gachaSeriesResult.data ?? []) as SeriesRow[]
  )

  const kujiRows = buildSeriesRevenueRows(
    (kujiPurchasesResult.data ?? []) as PullRow[],
    (kujiSeriesResult.data ?? []) as SeriesRow[]
  )

  const summaryCards = [
    {
      icon: '💰',
      label: '오늘 결제액',
      value: `${todayAmount.toLocaleString()}원`,
      color: '#F59E0B',
    },
    {
      icon: '📅',
      label: '이번달 결제액',
      value: `${monthAmount.toLocaleString()}원`,
      color: '#8CC63F',
    },
    {
      icon: '🏆',
      label: '전체 누적 결제액',
      value: `${totalAmount.toLocaleString()}원`,
      color: '#8B5CF6',
    },
  ]

  return (
    <div>
      <h2
        style={{
          color: '#1A1A1A',
          fontSize: 24,
          fontWeight: 900,
          margin: '0 0 20px',
        }}
      >
        매출 통계
      </h2>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
      >
        {summaryCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <DailyPaymentChart data={dailyPaymentData} />

      <div style={{ marginTop: 16 }}>
        <h3
          style={{
            color: '#1A1A1A',
            fontSize: 18,
            fontWeight: 900,
            margin: '0 0 12px',
          }}
        >
          시리즈별 수익 순위
        </h3>
        <SeriesRevenueTabs gachaRows={gachaRows} kujiRows={kujiRows} />
      </div>
    </div>
  )
}
