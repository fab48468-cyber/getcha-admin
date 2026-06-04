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
  const totalTickets = parseInt(String(formData.get('total_tickets') ?? ''), 10)

  if (!name) {
    return { error: '시리즈명을 입력해 주세요.' }
  }

  if (!Number.isFinite(totalTickets) || totalTickets < 1) {
    return { error: '총 티켓 수는 1 이상이어야 합니다.' }
  }

  const adminClient = createAdminClient()

  const insertPayload = {
    name,
    description: description || null,
    thumbnail_url: thumbnailUrl || null,
    coin_price_per_ticket: coinPricePerTicket,
    status,
    total_tickets: totalTickets,
    remaining_tickets: totalTickets,
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
  const quantity = parseInt(String(formData.get('quantity') ?? ''), 10)

  if (!name) {
    return { error: '상품명을 입력해 주세요.' }
  }

  if (!grade) {
    return { error: '등급을 입력해 주세요.' }
  }

  if (!Number.isFinite(quantity) || quantity < 1) {
    return { error: '수량은 1 이상이어야 합니다.' }
  }

  if (quantity > 50) {
    return { error: '수량은 최대 50까지 입력할 수 있습니다.' }
  }

  const rows = Array.from({ length: quantity }, () => ({
    series_id: seriesId,
    name,
    description: description || null,
    image_url: imageUrl || null,
    grade,
    is_last_one: isLastOne,
    display_order: displayOrder,
  }))

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('kuji_products').insert(rows)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/kuji/${seriesId}`)
  return {
    error: '',
    success: `${quantity.toLocaleString()}개 상품이 추가되었습니다.`,
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
        .select('status, total_tickets, remaining_tickets')
        .eq('id', seriesId)
        .single(),
      adminClient
        .from('kuji_products')
        .select('id')
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

  const productIds = (products ?? []).map((product) => product.id as string)
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
