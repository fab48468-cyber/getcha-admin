import { requireWriteAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type ShipmentStatus =
  | 'requested'
  | 'preparing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'on_hold'

type ShipmentExportRow = {
  id: string
  status: ShipmentStatus
  recipient_name: string | null
  recipient_phone: string | null
  postal_code: string | null
  address_main: string | null
  address_detail: string | null
  delivery_memo: string | null
  courier_company: string | null
  tracking_number: string | null
  requested_at: string | null
  users: { nickname: string | null } | { nickname: string | null }[] | null
}

type BoxItem = {
  id: string
  product_id: string | null
  product_type: string | null
}

type ShipmentItemRow = {
  shipment_id: string
  box_items: BoxItem | BoxItem[] | null
}

type ProductRow = {
  id: string
  name: string | null
}

const VALID_STATUSES = new Set<ShipmentStatus>([
  'requested',
  'preparing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'on_hold',
])

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  requested: '배송신청',
  preparing: '준비중',
  packed: '포장완료',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
  on_hold: '보류',
}

function getStringParam(value: string | null) {
  return value?.trim() ?? ''
}

function getFilterQuery(value: string) {
  return value.replace(/[%(),]/g, ' ').trim()
}

function getRelatedOne<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] : value
}

function getNickname(users: ShipmentExportRow['users']) {
  return getRelatedOne(users)?.nickname || ''
}

function getProductKind(productType: string | null) {
  const normalized = (productType ?? '').toLowerCase()
  if (normalized.includes('kuji')) return 'kuji'
  return 'gacha'
}

function escapeCsvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function formatRequestedAtKst(value: string | null) {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value))

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
}

function formatFilenameStamp(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}`
}

export async function GET(request: Request) {
  const admin = await requireWriteAdmin()
  if (!admin) {
    return Response.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const url = new URL(request.url)
  const q = getStringParam(url.searchParams.get('q'))
  const filterQuery = getFilterQuery(q)
  const statusParam = getStringParam(url.searchParams.get('status'))
  const activeStatus =
    statusParam && VALID_STATUSES.has(statusParam as ShipmentStatus)
      ? (statusParam as ShipmentStatus)
      : 'all'

  const adminClient = createAdminClient()

  let matchedUserIds: string[] = []
  if (filterQuery) {
    const { data: matchedUsers } = await adminClient
      .from('users')
      .select('id')
      .ilike('nickname', `%${filterQuery}%`)
      .limit(50)
    matchedUserIds = (matchedUsers ?? []).map((user) => user.id)
  }

  let listQuery = adminClient
    .from('shipments')
    .select(
      'id, status, recipient_name, recipient_phone, postal_code, address_main, address_detail, delivery_memo, courier_company, tracking_number, requested_at, users(nickname)'
    )
    .order('requested_at', { ascending: true })
    .limit(1000)

  if (activeStatus !== 'all') {
    listQuery = listQuery.eq('status', activeStatus)
  }

  if (filterQuery) {
    const orParts = [
      `recipient_name.ilike.%${filterQuery}%`,
      `recipient_phone.ilike.%${filterQuery}%`,
      `tracking_number.ilike.%${filterQuery}%`,
    ]
    if (matchedUserIds.length > 0) {
      orParts.push(`user_id.in.(${matchedUserIds.join(',')})`)
    }
    listQuery = listQuery.or(orParts.join(','))
  }

  const { data: shipmentsData, error: shipmentsError } = await listQuery
  if (shipmentsError) {
    return Response.json({ error: shipmentsError.message }, { status: 500 })
  }

  const shipments = (shipmentsData ?? []) as ShipmentExportRow[]
  const shipmentIds = shipments.map((shipment) => shipment.id)

  const productNamesByShipment = new Map<string, string[]>()

  if (shipmentIds.length > 0) {
    const { data: shipmentItemsData } = await adminClient
      .from('shipment_items')
      .select('shipment_id, box_items(id, product_id, product_type)')
      .in('shipment_id', shipmentIds)

    const shipmentItems = (shipmentItemsData ?? []) as ShipmentItemRow[]
    const boxItemsByShipment = new Map<string, BoxItem[]>()

    for (const item of shipmentItems) {
      const boxItem = getRelatedOne(item.box_items)
      if (!boxItem) continue
      const list = boxItemsByShipment.get(item.shipment_id) ?? []
      list.push(boxItem)
      boxItemsByShipment.set(item.shipment_id, list)
    }

    const allBoxItems = [...boxItemsByShipment.values()].flat()
    const gachaProductIds = [
      ...new Set(
        allBoxItems
          .filter((item) => getProductKind(item.product_type) === 'gacha' && item.product_id)
          .map((item) => item.product_id as string)
      ),
    ]
    const kujiProductIds = [
      ...new Set(
        allBoxItems
          .filter((item) => getProductKind(item.product_type) === 'kuji' && item.product_id)
          .map((item) => item.product_id as string)
      ),
    ]

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

    for (const [shipmentId, boxItems] of boxItemsByShipment) {
      const names = boxItems.map((boxItem) => {
        if (!boxItem.product_id) return '-'
        const kind = getProductKind(boxItem.product_type)
        return productNameMap.get(`${kind}:${boxItem.product_id}`) || '-'
      })
      productNamesByShipment.set(shipmentId, names)
    }
  }

  await adminClient.from('admin_actions').insert({
    action_type: 'shipment_export',
    admin_user_id: admin.id,
    target_type: 'shipments',
    details: {
      status: activeStatus,
      q: q || null,
      count: shipments.length,
    },
  })

  const header = [
    'shipment_id',
    '신청일',
    '주문자닉네임',
    '수령인',
    '전화번호',
    '우편번호',
    '주소',
    '배송메모',
    '상품수',
    '상품목록',
    '현재상태',
    '택배사',
    '송장번호',
  ]

  const rows = shipments.map((shipment) => {
    const productNames = productNamesByShipment.get(shipment.id) ?? []
    const address = `${shipment.address_main ?? ''} ${shipment.address_detail ?? ''}`.trim()

    return [
      shipment.id,
      formatRequestedAtKst(shipment.requested_at),
      getNickname(shipment.users),
      shipment.recipient_name ?? '',
      shipment.recipient_phone ?? '',
      shipment.postal_code ?? '',
      address,
      shipment.delivery_memo ?? '',
      String(productNames.length),
      productNames.join(' / '),
      STATUS_LABELS[shipment.status] ?? shipment.status,
      shipment.courier_company ?? '',
      shipment.tracking_number ?? '',
    ].map(escapeCsvField)
  })

  const csvBody = [header.map(escapeCsvField).join(','), ...rows.map((row) => row.join(','))].join(
    '\r\n'
  )
  const csv = `\uFEFF${csvBody}`

  const filename = `shipments_${activeStatus}_${formatFilenameStamp(new Date())}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
