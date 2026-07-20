'use client'

import { useEffect, useRef, useState } from 'react'

const TARGET_WIDTH = 1440
const TARGET_HEIGHT = 1130
const TARGET_ASPECT = TARGET_WIDTH / TARGET_HEIGHT
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp'

type BannerImageFieldProps = {
  existingUrl?: string | null
  onCroppedChange: (blob: Blob | null) => void
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
    img.src = src
  })
}

/** 센터크롭 후 1440×1130 JPEG blob 생성 */
async function centerCropToBannerJpeg(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const srcW = img.naturalWidth
    const srcH = img.naturalHeight
    const srcAspect = srcW / srcH

    let sx = 0
    let sy = 0
    let sw = srcW
    let sh = srcH

    if (srcAspect > TARGET_ASPECT) {
      // 가로로 더 김 → 좌우 크롭
      sw = Math.round(srcH * TARGET_ASPECT)
      sx = Math.round((srcW - sw) / 2)
    } else if (srcAspect < TARGET_ASPECT) {
      // 세로로 더 김 → 상하 크롭
      sh = Math.round(srcW / TARGET_ASPECT)
      sy = Math.round((srcH - sh) / 2)
    }

    const canvas = document.createElement('canvas')
    canvas.width = TARGET_WIDTH
    canvas.height = TARGET_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('캔버스를 사용할 수 없습니다.')
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.9)
    })

    if (!blob) {
      throw new Error('이미지 변환에 실패했습니다.')
    }
    return blob
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export default function BannerImageField({
  existingUrl,
  onCroppedChange,
}: BannerImageFieldProps) {
  const [previewUrl, setPreviewUrl] = useState(existingUrl ?? '')
  const [isConverted, setIsConverted] = useState(false)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const previewObjectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current)
      }
    }
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')

    if (!ACCEPT.split(',').includes(file.type)) {
      setError('JPEG, PNG, WebP 이미지만 선택할 수 있습니다.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('이미지 용량은 10MB 이하여야 합니다.')
      return
    }

    setProcessing(true)
    try {
      const blob = await centerCropToBannerJpeg(file)
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current)
      }
      const nextUrl = URL.createObjectURL(blob)
      previewObjectUrlRef.current = nextUrl
      setPreviewUrl(nextUrl)
      setIsConverted(true)
      onCroppedChange(blob)
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 처리에 실패했습니다.')
      onCroppedChange(null)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <label
        style={{
          display: 'block',
          color: '#1A1A1A',
          fontSize: 13,
          fontWeight: 800,
          marginBottom: 6,
        }}
      >
        이미지 {existingUrl ? '(미선택 시 기존 유지)' : '(필수)'}
      </label>

      <input
        type="file"
        accept={ACCEPT}
        onChange={handleFileChange}
        disabled={processing}
        style={{ fontSize: 14 }}
      />

      {processing && (
        <p style={{ color: '#6B7280', fontSize: 13, marginTop: 8 }}>
          센터크롭·리사이즈 중...
        </p>
      )}

      {error && (
        <p style={{ color: '#DC2626', fontSize: 13, fontWeight: 700, marginTop: 8 }}>
          {error}
        </p>
      )}

      {previewUrl && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              aspectRatio: `${TARGET_WIDTH} / ${TARGET_HEIGHT}`,
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid #E0DDD8',
              backgroundColor: '#F5F5F5',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="배너 미리보기"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
          {isConverted && (
            <p style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>
              1440×1130 (1.27:1) 자동 변환됨
            </p>
          )}
        </div>
      )}
    </div>
  )
}
