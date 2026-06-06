'use client'

import { useState } from 'react'
import { sendPushNotification } from './actions'

const SCREEN_OPTIONS = [
  { value: '', label: '없음 (홈)' },
  { value: 'gacha', label: '가챠/쿠지샵' },
  { value: 'box', label: '박스 (배송)' },
  { value: 'notices', label: '공지/마이' },
] as const

export default function PushNotificationForm() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState<'all' | 'user'>('all')
  const [targetUserId, setTargetUserId] = useState('')
  const [screen, setScreen] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #E0DDD8',
    fontSize: 14,
    marginTop: 6,
  } as const

  const labelStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: '#2D2D2D',
  } as const

  async function handleSend() {
    setResult(null)

    if (!title.trim() || !body.trim()) {
      setResult('⚠️ 제목과 내용을 입력해주세요.')
      return
    }
    if (target === 'user' && !targetUserId.trim()) {
      setResult('⚠️ 대상 유저 ID를 입력해주세요.')
      return
    }

    const confirmMsg =
      target === 'all'
        ? '전체 유저에게 푸시를 발송할까요?'
        : '해당 유저에게 푸시를 발송할까요?'
    if (!window.confirm(confirmMsg)) return

    setSending(true)
    try {
      const res = await sendPushNotification({
        title: title.trim(),
        body: body.trim(),
        target,
        targetUserId: target === 'user' ? targetUserId.trim() : undefined,
        screen: screen || undefined,
      })

      if (res.success) {
        setResult(`✅ 발송 완료 — 성공 ${res.sent}건, 실패 ${res.failed}건`)
        setTitle('')
        setBody('')
        setTargetUserId('')
      } else {
        setResult(`❌ ${res.error}`)
      }
    } catch (e) {
      setResult(`❌ 발송 중 오류: ${e instanceof Error ? e.message : '알 수 없음'}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <label style={labelStyle}>제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="알림 제목"
          style={inputStyle}
          maxLength={50}
        />
      </div>

      <div>
        <label style={labelStyle}>내용</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="알림 내용"
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          maxLength={200}
        />
      </div>

      <div>
        <label style={labelStyle}>발송 대상</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {(['all', 'user'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: target === t ? '2px solid #8CC63F' : '1px solid #E0DDD8',
                backgroundColor: target === t ? '#EEF9D8' : '#FFFFFF',
                fontWeight: target === t ? 800 : 400,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {t === 'all' ? '전체 유저' : '특정 유저'}
            </button>
          ))}
        </div>
      </div>

      {target === 'user' && (
        <div>
          <label style={labelStyle}>대상 유저 ID (UUID)</label>
          <input
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="user_id (예: b7d92896-...)"
            style={inputStyle}
          />
        </div>
      )}

      <div>
        <label style={labelStyle}>탭하면 이동할 화면</label>
        <select
          value={screen}
          onChange={(e) => setScreen(e.target.value)}
          style={inputStyle}
        >
          {SCREEN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        style={{
          padding: '12px 16px',
          borderRadius: 8,
          border: 'none',
          backgroundColor: sending ? '#9E9E9E' : '#8CC63F',
          color: '#1A1A1A',
          fontWeight: 800,
          fontSize: 15,
          cursor: sending ? 'default' : 'pointer',
          marginTop: 4,
        }}
      >
        {sending ? '발송 중...' : '푸시 발송'}
      </button>

      {result && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: '#F5F2ED',
            border: '1px solid #E0DDD8',
            fontSize: 14,
            color: '#2D2D2D',
          }}
        >
          {result}
        </div>
      )}
    </div>
  )
}
