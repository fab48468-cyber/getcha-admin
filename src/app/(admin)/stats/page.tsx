import { createAdminClient } from '@/lib/supabase/admin'
import DailyPaymentChart, { type DailyPaymentPoint } from './DailyPaymentChart'
import SeriesRevenueTabs, { type SeriesRevenueRow } from './SeriesRevenueTabs'

type AdminStatsResult = {
  success?: boolean
  message?: string
  today_amount?: number
  month_amount?: number
  total_amount?: number
  total_count?: number
  daily?: DailyPaymentPoint[]
  gacha_series?: SeriesRevenueRow[]
  kuji_series?: SeriesRevenueRow[]
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
  const { data, error } = await adminClient.rpc('admin_get_stats', { p_days: 30 })
  const result = data as AdminStatsResult | null
  const loadFailed = Boolean(error || !result?.success)

  const todayAmount = Number(result?.today_amount ?? 0)
  const monthAmount = Number(result?.month_amount ?? 0)
  const totalAmount = Number(result?.total_amount ?? 0)
  const dailyPaymentData = result?.daily ?? []
  const gachaRows = result?.gacha_series ?? []
  const kujiRows = result?.kuji_series ?? []

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

      {loadFailed && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            border: '1px solid #FCD34D',
            borderRadius: 10,
            padding: 12,
            fontSize: 14,
            fontWeight: 800,
            marginBottom: 16,
          }}
        >
          통계를 불러오지 못했습니다.
          {error?.message
            ? ` (${error.message})`
            : result?.message
              ? ` (${result.message})`
              : ''}{' '}
          표시된 수치는 0으로 폴백된 상태입니다.
        </div>
      )}

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
