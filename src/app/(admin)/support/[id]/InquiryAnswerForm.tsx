'use client'

import { useState } from 'react'
import { updateInquiryAction } from '../actions'

const STATUS_OPTIONS = [
  { value: 'pending', label: '대기중' },
  { value: 'in_progress', label: '처리중' },
  { value: 'resolved', label: '완료' },
  { value: 'closed', label: '종료' },
]

export default function InquiryAnswerForm({ inquiry }: { inquiry: any }) {
  const [status, setStatus] = useState(inquiry.status)
  const [answer, setAnswer] = useState(inquiry.answer_content ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setSaving(true)
    const formData = new FormData()
    formData.set('inquiryId', inquiry.id)
    formData.set('status', status)
    formData.set('answer_content', answer)
    const result = await updateInquiryAction(formData)
    setSaving(false)
    setMessage(result?.error ?? '저장됐습니다.')
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E0DDD8', padding: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>답변 작성</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'block' }}>상태 변경</label>
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E0DDD8', fontSize: 14 }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'block' }}>답변 내용</label>
        <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={6}
          placeholder="답변을 입력하세요"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E0DDD8', fontSize: 14, resize: 'vertical' }} />
      </div>
      {message && <div style={{ marginBottom: 12, color: '#8CC63F', fontWeight: 700 }}>{message}</div>}
      <button onClick={handleSave} disabled={saving}
        style={{ backgroundColor: '#8CC63F', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}
