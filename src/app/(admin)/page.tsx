import { createAdminClient } from '@/lib/supabase/admin'

const SHIPMENT_STATUSES = [
  {
    status: 'requested',
    label: '배송 신청 완료',
    color: '#F59E0B',
  },
  {
    status: 'preparing',
    label: '상품 준비 중',
    color: '#8B5CF6',
  },
  {
    status: 'packed',
    label: '포장 완료',
    color: '#8CC63F',
  },
  {
    status: 'shipped',
    label: '배송 중',
    color: '#3B82F6',
  },
  {
    status: 'delivered',
    label: '배송 완료',
    color: '#6B7280',
  },
  {
    status: 'cancelled',
    label: '취소됨',
    color: '#EF4444',
  },
] as const

type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]['status']

type ChargeRow = {
  amount: number | string | null
}

type StatCardProps = {
  icon: string
  label: string
  value: string
  color: string
}

function getTodayStartIso() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
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

export default async function DashboardPage() {
  const adminClient = createAdminClient()
  const todayStartIso = getTodayStartIso()

  const [
    totalUsersResult,
    todayUsersResult,
    todayChargesResult,
    activeGachaResult,
    activeKujiResult,
    pendingSupportResult,
    ...shipmentResults
  ] = await Promise.all([
    adminClient.from('users').select('id', { count: 'exact', head: true }),
    adminClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStartIso),
    adminClient
      .from('coin_charges')
      .select('amount')
      .eq('status', 'completed')
      .gte('completed_at', todayStartIso),
    adminClient
      .from('gacha_series')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    adminClient
      .from('kuji_series')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    adminClient
      .from('support_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    ...SHIPMENT_STATUSES.map(({ status }) =>
      adminClient
        .from('shipments')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
    ),
  ])

  const shipmentCounts = SHIPMENT_STATUSES.reduce(
    (acc, { status }, index) => {
      acc[status] = shipmentResults[index].count ?? 0
      return acc
    },
    {} as Record<ShipmentStatus, number>
  )

  const todayPaymentAmount = (
    (todayChargesResult.data ?? []) as ChargeRow[]
  ).reduce((sum, charge) => sum + Number(charge.amount ?? 0), 0)

  const activeSeriesCount =
    (activeGachaResult.count ?? 0) + (activeKujiResult.count ?? 0)

  const summaryCards = [
    {
      icon: '👥',
      label: '전체 유저 수',
      value: (totalUsersResult.count ?? 0).toLocaleString(),
      color: '#8B5CF6',
    },
    {
      icon: '🆕',
      label: '오늘 가입자',
      value: (todayUsersResult.count ?? 0).toLocaleString(),
      color: '#8CC63F',
    },
    {
      icon: '💰',
      label: '오늘 결제액',
      value: `${todayPaymentAmount.toLocaleString()}원`,
      color: '#F59E0B',
    },
    {
      icon: '📦',
      label: '처리 대기 배송',
      value: shipmentCounts.requested.toLocaleString(),
      color: '#EF4444',
    },
    {
      icon: '💬',
      label: '미답변 문의',
      value: (pendingSupportResult.count ?? 0).toLocaleString(),
      color: '#EF4444',
    },
    {
      icon: '🎰',
      label: '진행 중 가챠+쿠지',
      value: activeSeriesCount.toLocaleString(),
      color: '#8CC63F',
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
        대시보드
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

      <section
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #E0DDD8',
          marginTop: 16,
        }}
      >
        <h3
          style={{
            color: '#1A1A1A',
            fontSize: 18,
            fontWeight: 900,
            margin: '0 0 16px',
          }}
        >
          배송 현황
        </h3>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  color: '#6B7280',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '0 0 12px',
                  textAlign: 'left',
                  borderBottom: '1px solid #E0DDD8',
                }}
              >
                상태
              </th>
              <th
                style={{
                  color: '#6B7280',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '0 0 12px',
                  textAlign: 'right',
                  borderBottom: '1px solid #E0DDD8',
                }}
              >
                건수
              </th>
            </tr>
          </thead>
          <tbody>
            {SHIPMENT_STATUSES.map(({ status, label, color }) => (
              <tr key={status}>
                <td
                  style={{
                    padding: '14px 0',
                    borderBottom: '1px solid #F0EEEA',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#1A1A1A',
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: color,
                      }}
                    />
                    {label}
                  </span>
                </td>
                <td
                  style={{
                    color: '#1A1A1A',
                    fontSize: 14,
                    fontWeight: 900,
                    padding: '14px 0',
                    textAlign: 'right',
                    borderBottom: '1px solid #F0EEEA',
                  }}
                >
                  {shipmentCounts[status].toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
