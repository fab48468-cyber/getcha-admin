'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type InquiryStatus = 'pending' | 'in_progress' | 'answered' | 'closed'

const VALID_STATUSES = new Set<InquiryStatus>([
  'pending',
  'in_progress',
  'answered',
  'closed',
])

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function getStatus(formData: FormData) {
  const status = getString(formData, 'status') as InquiryStatus
  return VALID_STATUSES.has(status) ? status : null
}

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<{ deadTokens: string[] }> {
  const deadTokens: string[] = []
  const CHUNK = 100
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK)
    const messages = chunk.map((to) => ({ to, title, body, data, sound: 'default' }))
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      })
      const json = await res.json()
      if (Array.isArray(json?.data)) {
        for (let idx = 0; idx < json.data.length; idx++) {
          const item: any = json.data[idx]
          if (item.status === 'error' && item.details?.error === 'DeviceNotRegistered') {
            deadTokens.push(chunk[idx])
          }
        }
      }
    } catch {
      // 푸시 실패는 무시 (알림함 INSERT는 별개로 진행)
    }
  }
  return { deadTokens }
}

export async function assignInquiryAction(inquiryId: string) {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  if (!inquiryId) {
    return { error: '문의 ID가 없습니다.' }
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('support_inquiries')
    .update({ assigned_to: admin.id })
    .eq('id', inquiryId)
    .is('assigned_to', null)
    .select('id')

  if (error) {
    return { error: error.message }
  }

  if (!data || data.length === 0) {
    return { error: '이미 다른 관리자가 담당 중입니다. 새로고침해 주세요.' }
  }

  revalidatePath('/support')
  revalidatePath(`/support/${inquiryId}`)
  return { error: undefined }
}

export async function unassignInquiryAction(inquiryId: string) {
  const admin = await getAdminUser()
  if (!admin) {
    return { error: '관리자 인증이 필요합니다.' }
  }

  if (!inquiryId) {
    return { error: '문의 ID가 없습니다.' }
  }

  const adminClient = createAdminClient()
  let query = adminClient
    .from('support_inquiries')
    .update({ assigned_to: null })
    .eq('id', inquiryId)

  if (admin.role !== 'super_admin') {
    query = query.eq('assigned_to', admin.id)
  }

  const { data, error } = await query.select('id')

  if (error) {
    return { error: error.message }
  }

  if (!data || data.length === 0) {
    return { error: '배정을 해제할 권한이 없거나 이미 변경되었습니다. 새로고침해 주세요.' }
  }

  revalidatePath('/support')
  revalidatePath(`/support/${inquiryId}`)
  return { error: undefined }
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
    .select('answered_at, user_id, assigned_to')
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

  if (!currentInquiry.assigned_to) {
    updatePayload.assigned_to = admin.id
  }

  const { error: updateError } = await adminClient
    .from('support_inquiries')
    .update(updatePayload)
    .eq('id', inquiryId)

  if (updateError) {
    return { error: updateError.message }
  }

  const isNewAnswer = !currentInquiry.answered_at && answerContent
  if (isNewAnswer && currentInquiry.user_id) {
    try {
      const inquirerUserId = currentInquiry.user_id
      const notifBody =
        answerContent.length > 60 ? answerContent.slice(0, 60) + '…' : answerContent

      await adminClient.from('notifications').insert({
        user_id: inquirerUserId,
        notification_type: 'support_reply',
        title: '문의하신 내용에 답변이 등록되었어요',
        body: notifBody,
        is_read: false,
        screen: 'support',
      })

      const { data: tokenRows } = await adminClient
        .from('push_tokens')
        .select('expo_token')
        .eq('user_id', inquirerUserId)
        .eq('is_active', true)

      const tokens = (tokenRows ?? []).map((r) => r.expo_token)
      if (tokens.length > 0) {
        const { deadTokens } = await sendExpoPush(
          tokens,
          '문의 답변 도착',
          '문의하신 내용에 답변이 등록되었어요. 확인해보세요!',
          { screen: 'support' }
        )
        if (deadTokens.length > 0) {
          await adminClient
            .from('push_tokens')
            .update({ is_active: false })
            .in('expo_token', deadTokens)
        }
      }
    } catch (err) {
      console.error('문의 답변 알림/푸시 발송 실패:', err)
    }
  }

  revalidatePath('/support')
  revalidatePath(`/support/${inquiryId}`)
  return { error: undefined }
}
