import { createAdminClient } from '@/lib/supabase/admin'

type LogAdminActionInput = {
  adminUserId: string
  actionType: 'content_create' | 'content_update' | 'content_delete'
  targetType: string // 예: 'kuji_series'
  targetId?: string | null
  details?: Record<string, unknown>
}

export async function logAdminAction(input: LogAdminActionInput) {
  const adminClient = createAdminClient()
  const { error } = await adminClient.from('admin_actions').insert({
    action_type: input.actionType,
    admin_user_id: input.adminUserId,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    details: input.details ?? null,
  })
  if (error) {
    console.error('admin_actions 기록 실패:', error.message)
  }
}
