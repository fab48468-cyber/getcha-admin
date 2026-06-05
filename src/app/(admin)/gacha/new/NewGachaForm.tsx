'use client'

import { useActionState, useState } from 'react'
import { createGachaSeriesAction } from '../actions'
import { uploadGachaThumbnailAction } from './uploadAction'

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

export default function NewGachaForm() {
  const [state, formAction, isPending] = useActionState(
    createGachaSeriesAction,
    initialState
  )
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string>('')
  const [thumbUrl, setThumbUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbFile(file)
    setThumbPreview(URL.createObjectURL(file))
  }

  const handleThumbUpload = async () => {
    if (!thumbFile) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', thumbFile)
    const result = await uploadGachaThumbnailAction(fd)
    setUploading(false)
    if (result.error) {
      alert('업로드 실패: ' + result.error)
      return
    }
    setThumbUrl(result.url!)
  }

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
          <label style={labelStyle}>썸네일 이미지</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {thumbPreview ? (
              <img
                src={thumbPreview}
                alt="미리보기"
                style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 10, border: '1px solid #E0DDD8' }}
              />
            ) : null}
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbChange}
              style={{ fontSize: 13 }}
            />
            {thumbFile && !thumbUrl && (
              <button
                type="button"
                onClick={handleThumbUpload}
                disabled={uploading}
                style={{
                  backgroundColor: '#8B5CF6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                  width: 'fit-content',
                }}
              >
                {uploading ? '업로드 중...' : '업로드'}
              </button>
            )}
            {thumbUrl && (
              <span style={{ fontSize: 12, color: '#5B8B1E', fontWeight: 700 }}>
                ✓ 업로드 완료
              </span>
            )}
            <input
              name="thumbnail_url"
              type="hidden"
              value={thumbUrl}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>뽑기 코인 가격</label>
            <input
              name="coin_price_per_pull"
              type="number"
              min={0}
              defaultValue={100}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>최대 동시 참여자 수</label>
            <input
              name="max_concurrent_users"
              type="number"
              min={1}
              defaultValue={10}
              style={inputStyle}
            />
          </div>
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
