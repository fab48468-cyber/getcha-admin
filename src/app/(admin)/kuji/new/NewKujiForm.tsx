'use client'

import { useActionState } from 'react'
import { createKujiSeriesAction } from '../actions'

const initialState = { error: '' }

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

export default function NewKujiForm() {
  const [state, formAction, isPending] = useActionState(
    createKujiSeriesAction,
    initialState
  )

  return (
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

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={labelStyle}>시리즈명</label>
          <input name="name" required style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>설명</label>
          <textarea
            name="description"
            rows={5}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={labelStyle}>썸네일 URL</label>
          <input name="thumbnail_url" type="text" style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>티켓 코인 가격</label>
          <input
            name="coin_price_per_ticket"
            type="number"
            min={0}
            defaultValue={100}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>총 티켓 수</label>
          <input
            name="total_tickets"
            type="number"
            min={1}
            defaultValue={50}
            required
            style={inputStyle}
          />
          <p style={{ color: '#6B7280', fontSize: 12, margin: '6px 0 0' }}>
            티켓 수는 나중에 상품 등록 후 상세 페이지에서 실제 티켓을 생성해야 해요
          </p>
        </div>

        <div>
          <label style={labelStyle}>상태</label>
          <select name="status" defaultValue="closed" style={inputStyle}>
            <option value="active">active</option>
            <option value="closed">closed</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          backgroundColor: '#8CC63F',
          color: '#1A1A1A',
          border: 'none',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 14,
          fontWeight: 900,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.6 : 1,
          marginTop: 20,
        }}
      >
        {isPending ? '저장 중...' : '저장'}
      </button>
    </form>
  )
}
