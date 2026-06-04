'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type InquiryStatus = 'pending' | 'in_progress' | 'resolved' | 'closed'

const VALID_STATUSES = new Set<InquiryStatus>([
  'pending',
  'in_progress',
  'resolved',
  'closed',
])

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function getStatus(formData: FormData) {
  const status = getString(formData, 'status') as InquiryStatus
  return VALID_STATUSES.has(status) ? status : null
}

export async function updateInquiryAction(formData: FormData) {
  const inquiryId = getString(formData, 'inquiryId')
  const status = getStatus(formData)
  const answerContent = getString(formData, 'answer_content')

  if (!inquiryId) {
    return { error: '문의 ID가 없습니다.' }
  }

  if (!status) {
    return { error: '변경할 문의 상태를 선택해 주세요.' }
  }

  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  const adminClient = createAdminClient()
  const { data: currentInquiry, error: currentError } = await adminClient
    .from('support_inquiries')
    .select('answered_at')
    .eq('id', inquiryId)
    .single()

  if (currentError || !currentInquiry) {
    return { error: currentError?.message ?? '문의 정보를 찾을 수 없습니다.' }
  }

  const updatePayload: Record<string, string | null> = {
    status,
    answer_content: answerContent || null,
    answered_by: admin.id,
    updated_at: new Date().toISOString(),
  }

  if (!currentInquiry.answered_at && answerContent) {
    updatePayload.answered_at = new Date().toISOString()
  }

  const { error: updateError } = await adminClient
    .from('support_inquiries')
    .update(updatePayload)
    .eq('id', inquiryId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/support')
  revalidatePath(`/support/${inquiryId}`)
  return { error: undefined }
}
