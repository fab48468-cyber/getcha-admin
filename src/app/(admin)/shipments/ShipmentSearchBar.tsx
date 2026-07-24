'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function ShipmentSearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const params = new URLSearchParams(searchParams.toString())
    const trimmedQuery = query.trim()

    if (trimmedQuery) {
      params.set('q', trimmedQuery)
    } else {
      params.delete('q')
    }
    params.delete('page')

    const nextQuery = params.toString()
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E0DDD8',
        padding: 14,
        marginBottom: 16,
      }}
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="수령인 · 전화번호 · 운송장 · 닉네임 검색"
        style={{
          flex: 1,
          border: '1px solid #E0DDD8',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 14,
          outline: 'none',
        }}
      />
      <button
        type="submit"
        style={{
          backgroundColor: '#8CC63F',
          color: '#1A1A1A',
          border: 'none',
          borderRadius: 10,
          padding: '0 18px',
          fontSize: 14,
          fontWeight: 900,
          cursor: 'pointer',
        }}
      >
        검색
      </button>
    </form>
  )
}
