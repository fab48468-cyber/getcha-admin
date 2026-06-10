'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionState = {
  error: string
  success?: string
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

async function requireSuperAdmin() {
  const admin = await getAdminUser()
  if (!admin || admin.role !== 'super_admin') {
    return null
  }
  return admin
}

async function insertAdminAction({
  actionType,
  targetUserId,
  adminUserId,
  reason,
}: {
  actionType: 'suspend_user' | 'activate_user' | 'remove_penalty'
  targetUserId: string
  adminUserId: string
  reason?: string
}) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('admin_actions').insert({
    action_type: actionType,
    target_user_id: targetUserId,
    admin_user_id: adminUserId,
    details: { reason: reason || null },
  })

  return error
}

export async function removeUserPenaltyAction(
  userId: string,
  _prevState: ActionState,
  _formData: FormData
) {
  void _prevState
  void _formData

  const admin = await requireSuperAdmin()
  if (!admin) {
    return { error: '권한이 없습니다.' }
  }

  const adminClient = createAdminClient()
  const { error: updateError } = await adminClient
    .from('users')
    .update({ penalty_until: null })
    .eq('id', userId)

  if (updateError) {
    return { error: updateError.message }
  }

  const logError = await insertAdminAction({
    actionType: 'remove_penalty',
    targetUserId: userId,
    adminUserId: admin.id,
  })

  if (logError) {
    return { error: logError.message }
  }

  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
  return { error: '', success: '패널티가 해제되었습니다.' }
}

export async function updateUserStatusAction(
  userId: string,
  _prevState: ActionState,
  formData: FormData
) {
  const nextStatus = getString(formData, 'account_status')
  const reason = getString(formData, 'suspended_reason')

  if (nextStatus !== 'active' && nextStatus !== 'suspended') {
    return { error: '변경할 계정 상태를 선택해 주세요.' }
  }

  if (nextStatus === 'suspended' && !reason) {
    return { error: '정지 사유를 입력해 주세요.' }
  }

  const admin = await requireSuperAdmin()
  if (!admin) {
    return { error: '권한이 없습니다.' }
  }

  const isActivating = nextStatus === 'active'
  const adminClient = createAdminClient()
  const { error: updateError } = await adminClient
    .from('users')
    .update({
      is_active: isActivating,
      suspended_reason: isActivating ? null : reason,
    })
    .eq('id', userId)

  if (updateError) {
    return { error: updateError.message }
  }

  const logError = await insertAdminAction({
    actionType: isActivating ? 'activate_user' : 'suspend_user',
    targetUserId: userId,
    adminUserId: admin.id,
    reason: isActivating ? undefined : reason,
  })

  if (logError) {
    return { error: logError.message }
  }

  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
  return { error: '', success: '계정 상태가 저장되었습니다.' }
}
