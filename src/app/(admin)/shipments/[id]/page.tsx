import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import ShipmentStatusForm, {
  type ShipmentStatus,
  type ShipmentStatusFormData,
} from './ShipmentStatusForm'

type ShipmentDetail = {
  id: string
  user_id: string | null
  status: ShipmentStatus
  recipient_name: string | null
  recipient_phone: string | null
  postal_code: string | null
  address_main: string | null
  address_detail: string | null
  delivery_memo: string | null
  courier_company: string | null
  tracking_number: string | null
  tracking_url: string | null
  coin_fee: number | null
  token_used: number | null
  total_item_value: number | null
  requested_at: string | null
  packed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  admin_memo: string | null
  idempotency_key: string | null
  users: { nickname: string | null } | { nickname: string | null }[] | null
}

type BoxItem = {
  id: string
  user_id: string | null
  product_id: string | null
  product_type: string | null
  status: string | null
  coin_price_at_acquisition: number | null
}

type ShipmentItemRow = {
  id: string
  shipment_id: string
  box_item_id: string
  box_items: BoxItem | BoxItem[] | null
}

type ProductRow = {
  id: string
  name: string | null
}

type StatusLog = {
  shipment_id: string
  old_status: ShipmentStatus | null
  new_status: ShipmentStatus
  memo: string | null
  changed_by: string | null
  created_at: string | null
}

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  requested: '배송신청',
  preparing: '준비중',
  packed: '포장완료',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
  on_hold: '보류',
}

const sectionStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  border: '1px solid #E0DDD8',
  padding: 20,
  marginBottom: 16,
} as const

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function getRelatedOne<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] : value
}

function getNickname(users: ShipmentDetail['users']) {
  return getRelatedOne(users)?.nickname || '-'
}

function getProductKind(productType: string | null) {
  const normalized = (productType ?? '').toLowerCase()
  if (normalized.includes('kuji')) return 'kuji'
  return 'gacha'
}

function ProductTypeBadge({ productType }: { productType: string | null }) {
  const kind = getProductKind(productType)
  const color = kind === 'kuji' ? '#F59E0B' : '#8B5CF6'

  return (
    <span
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 900,
      }}
    >
      {kind === 'kuji' ? 'KUJI' : 'GACHA'}
    </span>
  )
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: '#6B7280', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
        {value || '-'}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        color: '#1A1A1A',
        fontSize: 18,
        fontWeight: 900,
        margin: '0 0 16px',
      }}
    >
      {children}
    </h3>
  )
}

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  const [{ data: shipmentData }, { data: shipmentItemsData }, { data: logsData }] =
    await Promise.all([
      adminClient
        .from('shipments')
        .select(
          'id, user_id, status, recipient_name, recipient_phone, postal_code, address_main, address_detail, delivery_memo, courier_company, tracking_number, tracking_url, coin_fee, token_used, total_item_value, requested_at, packed_at, shipped_at, delivered_at, cancelled_at, admin_memo, idempotency_key, users(nickname)'
        )
        .eq('id', id)
        .single(),
      adminClient
        .from('shipment_items')
        .select(
          'id, shipment_id, box_item_id, box_items(id, user_id, product_id, product_type, status, coin_price_at_acquisition)'
        )
        .eq('shipment_id', id),
      adminClient
        .from('shipment_status_logs')
        .select('shipment_id, old_status, new_status, memo, changed_by, created_at')
        .eq('shipment_id', id)
        .order('created_at', { ascending: true }),
    ])

  if (!shipmentData) {
    notFound()
  }

  const shipment = shipmentData as ShipmentDetail
  const shipmentItems = (shipmentItemsData ?? []) as ShipmentItemRow[]
  const boxItems = shipmentItems
    .map((item) => getRelatedOne(item.box_items))
    .filter((item): item is BoxItem => Boolean(item))

  const gachaProductIds = boxItems
    .filter((item) => getProductKind(item.product_type) === 'gacha' && item.product_id)
    .map((item) => item.product_id as string)
  const kujiProductIds = boxItems
    .filter((item) => getProductKind(item.product_type) === 'kuji' && item.product_id)
    .map((item) => item.product_id as string)

  const [{ data: gachaProductsData }, { data: kujiProductsData }] = await Promise.all([
    gachaProductIds.length
      ? adminClient.from('gacha_products').select('id, name').in('id', gachaProductIds)
      : { data: [] },
    kujiProductIds.length
      ? adminClient.from('kuji_products').select('id, name').in('id', kujiProductIds)
      : { data: [] },
  ])

  const productNameMap = new Map<string, string>()
  for (const product of (gachaProductsData ?? []) as ProductRow[]) {
    productNameMap.set(`gacha:${product.id}`, product.name || '-')
  }
  for (const product of (kujiProductsData ?? []) as ProductRow[]) {
    productNameMap.set(`kuji:${product.id}`, product.name || '-')
  }

  const logs = (logsData ?? []) as StatusLog[]
  const statusFormData: ShipmentStatusFormData = {
    id: shipment.id,
    status: shipment.status,
    courier_company: shipment.courier_company,
    tracking_number: shipment.tracking_number,
    tracking_url: shipment.tracking_url,
    admin_memo: shipment.admin_memo,
  }

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
            배송 상세
          </h2>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
            {shipment.id}
          </p>
        </div>

        <Link
          href="/shipments"
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

      <section style={sectionStyle}>
        <SectionTitle>배송 기본 정보</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <InfoItem label="주문자 닉네임" value={getNickname(shipment.users)} />
          <InfoItem label="수령인명" value={shipment.recipient_name} />
          <InfoItem label="전화번호" value={shipment.recipient_phone} />
          <InfoItem label="우편번호" value={shipment.postal_code} />
          <InfoItem
            label="주소"
            value={`${shipment.address_main ?? ''} ${shipment.address_detail ?? ''}`.trim()}
          />
          <InfoItem label="배송메모" value={shipment.delivery_memo} />
          <InfoItem
            label="배송비(코인)"
            value={(shipment.coin_fee ?? 0).toLocaleString()}
          />
          <InfoItem
            label="토큰 사용"
            value={(shipment.token_used ?? 0).toLocaleString()}
          />
          <InfoItem
            label="상품 총 가치"
            value={(shipment.total_item_value ?? 0).toLocaleString()}
          />
        </div>
      </section>

      <section style={sectionStyle}>
        <SectionTitle>상품 목록</SectionTitle>
        <div style={{ display: 'grid', gap: 10 }}>
          {boxItems.map((boxItem) => {
            const kind = getProductKind(boxItem.product_type)
            const productName = boxItem.product_id
              ? productNameMap.get(`${kind}:${boxItem.product_id}`) || '-'
              : '-'

            return (
              <div
                key={boxItem.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #F0EEEA',
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <strong style={{ color: '#1A1A1A', fontSize: 14 }}>{productName}</strong>
                <ProductTypeBadge productType={boxItem.product_type} />
              </div>
            )
          })}
        </div>
        {boxItems.length === 0 && (
          <div style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: 24 }}>
            배송에 포함된 상품이 없습니다.
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <SectionTitle>배송 상태 관리</SectionTitle>
        <ShipmentStatusForm shipment={statusFormData} />
      </section>

      <section style={sectionStyle}>
        <SectionTitle>상태 변경 이력</SectionTitle>
        <div style={{ display: 'grid', gap: 10 }}>
          {logs.map((log) => (
            <div
              key={`${log.created_at}-${log.new_status}`}
              style={{
                border: '1px solid #F0EEEA',
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <strong style={{ color: '#1A1A1A', fontSize: 14 }}>
                  {log.old_status ? STATUS_LABELS[log.old_status] : '-'} →{' '}
                  {STATUS_LABELS[log.new_status]}
                </strong>
                <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 700 }}>
                  {formatDateTime(log.created_at)}
                </span>
              </div>
              <div style={{ color: '#6B7280', fontSize: 13 }}>
                {log.memo || '메모 없음'}
              </div>
              {log.changed_by && (
                <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>
                  변경자: {log.changed_by}
                </div>
              )}
            </div>
          ))}
        </div>
        {logs.length === 0 && (
          <div style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: 24 }}>
            상태 변경 이력이 없습니다.
          </div>
        )}
      </section>
    </div>
  )
}
