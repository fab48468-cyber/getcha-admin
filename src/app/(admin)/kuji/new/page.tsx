import Link from 'next/link'
import NewKujiForm from './NewKujiForm'

export default function NewKujiPage() {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            color: '#1A1A1A',
            fontSize: 24,
            fontWeight: 900,
            margin: 0,
          }}
        >
          신규 쿠지 등록
        </h2>
        <Link
          href="/kuji"
          style={{
            color: '#8B5CF6',
            fontSize: 14,
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          목록으로
        </Link>
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          padding: 20,
          maxWidth: 720,
        }}
      >
        <NewKujiForm />
      </div>
    </div>
  )
}
