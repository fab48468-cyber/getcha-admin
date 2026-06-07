'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/auth'

type SendResult =
  | { success: true; sent: number; failed: number }
  | { success: false; error: string }

interface SendPushInput {
  title: string
  body: string
  target: 'all' | 'user'
  targetUserId?: string // target이 'user'일 때
  screen?: string // 탭 시 이동 화면 ('', 'gacha', 'box', 'notices')
}

// Expo Push API 호출 (100개씩 청크 발송)
async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<{ ok: number; fail: number; deadTokens: string[] }> {
  let ok = 0
  let fail = 0
  const deadTokens: string[] = []
  const CHUNK = 100

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK)
    const messages = chunk.map((to) => ({
      to,
      title,
      body,
      data,
      sound: 'default',
    }))

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      })
      const json = await res.json()
      // Expo는 각 메시지별 status를 배열로 반환
      if (Array.isArray(json?.data)) {
        for (let idx = 0; idx < json.data.length; idx++) {
          const item: any = json.data[idx]
          if (item.status === 'ok') {
            ok++
          } else {
            fail++
            if (
              item.status === 'error' &&
              item.details?.error === 'DeviceNotRegistered'
            ) {
              deadTokens.push(chunk[idx])
            }
          }
        }
      } else {
        fail += chunk.length
      }
    } catch {
      fail += chunk.length
    }
  }

  return { ok, fail, deadTokens }
}

export async function sendPushNotification(
  input: SendPushInput
): Promise<SendResult> {
  // 1. 관리자 인증
  const admin = await getAdminUser()
  if (!admin) {
    return { success: false, error: '권한이 없습니다.' }
  }

  // 2. 입력 검증
  if (!input.title.trim() || !input.body.trim()) {
    return { success: false, error: '제목과 내용을 입력해주세요.' }
  }
  if (input.target === 'user' && !input.targetUserId?.trim()) {
    return { success: false, error: '대상 유저 ID를 입력해주세요.' }
  }

  const supabase = createAdminClient()

  // 3. 대상 유저 ID 목록 결정
  let userIds: string[] = []
  if (input.target === 'user') {
    userIds = [input.targetUserId!.trim()]
  }

  // 4. 활성 푸시 토큰 조회
  let tokenQuery = supabase
    .from('push_tokens')
    .select('expo_token, user_id')
    .eq('is_active', true)

  if (input.target === 'user') {
    tokenQuery = tokenQuery.in('user_id', userIds)
  }

  const { data: tokenRows, error: tokenErr } = await tokenQuery
  if (tokenErr) {
    return { success: false, error: `토큰 조회 실패: ${tokenErr.message}` }
  }

  const tokens = (tokenRows ?? []).map((r) => r.expo_token)
  if (tokens.length === 0) {
    return { success: false, error: '발송 대상 토큰이 없습니다.' }
  }

  // 5. Expo Push 발송
  const data: Record<string, unknown> = {}
  if (input.screen) data.screen = input.screen

  const { ok, fail, deadTokens } = await sendExpoPush(
    tokens,
    input.title,
    input.body,
    data
  )

  if (deadTokens.length > 0) {
    const { error: deactivateErr } = await supabase
      .from('push_tokens')
      .update({ is_active: false })
      .in('expo_token', deadTokens)
    if (deactivateErr) {
      console.error('죽은 토큰 비활성화 실패:', deactivateErr.message)
    }
  }

  // 6. notifications 테이블에 기록 (앱 내 알림함에도 표시)
  //    대상 유저별로 INSERT
  const targetUserIds =
    input.target === 'user'
      ? userIds
      : Array.from(new Set((tokenRows ?? []).map((r) => r.user_id)))

  if (targetUserIds.length > 0) {
    const notifRows = targetUserIds.map((uid) => ({
      user_id: uid,
      notification_type: 'admin_message',
      title: input.title,
      body: input.body,
      is_read: false,
    }))
    await supabase.from('notifications').insert(notifRows)
  }

  return { success: true, sent: ok, failed: fail }
}
