import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import UserDetailTabs, {
  type ActivityRow,
  type CoinChargeRow,
  type ShipmentRow,
  type TransactionRow,
  type UserDetail,
} from './UserDetailTabs'

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  const [
    { data: userData },
    { data: authUserData },
    { data: coinTransactionsData },
    { data: tokenTransactionsData },
    { data: coinChargesData },
    { data: shipmentsData },
    { data: gachaPullsData },
    { data: kujiPurchasesData },
  ] = await Promise.all([
    adminClient
      .from('users')
      .select(
        'id, nickname, phone_number, signup_provider, coin_balance, token_balance, reroll_ticket_balance, is_active, is_onboarded, penalty_until, suspended_reason, profile_image_url, created_at, last_login_at, monthly_payment_total, gacha_pull_gauge, kuji_ticket_gauge, daily_synthesis_count, random_exchange_slots'
      )
      .eq('id', id)
      .single(),
    adminClient.auth.admin.getUserById(id),
    adminClient
      .from('coin_transactions')
      .select('id, amount, transaction_type, description, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    adminClient
      .from('token_transactions')
      .select('id, amount, transaction_type, description, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    adminClient
      .from('coin_charges')
      .select('id, coin_amount, krw_amount, status, pg_provider, created_at, refund_reason')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    adminClient
      .from('shipments')
      .select('id, status, recipient_name, requested_at')
      .eq('user_id', id)
      .order('requested_at', { ascending: false }),
    adminClient
      .from('gacha_pulls')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    adminClient
      .from('kuji_purchases')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (!userData) {
    notFound()
  }

  const user = userData as UserDetail
  const email = authUserData.user?.email ?? null

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
            유저 상세
          </h2>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
            {user.nickname || user.id}
          </p>
        </div>

        <Link
          href="/users"
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

      <UserDetailTabs
        user={user}
        email={email}
        coinTransactions={(coinTransactionsData ?? []) as TransactionRow[]}
        tokenTransactions={(tokenTransactionsData ?? []) as TransactionRow[]}
        coinCharges={(coinChargesData ?? []) as CoinChargeRow[]}
        shipments={(shipmentsData ?? []) as ShipmentRow[]}
        gachaPulls={(gachaPullsData ?? []) as ActivityRow[]}
        kujiPurchases={(kujiPurchasesData ?? []) as ActivityRow[]}
      />
    </div>
  )
}
