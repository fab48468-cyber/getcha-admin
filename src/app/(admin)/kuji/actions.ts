'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = {
  error: string
  success?: string
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function getNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key))
  return Number.isFinite(value) ? value : fallback
}

export async function createKujiSeriesAction(
  _prevState: ActionState,
  formData: FormData
) {
  const name = getString(formData, 'name')
  const description = getString(formData, 'description')
  const thumbnailUrl = getString(formData, 'thumbnail_url')
  const coinPricePerTicket = getNumber(formData, 'coin_price_per_ticket', 100)
  const status = getString(formData, 'status') || 'closed'

  if (!name) {
    return { error: '시리즈명을 입력해 주세요.' }
  }

  const adminClient = createAdminClient()
  const insertPayload = {
    name,
    description: description || null,
    thumbnail_url: thumbnailUrl || null,
    coin_price_per_ticket: coinPricePerTicket,
    status,
    total_tickets: 0,
    remaining_tickets: 0,
  }

  const { error } = await adminClient.from('kuji_series').insert(insertPayload)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/kuji')
  redirect('/kuji')
}

export async function updateKujiSeriesAction(
  seriesId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const name = getString(formData, 'name')
  const description = getString(formData, 'description')
  const thumbnailUrl = getString(formData, 'thumbnail_url')
  const coinPricePerTicket = getNumber(formData, 'coin_price_per_ticket', 100)
  const status = getString(formData, 'status') || 'closed'
  const lastOneProductId = getString(formData, 'last_one_product_id')

  if (!name) {
    return { error: '시리즈명을 입력해 주세요.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('kuji_series')
    .update({
      name,
      description: description || null,
      thumbnail_url: thumbnailUrl || null,
      coin_price_per_ticket: coinPricePerTicket,
      status,
      last_one_product_id: lastOneProductId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seriesId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/kuji')
  revalidatePath(`/kuji/${seriesId}`)
  return { error: '', success: '저장되었습니다.' }
}

export async function createKujiProductAction(
  seriesId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const name = getString(formData, 'name')
  const description = getString(formData, 'description')
  const imageUrl = getString(formData, 'image_url')
  const grade = getString(formData, 'grade')
  const isLastOne = formData.get('is_last_one') === 'on'
  const displayOrder = getNumber(formData, 'display_order', 0)

  if (!name) {
    return { error: '상품명을 입력해 주세요.' }
  }

  if (!grade) {
    return { error: '등급을 입력해 주세요.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('kuji_products').insert({
    series_id: seriesId,
    name,
    description: description || null,
    image_url: imageUrl || null,
    grade,
    is_last_one: isLastOne,
    display_order: displayOrder,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/kuji/${seriesId}`)
  return {
    error: '',
    success: '상품이 추가되었습니다.',
  }
}

export async function createKujiTicketsAction(
  seriesId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const adminClient = createAdminClient()

  const [{ data: series }, { data: products }, { data: latestTickets }] =
    await Promise.all([
      adminClient
        .from('kuji_series')
        .select('status, total_tickets, remaining_tickets, last_one_product_id')
        .eq('id', seriesId)
        .single(),
      adminClient
        .from('kuji_products')
        .select('id, is_last_one, grade')
        .eq('series_id', seriesId),
      adminClient
        .from('kuji_tickets')
        .select('ticket_number')
        .eq('series_id', seriesId)
        .order('ticket_number', { ascending: false })
        .limit(1),
    ])

  if (!series) {
    return { error: '쿠지 시리즈를 찾을 수 없습니다.' }
  }

  if (series.status !== 'closed') {
    return { error: '티켓 생성은 종료 상태(closed)에서만 가능합니다.' }
  }

  const lastOneId = series.last_one_product_id
  const normalProducts = (products ?? []).filter((p) => {
    const isLastOne =
      p.id === lastOneId || p.is_last_one === true || p.grade === 'last_one'
    return !isLastOne
  })
  const productIds = normalProducts.map((product) => product.id as string)
  const rows: {
    series_id: string
    product_id: string
    ticket_number: number
    status: 'available'
  }[] = []
  let nextTicketNumber = Number(latestTickets?.[0]?.ticket_number ?? 0) + 1

  for (const productId of productIds) {
    const quantity = getNumber(formData, `quantity_${productId}`, 0)
    for (let index = 0; index < quantity; index += 1) {
      rows.push({
        series_id: seriesId,
        product_id: productId,
        ticket_number: nextTicketNumber,
        status: 'available',
      })
      nextTicketNumber += 1
    }
  }

  if (rows.length === 0) {
    return { error: '생성할 티켓 수량을 입력해 주세요.' }
  }

  const { error: insertError } = await adminClient.from('kuji_tickets').insert(rows)

  if (insertError) {
    return { error: insertError.message }
  }

  const { error: updateError } = await adminClient
    .from('kuji_series')
    .update({
      total_tickets: Number(series.total_tickets ?? 0) + rows.length,
      remaining_tickets: Number(series.remaining_tickets ?? 0) + rows.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seriesId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/kuji')
  revalidatePath(`/kuji/${seriesId}`)
  return { error: '', success: `${rows.length.toLocaleString()}장 생성되었습니다.` }
}

export async function deleteKujiSeriesAction(seriesId: string) {
  const adminClient = createAdminClient()

  // 1. 판매 이력 확인 — 있으면 삭제 거부
  const { count: purchaseCount, error: purchaseCheckError } = await adminClient
    .from('kuji_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('series_id', seriesId)

  if (purchaseCheckError) {
    return { error: purchaseCheckError.message }
  }

  if ((purchaseCount ?? 0) > 0) {
    return {
      error: `판매 이력이 ${purchaseCount}건 있어 삭제할 수 없습니다. 판매가 시작된 시리즈는 삭제 대신 종료(closed) 처리하세요.`,
    }
  }

  // 2. 자식 데이터 역순 삭제
  //    이 시리즈의 상품 id 목록 확보
  const { data: products, error: productError } = await adminClient
    .from('kuji_products')
    .select('id')
    .eq('series_id', seriesId)

  if (productError) {
    return { error: productError.message }
  }

  const productIds = (products ?? []).map((p) => p.id as string)

  // 2-1. box_items (라스트원 보너스 등 — 판매이력 없어도 방어적으로 정리)
  if (productIds.length > 0) {
    const { error: boxError } = await adminClient
      .from('box_items')
      .delete()
      .in('product_id', productIds)
    if (boxError) {
      return { error: `box_items 삭제 실패: ${boxError.message}` }
    }
  }

  // 2-2. 티켓
  const { error: ticketError } = await adminClient
    .from('kuji_tickets')
    .delete()
    .eq('series_id', seriesId)
  if (ticketError) {
    return { error: `kuji_tickets 삭제 실패: ${ticketError.message}` }
  }

  // 2-3. 라스트원 참조 끊기 (kuji_products 삭제 전 필수)
  const { error: nullifyError } = await adminClient
    .from('kuji_series')
    .update({ last_one_product_id: null })
    .eq('id', seriesId)
  if (nullifyError) {
    return { error: `라스트원 참조 해제 실패: ${nullifyError.message}` }
  }

  // 2-4. 상품 행
  const { error: productDeleteError } = await adminClient
    .from('kuji_products')
    .delete()
    .eq('series_id', seriesId)
  if (productDeleteError) {
    return { error: `kuji_products 삭제 실패: ${productDeleteError.message}` }
  }

  // 3. 시리즈 행
  const { error: seriesError } = await adminClient
    .from('kuji_series')
    .delete()
    .eq('id', seriesId)
  if (seriesError) {
    return { error: `kuji_series 삭제 실패: ${seriesError.message}` }
  }

  revalidatePath('/kuji')
  redirect('/kuji')
}
