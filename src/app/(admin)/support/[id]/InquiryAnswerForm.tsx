'use client'

import { useState, useTransition } from 'react'
import {
  assignInquiryAction,
  unassignInquiryAction,
  updateInquiryAction,
} from '../actions'

const STATUS_OPTIONS = [
  { value: 'pending', label: '대기중' },
  { value: 'in_progress', label: '처리중' },
  { value: 'answered', label: '완료' },
  { value: 'closed', label: '종료' },
]

type InquiryAnswerFormProps = {
  inquiry: {
    id: string
    status: string
    answer_content: string | null
    assigned_to: string | null
    updated_at: string
  }
  assigneeDisplay: string | null
  currentAdminId: string
  currentAdminRole: string
}

export default function InquiryAnswerForm({
  inquiry,
  assigneeDisplay,
  currentAdminId,
  currentAdminRole,
}: InquiryAnswerFormProps) {
  const [status, setStatus] = useState(inquiry.status)
  const [answer, setAnswer] = useState(inquiry.answer_content ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [assignMessage, setAssignMessage] = useState('')
  const [isAssignPending, startAssignTransition] = useTransition()

  const isAssigned = Boolean(inquiry.assigned_to)
  const canUnassign =
    isAssigned &&
    (inquiry.assigned_to === currentAdminId || currentAdminRole === 'super_admin')

  const handleSave = async () => {
    setSaving(true)
    const formData = new FormData()
    formData.set('inquiryId', inquiry.id)
    formData.set('status', status)
    formData.set('answer_content', answer)
    // PostgREST가 준 updated_at 문자열을 재직렬화 없이 그대로 전달 (timestamptz 정밀도 보존)
    formData.set('expected_updated_at', inquiry.updated_at)
    const result = await updateInquiryAction(formData)
    setSaving(false)
    setMessage(result?.error ?? '저장됐습니다.')
  }

  function handleAssign() {
    setAssignMessage('')
    startAssignTransition(async () => {
      const result = await assignInquiryAction(inquiry.id)
      if (result.error) {
        setAssignMessage(result.error)
      }
    })
  }

  function handleUnassign() {
    setAssignMessage('')
    startAssignTransition(async () => {
      const result = await unassignInquiryAction(inquiry.id)
      if (result.error) {
        setAssignMessage(result.error)
      }
    })
  }

  return (
    <>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          padding: 24,
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>담당자</h2>
        {!isAssigned ? (
          <button
            type="button"
            onClick={handleAssign}
            disabled={isAssignPending}
            style={{
              backgroundColor: '#8CC63F',
              color: '#1A1A1A',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              fontWeight: 800,
              cursor: isAssignPending ? 'not-allowed' : 'pointer',
              opacity: isAssignPending ? 0.6 : 1,
            }}
          >
            {isAssignPending ? '처리 중...' : '내가 맡기'}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 999,
                padding: '6px 12px',
                backgroundColor: '#EEF0FF',
                color: '#8B5CF6',
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              {assigneeDisplay ?? inquiry.assigned_to?.slice(0, 8) ?? '-'}
            </span>
            {canUnassign && (
              <button
                type="button"
                onClick={handleUnassign}
                disabled={isAssignPending}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#6B7280',
                  border: '1px solid #E0DDD8',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontWeight: 800,
                  cursor: isAssignPending ? 'not-allowed' : 'pointer',
                  opacity: isAssignPending ? 0.6 : 1,
                }}
              >
                {isAssignPending ? '처리 중...' : '배정 해제'}
              </button>
            )}
          </div>
        )}
        {assignMessage && (
          <div style={{ marginTop: 12, color: '#EF4444', fontWeight: 700, fontSize: 13 }}>
            {assignMessage}
          </div>
        )}
      </div>

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
        {message && (
          <div
            style={{
              marginBottom: 12,
              color: message === '저장됐습니다.' ? '#8CC63F' : '#EF4444',
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}
        <input type="hidden" name="expected_updated_at" value={inquiry.updated_at} readOnly />
        <button onClick={handleSave} disabled={saving}
          style={{ backgroundColor: '#8CC63F', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 800, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </>
  )
}
