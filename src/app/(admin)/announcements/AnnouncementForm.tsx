'use client'

import { useActionState, useTransition } from 'react'
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  updateAnnouncementAction,
} from './actions'
import { toDatetimeLocalValue, type AnnouncementCategory } from './announcement-utils'

const initialState: { error: string; success?: string } = { error: '' }

const inputStyle = {
  width: '100%',
  border: '1px solid #E0DDD8',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
} as const

const labelStyle = {
  display: 'block',
  color: '#1A1A1A',
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 6,
} as const

type AnnouncementFormProps = {
  mode: 'create' | 'edit'
  announcementId?: string
  initial?: {
    title: string
    content: string
    category: AnnouncementCategory
    is_pinned: boolean
    published_at: string | null
    expires_at: string | null
  }
}

export default function AnnouncementForm({
  mode,
  announcementId,
  initial,
}: AnnouncementFormProps) {
  const action =
    mode === 'create'
      ? createAnnouncementAction
      : updateAnnouncementAction.bind(null, announcementId!)

  const [state, formAction, isPending] = useActionState<
    { error: string; success?: string },
    FormData
  >(action, initialState)
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleDelete() {
    if (!announcementId) return
    if (!window.confirm('이 공지를 삭제할까요? 삭제 후에는 복구할 수 없습니다.')) {
      return
    }

    startDeleteTransition(async () => {
      await deleteAnnouncementAction(announcementId)
    })
  }

  return (
    <div>
      <form action={formAction}>
        {state?.error && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {state.error}
          </div>
        )}

        {state?.success && (
          <div
            style={{
              backgroundColor: '#EEFBD0',
              color: '#5B8B1E',
              border: '1px solid #BBF7D0',
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {state.success}
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>제목</label>
            <input
              name="title"
              required
              defaultValue={initial?.title ?? ''}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>내용</label>
            <textarea
              name="content"
              rows={8}
              required
              defaultValue={initial?.content ?? ''}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={labelStyle}>카테고리</label>
            <select
              name="category"
              defaultValue={initial?.category ?? 'general'}
              style={inputStyle}
            >
              <option value="general">일반</option>
              <option value="event">이벤트</option>
              <option value="maintenance">점검</option>
              <option value="update">업데이트</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#1A1A1A',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                name="is_pinned"
                defaultChecked={initial?.is_pinned ?? false}
              />
              상단 고정
            </label>
          </div>

          <div>
            <label style={labelStyle}>노출 시작일</label>
            <input
              name="published_at"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(initial?.published_at ?? null)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>노출 종료일</label>
            <input
              name="expires_at"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(initial?.expires_at ?? null)}
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 20,
          }}
        >
          <button
            type="submit"
            disabled={isPending || isDeleting}
            style={{
              backgroundColor: '#8CC63F',
              color: '#1A1A1A',
              border: 'none',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 900,
              cursor: isPending || isDeleting ? 'not-allowed' : 'pointer',
              opacity: isPending || isDeleting ? 0.6 : 1,
            }}
          >
            {isPending ? '저장 중...' : '저장'}
          </button>

          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending || isDeleting}
              style={{
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                border: '1px solid #FCA5A5',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 900,
                cursor: isPending || isDeleting ? 'not-allowed' : 'pointer',
                opacity: isPending || isDeleting ? 0.6 : 1,
              }}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
