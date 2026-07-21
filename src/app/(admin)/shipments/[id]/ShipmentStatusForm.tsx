'use client'

import { useActionState, useMemo, useState } from 'react'
import { updateShipmentAction } from '../actions'

export type ShipmentStatus =
  | 'requested'
  | 'preparing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'on_hold'

export type ShipmentStatusFormData = {
  id: string
  status: ShipmentStatus
  courier_company: string | null
  tracking_number: string | null
  tracking_url: string | null
  admin_memo: string | null
}

const COURIER_OPTIONS = [
  'CJ대한통운',
  '한진택배',
  '롯데택배',
  '우체국택배',
  '로젠택배',
] as const

const CUSTOM_COURIER_OPTION = '직접입력'
const NO_COURIER_OPTION = ''

const TRACKING_URL_BUILDERS: Record<(typeof COURIER_OPTIONS)[number], (trackingNumber: string) => string> = {
  CJ대한통운: (trackingNumber) =>
    `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${trackingNumber}`,
  한진택배: (trackingNumber) =>
    `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${trackingNumber}`,
  롯데택배: (trackingNumber) =>
    `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${trackingNumber}`,
  우체국택배: (trackingNumber) =>
    `https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?POST_CODE=${trackingNumber}`,
  로젠택배: (trackingNumber) =>
    `https://www.ilogen.com/iLogenHomePage/TRACE/TraceInfo.do?slipno=${trackingNumber}`,
}

const STATUS_STYLES: Record<ShipmentStatus, { label: string; color: string }> = {
  requested: { label: '배송신청', color: '#F59E0B' },
  preparing: { label: '준비중', color: '#8B5CF6' },
  packed: { label: '포장완료', color: '#8CC63F' },
  shipped: { label: '배송중', color: '#3B82F6' },
  delivered: { label: '배송완료', color: '#6B7280' },
  cancelled: { label: '취소', color: '#EF4444' },
  on_hold: { label: '보류', color: '#F97316' },
}

const STATUS_OPTIONS: { value: ShipmentStatus; label: string }[] = [
  { value: 'requested', label: '배송신청' },
  { value: 'preparing', label: '준비중' },
  { value: 'packed', label: '포장완료' },
  { value: 'shipped', label: '배송중' },
  { value: 'delivered', label: '배송완료' },
  { value: 'on_hold', label: '보류' },
  { value: 'cancelled', label: '취소' },
]

const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  requested: ['preparing', 'on_hold', 'cancelled'],
  preparing: ['packed', 'on_hold', 'cancelled'],
  packed: ['shipped', 'preparing', 'on_hold'],
  shipped: ['delivered'],
  on_hold: ['requested', 'preparing', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const initialActionState = { error: '', success: '' }

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

function isPredefinedCourier(value: string | null) {
  return COURIER_OPTIONS.includes(value as (typeof COURIER_OPTIONS)[number])
}

function buildTrackingUrl(courierCompany: string, trackingNumber: string) {
  const trimmedNumber = trackingNumber.trim()
  if (!trimmedNumber) return ''

  const builder =
    TRACKING_URL_BUILDERS[courierCompany as (typeof COURIER_OPTIONS)[number]]
  return builder ? builder(trimmedNumber) : ''
}

function getInitialCourierSelect(courierCompany: string | null) {
  if (courierCompany && isPredefinedCourier(courierCompany)) {
    return courierCompany
  }
  if (courierCompany) {
    return CUSTOM_COURIER_OPTION
  }
  return NO_COURIER_OPTION
}

function getSelectableStatuses(currentStatus: ShipmentStatus) {
  const allowed = new Set<ShipmentStatus>([
    currentStatus,
    ...(ALLOWED_TRANSITIONS[currentStatus] ?? []),
  ])
  return STATUS_OPTIONS.filter((option) => allowed.has(option.value))
}

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.requested

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: `${style.color}18`,
        color: style.color,
        border: `1px solid ${style.color}`,
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {style.label}
    </span>
  )
}

function ActionMessage({
  error,
  success,
}: {
  error?: string
  success?: string
}) {
  if (!error && !success) return null

  return (
    <div
      style={{
        backgroundColor: error ? '#FEE2E2' : '#EEFBD0',
        color: error ? '#DC2626' : '#5B8B1E',
        border: error ? '1px solid #FCA5A5' : '1px solid #B7E46B',
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

export default function ShipmentStatusForm({
  shipment,
}: {
  shipment: ShipmentStatusFormData
}) {
  const [state, formAction, isPending] = useActionState(
    updateShipmentAction.bind(null, shipment.id),
    initialActionState
  )
  const [courierSelect, setCourierSelect] = useState(() =>
    getInitialCourierSelect(shipment.courier_company)
  )
  const [customCourier, setCustomCourier] = useState(() =>
    shipment.courier_company && !isPredefinedCourier(shipment.courier_company)
      ? shipment.courier_company
      : ''
  )
  const [trackingNumber, setTrackingNumber] = useState(
    shipment.tracking_number ?? ''
  )
  const [trackingUrl, setTrackingUrl] = useState(shipment.tracking_url ?? '')
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus>(
    shipment.status
  )

  const isTerminal =
    shipment.status === 'delivered' || shipment.status === 'cancelled'
  const allowedTransitions = ALLOWED_TRANSITIONS[shipment.status] ?? []
  const canHold = allowedTransitions.includes('on_hold')
  const canCancel = allowedTransitions.includes('cancelled')
  const selectableStatuses = useMemo(
    () => getSelectableStatuses(shipment.status),
    [shipment.status]
  )

  const resolvedCourier = useMemo(() => {
    if (courierSelect === CUSTOM_COURIER_OPTION) {
      return customCourier.trim()
    }
    return courierSelect
  }, [courierSelect, customCourier])

  function applyAutoTrackingUrl(courierCompany: string, number: string) {
    const autoUrl = buildTrackingUrl(courierCompany, number)
    if (autoUrl) {
      setTrackingUrl(autoUrl)
    }
  }

  function handleCourierSelectChange(value: string) {
    setCourierSelect(value)
    const courier =
      value === CUSTOM_COURIER_OPTION ? customCourier.trim() : value
    applyAutoTrackingUrl(courier, trackingNumber)
  }

  function handleCustomCourierChange(value: string) {
    setCustomCourier(value)
    applyAutoTrackingUrl(value.trim(), trackingNumber)
  }

  function handleTrackingNumberChange(value: string) {
    setTrackingNumber(value)
    applyAutoTrackingUrl(resolvedCourier, value)
  }

  function confirmCancelIfNeeded() {
    return window.confirm(
      '취소하면 배송비가 환불되고 상품 잠금이 해제됩니다. 되돌릴 수 없습니다.'
    )
  }

  function handleCancelClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (!confirmCancelIfNeeded()) {
      event.preventDefault()
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null
    const actionStatus = submitter?.getAttribute('name') === 'action_status'
      ? submitter.value
      : null
    const nextStatus = actionStatus || selectedStatus

    if (
      nextStatus === 'cancelled' &&
      shipment.status !== 'cancelled' &&
      !actionStatus
    ) {
      if (!confirmCancelIfNeeded()) {
        event.preventDefault()
      }
    }
  }

  return (
    <form action={formAction} onSubmit={handleFormSubmit}>
      <ActionMessage error={state?.error} success={state?.success} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ color: '#6B7280', fontSize: 13, fontWeight: 800 }}>
          현재 상태
        </span>
        <StatusBadge status={shipment.status} />
      </div>

      {isTerminal && (
        <div
          style={{
            backgroundColor: '#F3F4F6',
            color: '#6B7280',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            padding: 12,
            fontSize: 14,
            fontWeight: 800,
            marginBottom: 16,
          }}
        >
          {shipment.status === 'delivered'
            ? '배송완료 상태에서는 상태를 변경할 수 없습니다. 송장 정보만 수정할 수 있습니다.'
            : '취소된 배송은 상태를 변경할 수 없습니다. 송장 정보만 수정할 수 있습니다.'}
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={labelStyle}>상태 변경</label>
          {isTerminal && (
            <input type="hidden" name="status" value={shipment.status} />
          )}
          <select
            name={isTerminal ? undefined : 'status'}
            value={selectedStatus}
            onChange={(event) =>
              setSelectedStatus(event.target.value as ShipmentStatus)
            }
            disabled={isTerminal}
            style={{
              ...inputStyle,
              backgroundColor: isTerminal ? '#F9FAFB' : '#FFFFFF',
              color: isTerminal ? '#9CA3AF' : '#1A1A1A',
            }}
          >
            {selectableStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>택배사</label>
            <select
              value={courierSelect}
              onChange={(event) => handleCourierSelectChange(event.target.value)}
              style={inputStyle}
            >
              <option value={NO_COURIER_OPTION}>선택 안 함</option>
              {COURIER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value={CUSTOM_COURIER_OPTION}>{CUSTOM_COURIER_OPTION}</option>
            </select>
            {courierSelect === CUSTOM_COURIER_OPTION && (
              <input
                type="text"
                value={customCourier}
                onChange={(event) => handleCustomCourierChange(event.target.value)}
                placeholder="택배사명 입력"
                style={{ ...inputStyle, marginTop: 8 }}
              />
            )}
            <input type="hidden" name="courier_company" value={resolvedCourier} />
          </div>
          <div>
            <label style={labelStyle}>운송장 번호</label>
            <input
              name="tracking_number"
              type="text"
              value={trackingNumber}
              onChange={(event) => handleTrackingNumberChange(event.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>운송장 URL</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              name="tracking_url"
              type="text"
              value={trackingUrl}
              onChange={(event) => setTrackingUrl(event.target.value)}
              style={inputStyle}
            />
            {trackingUrl.trim() && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#8B5CF6',
                  fontSize: 13,
                  fontWeight: 800,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                미리보기
              </a>
            )}
          </div>
        </div>

        <div>
          <label style={labelStyle}>관리자 메모</label>
          <textarea
            name="admin_memo"
            rows={5}
            defaultValue={shipment.admin_memo ?? ''}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            backgroundColor: '#8CC63F',
            color: '#1A1A1A',
            border: 'none',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 900,
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
        {canHold && (
          <button
            type="submit"
            name="action_status"
            value="on_hold"
            disabled={isPending}
            style={{
              backgroundColor: '#FFF7ED',
              color: '#F97316',
              border: '1px solid #FDBA74',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 900,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            보류
          </button>
        )}
        {canCancel && (
          <button
            type="submit"
            name="action_status"
            value="cancelled"
            disabled={isPending}
            onClick={handleCancelClick}
            style={{
              backgroundColor: '#FEE2E2',
              color: '#EF4444',
              border: '1px solid #FCA5A5',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 900,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            취소
          </button>
        )}
      </div>
    </form>
  )
}
