'use client'

import Link from 'next/link'
import { useActionState, useState, useTransition } from 'react'
import { removeUserPenaltyAction, updateUserStatusAction } from '../actions'
import { refundChargeAction } from './refundAction'

export type UserDetail = {
  id: string
  nickname: string | null
  phone_number: string | null
  signup_provider: string | null
  coin_balance: number | null
  token_balance: number | null
  reroll_ticket_balance: number | null
  is_active: boolean | null
  is_onboarded: boolean | null
  penalty_until: string | null
  suspended_reason: string | null
  profile_image_url: string | null
  created_at: string | null
  last_login_at: string | null
  monthly_payment_total: number | null
  gacha_pull_gauge: number | null
  kuji_ticket_gauge: number | null
  daily_synthesis_count: number | null
  random_exchange_slots: unknown
}

export type TransactionRow = {
  id: string
  amount: number | null
  transaction_type: string | null
  description: string | null
  created_at: string | null
}

export type CoinChargeRow = {
  id: string
  coin_amount: number | null
  krw_amount: number | null
  status: string | null
  pg_provider: string | null
  created_at: string | null
  refund_reason: string | null
}

export type ShipmentRow = {
  id: string
  status: string | null
  recipient_name: string | null
  requested_at: string | null
}

export type ActivityRow = {
  id: string
  created_at: string | null
  series_id?: string | null
  product_id?: string | null
  kuji_series_id?: string | null
  ticket_number?: number | null
}

type UserDetailTabsProps = {
  user: UserDetail
  email: string | null
  coinTransactions: TransactionRow[]
  tokenTransactions: TransactionRow[]
  coinCharges: CoinChargeRow[]
  shipments: ShipmentRow[]
  gachaPulls: ActivityRow[]
  kujiPurchases: ActivityRow[]
}

type TabKey = 'basic' | 'transactions' | 'shipments' | 'account'

const initialActionState = { error: '', success: '' }

const sectionStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  border: '1px solid #E0DDD8',
  padding: 20,
} as const

const inputStyle = {
  width: '100%',
  border: '1px solid #E0DDD8',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
} as const

const labelStyle = {
  display: 'block',
  color: '#1A1A1A',
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 6,
} as const

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '기본 정보' },
  { key: 'transactions', label: '거래 내역' },
  { key: 'shipments', label: '배송 내역' },
  { key: 'account', label: '계정 관리' },
]

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function formatNumber(value: number | null) {
  return (value ?? 0).toLocaleString()
}

function getAccountStatus(user: Pick<UserDetail, 'is_active' | 'penalty_until'>) {
  if (user.is_active === false) {
    return { label: '정지', backgroundColor: '#FEE2E2', color: '#DC2626' }
  }

  const penaltyUntil = user.penalty_until ? new Date(user.penalty_until) : null
  if (penaltyUntil && penaltyUntil.getTime() > Date.now()) {
    return { label: '패널티', backgroundColor: '#FEF3C7', color: '#D97706' }
  }

  return { label: '정상', backgroundColor: '#EEFBD0', color: '#5B8B1E' }
}

function StatusBadge({ user }: { user: Pick<UserDetail, 'is_active' | 'penalty_until'> }) {
  const style = getAccountStatus(user)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {style.label}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ color: '#1A1A1A', fontSize: 18, fontWeight: 900, margin: '0 0 16px' }}>
      {children}
    </h3>
  )
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>{value || '-'}</div>
    </div>
  )
}

function ActionMessage({
  error,
  success,
  critical,
}: {
  error?: string
  success?: string
  critical?: boolean
}) {
  if (!error && !success) return null

  return (
    <div
      style={{
        backgroundColor: critical ? '#7F1D1D' : error ? '#FEE2E2' : '#EEFBD0',
        color: critical ? '#FFFFFF' : error ? '#DC2626' : '#5B8B1E',
        border: critical
          ? '2px solid #DC2626'
          : error
            ? '1px solid #FCA5A5'
            : '1px solid #B7E46B',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        fontWeight: 800,
        marginBottom: 16,
      }}
    >
      {error || success}
    </div>
  )
}

function ProfileAvatar({ user }: { user: UserDetail }) {
  const initial = (user.nickname || user.phone_number || '?').slice(0, 1).toUpperCase()

  if (user.profile_image_url) {
    return (
      <img
        src={user.profile_image_url}
        alt={user.nickname ?? '프로필 이미지'}
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid #E0DDD8',
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: 96,
        height: 96,
        borderRadius: '50%',
        backgroundColor: '#EEFBD0',
        color: '#5B8B1E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 34,
        fontWeight: 900,
        border: '1px solid #B7E46B',
      }}
    >
      {initial}
    </div>
  )
}

function GaugeBar({ label, value, max }: { label: string; value: number | null; max: number }) {
  const current = Math.max(0, Math.min(Number(value ?? 0), max))
  const percent = Math.round((current / max) * 100)

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: '#1A1A1A',
          fontSize: 13,
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        <span>{label}</span>
        <span>
          {current} / {max}
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 999, backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: 999,
            backgroundColor: '#8CC63F',
          }}
        />
      </div>
    </div>
  )
}

function BasicInfoTab({ user, email }: { user: UserDetail; email: string | null }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={sectionStyle}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
          <ProfileAvatar user={user} />
          <div>
            <h3 style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 900, margin: 0 }}>
              {user.nickname || '닉네임 없음'}
            </h3>
            <p style={{ color: '#6B7280', fontSize: 13, margin: '6px 0 0' }}>{user.id}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <InfoItem label="닉네임" value={user.nickname} />
          <InfoItem label="전화번호" value={user.phone_number} />
          <InfoItem label="이메일" value={email} />
          <InfoItem label="가입방법" value={user.signup_provider} />
          <InfoItem label="가입일" value={formatDateTime(user.created_at)} />
          <InfoItem label="마지막 로그인" value={formatDateTime(user.last_login_at)} />
          <InfoItem label="온보딩" value={user.is_onboarded ? '완료' : '미완료'} />
          <InfoItem label="일일 합성 횟수" value={formatNumber(user.daily_synthesis_count)} />
        </div>
      </section>

      <section style={sectionStyle}>
        <SectionTitle>보유 재화</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <InfoItem label="코인" value={formatNumber(user.coin_balance)} />
          <InfoItem label="토큰" value={formatNumber(user.token_balance)} />
          <InfoItem label="리롤권" value={formatNumber(user.reroll_ticket_balance)} />
          <InfoItem label="월 누적 결제액" value={`${formatNumber(user.monthly_payment_total)}원`} />
        </div>
      </section>

      <section style={sectionStyle}>
        <SectionTitle>게이지</SectionTitle>
        <div style={{ display: 'grid', gap: 16 }}>
          <GaugeBar label="가챠 뽑기 게이지" value={user.gacha_pull_gauge} max={99} />
          <GaugeBar label="쿠지 티켓 게이지" value={user.kuji_ticket_gauge} max={49} />
        </div>
      </section>
    </div>
  )
}

function TransactionTable({
  title,
  rows,
}: {
  title: string
  rows: TransactionRow[]
}) {
  return (
    <section style={sectionStyle}>
      <SectionTitle>{title}</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#F9F9F9' }}>
          <tr>
            {['수량', '유형', '설명', '일시'].map((header) => (
              <th
                key={header}
                style={{
                  color: '#6B7280',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '12px 14px',
                  textAlign: 'left',
                  borderBottom: '1px solid #E0DDD8',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 800, padding: 14, borderBottom: '1px solid #F0EEEA' }}>
                {formatNumber(row.amount)}
              </td>
              <td style={{ color: '#1A1A1A', fontSize: 14, padding: 14, borderBottom: '1px solid #F0EEEA' }}>
                {row.transaction_type || '-'}
              </td>
              <td style={{ color: '#6B7280', fontSize: 14, padding: 14, borderBottom: '1px solid #F0EEEA' }}>
                {row.description || '-'}
              </td>
              <td style={{ color: '#6B7280', fontSize: 14, padding: 14, borderBottom: '1px solid #F0EEEA' }}>
                {formatDateTime(row.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: 24 }}>
          내역이 없습니다.
        </div>
      )}
    </section>
  )
}

function ActivityList({
  title,
  rows,
  type,
}: {
  title: string
  rows: ActivityRow[]
  type: 'gacha' | 'kuji'
}) {
  return (
    <section style={sectionStyle}>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((row, index) => (
          <div
            key={row.id ?? `${row.created_at}-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid #F0EEEA',
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div>
              <strong style={{ color: '#1A1A1A', fontSize: 14 }}>
                {type === 'gacha' ? row.series_id || row.product_id || row.id : row.kuji_series_id || row.id}
              </strong>
              {type === 'kuji' && row.ticket_number != null && (
                <span style={{ color: '#6B7280', fontSize: 13, marginLeft: 8 }}>
                  #{row.ticket_number}
                </span>
              )}
            </div>
            <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 700 }}>
              {formatDateTime(row.created_at)}
            </span>
          </div>
        ))}
      </div>
      {rows.length === 0 && (
        <div style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: 24 }}>
          내역이 없습니다.
        </div>
      )}
    </section>
  )
}

function getChargeStatusLabel(status: string | null) {
  switch (status) {
    case 'completed':
      return '완료'
    case 'refunded':
      return '환불됨'
    case 'pending':
      return '대기'
    case 'failed':
      return '실패'
    default:
      return status || '-'
  }
}

function getProviderLabel(provider: string | null) {
  switch (provider) {
    case 'tosspayments':
      return '토스페이먼츠'
    case 'google_play':
      return 'Google Play'
    case 'app_store':
      return 'App Store'
    default:
      return provider || '-'
  }
}

function CoinChargesSection({
  userId,
  charges,
}: {
  userId: string
  charges: CoinChargeRow[]
}) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    error?: string
    success?: string
    critical?: boolean
  }>({})
  const [reasonByCharge, setReasonByCharge] = useState<Record<string, string>>({})
  const [openChargeId, setOpenChargeId] = useState<string | null>(null)

  function handleRefund(charge: CoinChargeRow) {
    const reason = (reasonByCharge[charge.id] ?? '').trim()
    if (!reason) {
      setMessage({ error: '환불 사유를 입력해 주세요.' })
      return
    }

    const krw = formatNumber(charge.krw_amount)
    const coins = formatNumber(charge.coin_amount)
    const confirmed = window.confirm(
      `${krw}원을 환불합니다. 코인 ${coins}개가 차감되고 결제가 취소됩니다. 되돌릴 수 없습니다.`
    )
    if (!confirmed) return

    startTransition(async () => {
      const result = await refundChargeAction(charge.id, userId, reason)
      if (result.error) {
        setMessage({
          error: result.error,
          critical: 'critical' in result ? Boolean(result.critical) : false,
        })
        return
      }
      setMessage({ success: result.success })
      setOpenChargeId(null)
      setReasonByCharge((prev) => {
        const next = { ...prev }
        delete next[charge.id]
        return next
      })
    })
  }

  return (
    <section style={sectionStyle}>
      <SectionTitle>충전 내역</SectionTitle>
      <ActionMessage
        error={message.error}
        success={message.success}
        critical={message.critical}
      />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#F9F9F9' }}>
          <tr>
            {['코인', '금액', '상태', '결제수단', '일시', '환불'].map((header) => (
              <th
                key={header}
                style={{
                  color: '#6B7280',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '12px 14px',
                  textAlign: 'left',
                  borderBottom: '1px solid #E0DDD8',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => {
            const canRefund =
              charge.status === 'completed' && charge.pg_provider === 'tosspayments'
            const isStorePayment =
              charge.status === 'completed' &&
              charge.pg_provider !== 'tosspayments' &&
              Boolean(charge.pg_provider)
            const isOpen = openChargeId === charge.id

            return (
              <tr key={charge.id}>
                <td
                  style={{
                    color: '#1A1A1A',
                    fontSize: 14,
                    fontWeight: 800,
                    padding: 14,
                    borderBottom: '1px solid #F0EEEA',
                    verticalAlign: 'top',
                  }}
                >
                  {formatNumber(charge.coin_amount)}
                </td>
                <td
                  style={{
                    color: '#1A1A1A',
                    fontSize: 14,
                    padding: 14,
                    borderBottom: '1px solid #F0EEEA',
                    verticalAlign: 'top',
                  }}
                >
                  {formatNumber(charge.krw_amount)}원
                </td>
                <td
                  style={{
                    color: '#1A1A1A',
                    fontSize: 14,
                    padding: 14,
                    borderBottom: '1px solid #F0EEEA',
                    verticalAlign: 'top',
                  }}
                >
                  {getChargeStatusLabel(charge.status)}
                  {charge.refund_reason && (
                    <div style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                      {charge.refund_reason}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    color: '#1A1A1A',
                    fontSize: 14,
                    padding: 14,
                    borderBottom: '1px solid #F0EEEA',
                    verticalAlign: 'top',
                  }}
                >
                  {getProviderLabel(charge.pg_provider)}
                </td>
                <td
                  style={{
                    color: '#6B7280',
                    fontSize: 14,
                    padding: 14,
                    borderBottom: '1px solid #F0EEEA',
                    verticalAlign: 'top',
                  }}
                >
                  {formatDateTime(charge.created_at)}
                </td>
                <td
                  style={{
                    padding: 14,
                    borderBottom: '1px solid #F0EEEA',
                    verticalAlign: 'top',
                    minWidth: 220,
                  }}
                >
                  {canRefund ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {isOpen ? (
                        <>
                          <textarea
                            value={reasonByCharge[charge.id] ?? ''}
                            onChange={(event) =>
                              setReasonByCharge((prev) => ({
                                ...prev,
                                [charge.id]: event.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="환불 사유 (필수)"
                            style={{ ...inputStyle, resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleRefund(charge)}
                              style={{
                                backgroundColor: '#EF4444',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 8,
                                padding: '8px 12px',
                                fontSize: 13,
                                fontWeight: 900,
                                cursor: isPending ? 'not-allowed' : 'pointer',
                                opacity: isPending ? 0.6 : 1,
                              }}
                            >
                              {isPending ? '처리 중...' : '환불 확정'}
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => setOpenChargeId(null)}
                              style={{
                                backgroundColor: '#F3F4F6',
                                color: '#6B7280',
                                border: 'none',
                                borderRadius: 8,
                                padding: '8px 12px',
                                fontSize: 13,
                                fontWeight: 900,
                                cursor: 'pointer',
                              }}
                            >
                              닫기
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setMessage({})
                            setOpenChargeId(charge.id)
                          }}
                          style={{
                            backgroundColor: '#FEE2E2',
                            color: '#EF4444',
                            border: '1px solid #FCA5A5',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 13,
                            fontWeight: 900,
                            cursor: isPending ? 'not-allowed' : 'pointer',
                          }}
                        >
                          환불
                        </button>
                      )}
                    </div>
                  ) : isStorePayment ? (
                    <span style={{ color: '#D97706', fontSize: 13, fontWeight: 800 }}>
                      스토어 환불 대상
                    </span>
                  ) : (
                    <span style={{ color: '#9CA3AF', fontSize: 13 }}>-</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {charges.length === 0 && (
        <div style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: 24 }}>
          충전 내역이 없습니다.
        </div>
      )}
    </section>
  )
}

function TransactionsTab({
  userId,
  coinTransactions,
  tokenTransactions,
  coinCharges,
  gachaPulls,
  kujiPurchases,
}: Pick<
  UserDetailTabsProps,
  | 'coinTransactions'
  | 'tokenTransactions'
  | 'coinCharges'
  | 'gachaPulls'
  | 'kujiPurchases'
> & { userId: string }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <CoinChargesSection userId={userId} charges={coinCharges} />
      <TransactionTable title="코인 거래 내역" rows={coinTransactions} />
      <TransactionTable title="토큰 거래 내역" rows={tokenTransactions} />
      <ActivityList title="최근 가챠 뽑기" rows={gachaPulls} type="gacha" />
      <ActivityList title="최근 쿠지 구매" rows={kujiPurchases} type="kuji" />
    </div>
  )
}

function ShipmentsTab({ shipments }: { shipments: ShipmentRow[] }) {
  return (
    <section style={sectionStyle}>
      <SectionTitle>배송 내역</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#F9F9F9' }}>
          <tr>
            {['상태', '수령인', '신청일', '상세 링크'].map((header) => (
              <th
                key={header}
                style={{
                  color: '#6B7280',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '12px 14px',
                  textAlign: 'left',
                  borderBottom: '1px solid #E0DDD8',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shipments.map((shipment) => (
            <tr key={shipment.id}>
              <td style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 800, padding: 14, borderBottom: '1px solid #F0EEEA' }}>
                {shipment.status || '-'}
              </td>
              <td style={{ color: '#1A1A1A', fontSize: 14, padding: 14, borderBottom: '1px solid #F0EEEA' }}>
                {shipment.recipient_name || '-'}
              </td>
              <td style={{ color: '#6B7280', fontSize: 14, padding: 14, borderBottom: '1px solid #F0EEEA' }}>
                {formatDateTime(shipment.requested_at)}
              </td>
              <td style={{ padding: 14, borderBottom: '1px solid #F0EEEA' }}>
                <Link
                  href={`/shipments/${shipment.id}`}
                  style={{
                    color: '#8B5CF6',
                    fontSize: 13,
                    fontWeight: 900,
                    textDecoration: 'none',
                  }}
                >
                  상세 보기
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {shipments.length === 0 && (
        <div style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: 24 }}>
          배송 내역이 없습니다.
        </div>
      )}
    </section>
  )
}

function AccountManagementTab({ user }: { user: UserDetail }) {
  const [statusState, statusAction, isStatusPending] = useActionState(
    updateUserStatusAction.bind(null, user.id),
    initialActionState
  )
  const [penaltyState, penaltyAction, isPenaltyPending] = useActionState(
    removeUserPenaltyAction.bind(null, user.id),
    initialActionState
  )
  const [accountStatus, setAccountStatus] = useState(user.is_active === false ? 'suspended' : 'active')
  const [currentTime] = useState(() => Date.now())
  const hasActivePenalty = user.penalty_until
    ? new Date(user.penalty_until).getTime() > currentTime
    : false

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={sectionStyle}>
        <SectionTitle>계정 상태</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 800 }}>현재 상태</span>
          <StatusBadge user={user} />
        </div>
        <InfoItem label="패널티 종료일" value={formatDateTime(user.penalty_until)} />

        <form action={penaltyAction} style={{ marginTop: 16 }}>
          <ActionMessage error={penaltyState?.error} success={penaltyState?.success} />
          <button
            type="submit"
            disabled={!hasActivePenalty || isPenaltyPending}
            style={{
              backgroundColor: hasActivePenalty ? '#F59E0B' : '#F3F4F6',
              color: hasActivePenalty ? '#FFFFFF' : '#9CA3AF',
              border: 'none',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 900,
              cursor: hasActivePenalty && !isPenaltyPending ? 'pointer' : 'not-allowed',
              opacity: isPenaltyPending ? 0.6 : 1,
            }}
          >
            {isPenaltyPending ? '처리 중...' : '패널티 해제'}
          </button>
        </form>
      </section>

      <section style={sectionStyle}>
        <SectionTitle>계정 정지/활성화</SectionTitle>
        <form action={statusAction}>
          <ActionMessage error={statusState?.error} success={statusState?.success} />
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>계정 상태</label>
              <select
                name="account_status"
                value={accountStatus}
                onChange={(event) => setAccountStatus(event.target.value)}
                style={inputStyle}
              >
                <option value="active">활성화</option>
                <option value="suspended">정지</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>정지 사유</label>
              <textarea
                name="suspended_reason"
                rows={5}
                defaultValue={user.suspended_reason ?? ''}
                placeholder="계정 정지 시 사유를 입력해 주세요."
                disabled={accountStatus === 'active'}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  backgroundColor: accountStatus === 'active' ? '#F9FAFB' : '#FFFFFF',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isStatusPending}
            style={{
              backgroundColor: '#8CC63F',
              color: '#1A1A1A',
              border: 'none',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 900,
              cursor: isStatusPending ? 'not-allowed' : 'pointer',
              opacity: isStatusPending ? 0.6 : 1,
              marginTop: 20,
            }}
          >
            {isStatusPending ? '저장 중...' : '저장'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default function UserDetailTabs({
  user,
  email,
  coinTransactions,
  tokenTransactions,
  coinCharges,
  shipments,
  gachaPulls,
  kujiPurchases,
}: UserDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('basic')

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          padding: 6,
          marginBottom: 16,
        }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                backgroundColor: active ? '#8CC63F' : 'transparent',
                color: active ? '#1A1A1A' : '#6B7280',
                border: 'none',
                borderRadius: 9,
                padding: '10px 14px',
                fontSize: 14,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'basic' && <BasicInfoTab user={user} email={email} />}
      {activeTab === 'transactions' && (
        <TransactionsTab
          userId={user.id}
          coinTransactions={coinTransactions}
          tokenTransactions={tokenTransactions}
          coinCharges={coinCharges}
          gachaPulls={gachaPulls}
          kujiPurchases={kujiPurchases}
        />
      )}
      {activeTab === 'shipments' && <ShipmentsTab shipments={shipments} />}
      {activeTab === 'account' && <AccountManagementTab user={user} />}
    </div>
  )
}
