'use client'

import { useState, useRef } from 'react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

type UploadAction = (formData: FormData) => Promise<{ url?: string; error?: string }>

interface ImageCropUploadProps {
  // 업로드 완료 시 URL을 받는 콜백
  onUploaded: (url: string) => void
  // 실제 업로드를 수행하는 Server Action
  uploadAction: UploadAction
  // 크롭 비율. 미지정 시 자유비율
  aspect?: number
  // 리사이즈 최대 크기 (기본 800px)
  maxSize?: number
}

function centerInitialCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect?: number
): Crop {
  if (aspect) {
    return centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
      mediaWidth,
      mediaHeight
    )
  }
  // 자유비율: 비율 강제 없이 중앙 90% 박스로 시작
  return centerCrop(
    { unit: '%', x: 0, y: 0, width: 90, height: 90 },
    mediaWidth,
    mediaHeight
  )
}

export default function ImageCropUpload({
  onUploaded,
  uploadAction,
  aspect,
  maxSize = 800,
}: ImageCropUploadProps) {
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedUrl('')
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setImgSrc(reader.result?.toString() ?? '')
    })
    reader.readAsDataURL(file)
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerInitialCrop(width, height, aspect))
  }

  const getCroppedBlob = async (): Promise<Blob | null> => {
    const image = imgRef.current
    if (!image || !completedCrop) return null

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const cropWidth = completedCrop.width * scaleX
    const cropHeight = completedCrop.height * scaleY

    // 리사이즈: 긴 변이 maxSize를 넘지 않도록
    let targetW = cropWidth
    let targetH = cropHeight
    if (Math.max(cropWidth, cropHeight) > maxSize) {
      const ratio = maxSize / Math.max(cropWidth, cropHeight)
      targetW = cropWidth * ratio
      targetH = cropHeight * ratio
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      cropWidth,
      cropHeight,
      0,
      0,
      targetW,
      targetH
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
    })
  }

  const handleUpload = async () => {
    const blob = await getCroppedBlob()
    if (!blob) {
      alert('크롭 영역을 선택해주세요.')
      return
    }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', new File([blob], `${Date.now()}.jpg`, { type: 'image/jpeg' }))
    const result = await uploadAction(fd)
    setUploading(false)
    if (result.error) {
      alert('업로드 실패: ' + result.error)
      return
    }
    if (result.url) {
      setUploadedUrl(result.url)
      onUploaded(result.url)
      setImgSrc('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ fontSize: 13 }}
      />

      {imgSrc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ maxWidth: 400, border: '1px solid #E0DDD8', borderRadius: 8, overflow: 'hidden' }}>
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imgSrc}
                alt="크롭할 이미지"
                onLoad={handleImageLoad}
                style={{ maxWidth: '100%' }}
              />
            </ReactCrop>
          </div>
          {completedCrop && imgRef.current ? (
            <span style={{ fontSize: 12, color: '#6B6B6B', fontWeight: 700 }}>
              크롭 크기: {Math.round(completedCrop.width * (imgRef.current.naturalWidth / imgRef.current.width))}
              {' × '}
              {Math.round(completedCrop.height * (imgRef.current.naturalHeight / imgRef.current.height))}
              px
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            style={{
              backgroundColor: '#8B5CF6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 800,
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1,
              width: 'fit-content',
            }}
          >
            {uploading ? '업로드 중...' : '크롭 후 업로드'}
          </button>
        </div>
      )}

      {uploadedUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uploadedUrl}
            alt="업로드 완료"
            style={{
              maxWidth: 160,
              maxHeight: 120,
              objectFit: 'contain',
              borderRadius: 10,
              border: '1px solid #E0DDD8',
              backgroundColor: '#F5F3F0',
            }}
          />
          <span style={{ fontSize: 12, color: '#5B8B1E', fontWeight: 700 }}>
            ✓ 업로드 완료
          </span>
        </div>
      )}
    </div>
  )
}
