'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export type GrantRevokeType =
  | 'coin_grant'
  | 'coin_revoke'
  | 'token_grant'
  | 'token_revoke'

export type SearchUserRow = {
  id: string
  nickname: string | null
  phone_number: string | null
  coin_balance: number | null
  token_balance: number | null
}

type ActionResult = {
  success: boolean
  error?: string
  message?: string
}

function getFilterQuery(value: string) {
  return value.replace(/[%(),]/g, ' ').trim()
}

async function requireSuperAdmin() {
  const admin = await getAdminUser()
  if (!admin || admin.role !== 'super_admin') {
    return null
  }
  return admin
}

export async function searchUsersAction(query: string): Promise<{
  users: SearchUserRow[]
  error?: string
}> {
  const admin = await requireSuperAdmin()
  if (!admin) {
    return { users: [], error: '권한이 없습니다.' }
  }

  const filterQuery = getFilterQuery(query.trim())
  if (!filterQuery) {
    return { users: [] }
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('users')
    .select('id, nickname, phone_number, coin_balance, token_balance')
    .or(`nickname.ilike.%${filterQuery}%,phone_number.ilike.%${filterQuery}%`)
    .limit(10)

  if (error) {
    return { users: [], error: error.message }
  }

  return { users: (data ?? []) as SearchUserRow[] }
}

export async function grantRevokeAction(
  userId: string,
  type: GrantRevokeType,
  amount: number,
  reason: string
): Promise<ActionResult> {
  const admin = await requireSuperAdmin()
  if (!admin) {
    return { success: false, error: '권한이 없습니다.' }
  }

  const trimmedReason = reason.trim()
  if (!userId) {
    return { success: false, error: '대상 유저를 선택해 주세요.' }
  }
  if (!Number.isFinite(amount) || amount < 1 || !Number.isInteger(amount)) {
    return { success: false, error: '수량은 1 이상의 정수여야 합니다.' }
  }
  if (!trimmedReason) {
    return { success: false, error: '사유를 입력해 주세요.' }
  }

  const validTypes: GrantRevokeType[] = [
    'coin_grant',
    'coin_revoke',
    'token_grant',
    'token_revoke',
  ]
  if (!validTypes.includes(type)) {
    return { success: false, error: '유효하지 않은 처리 유형입니다.' }
  }

  const isCoin = type.startsWith('coin_')
  const isGrant = type.endsWith('_grant')
  const field = isCoin ? 'coin' : 'token'
  const delta = isGrant ? amount : -amount

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.rpc('admin_adjust_balance', {
    p_user_id: userId,
    p_field: field,
    p_delta: delta,
    p_reason: trimmedReason,
    p_admin_user_id: admin.id,
    p_action_type: type,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = (data ?? {}) as {
    success: boolean
    reason?: string
    new_balance?: number
    transaction_id?: string
  }

  if (!result.success) {
    const reasonMap: Record<string, string> = {
      insufficient_balance: '잔액이 부족합니다.',
      user_not_found: '유저를 찾을 수 없습니다.',
      invalid_field: '유효하지 않은 재화 유형입니다.',
      invalid_amount: '수량이 올바르지 않습니다.',
      invalid_reason: '사유를 입력해 주세요.',
    }
    return {
      success: false,
      error: reasonMap[result.reason ?? ''] ?? '처리에 실패했습니다.',
    }
  }

  revalidatePath('/coins')
  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)

  const labels: Record<GrantRevokeType, string> = {
    coin_grant: '코인 지급',
    coin_revoke: '코인 회수',
    token_grant: '토큰 지급',
    token_revoke: '토큰 회수',
  }

  return {
    success: true,
    message: `${labels[type]} ${amount.toLocaleString()}건이 처리되었습니다.`,
  }
}
