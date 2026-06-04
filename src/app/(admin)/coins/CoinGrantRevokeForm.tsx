'use client'

import { useState, useTransition } from 'react'
import {
  grantRevokeAction,
  searchUsersAction,
  type GrantRevokeType,
  type SearchUserRow,
} from './actions'

const GRANT_REVOKE_OPTIONS: { value: GrantRevokeType; label: string }[] = [
  { value: 'coin_grant', label: '코인 지급' },
  { value: 'coin_revoke', label: '코인 회수' },
  { value: 'token_grant', label: '토큰 지급' },
  { value: 'token_revoke', label: '토큰 회수' },
]

export default function CoinGrantRevokeForm() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUserRow[]>([])
  const [searchError, setSearchError] = useState('')
  const [selectedUser, setSelectedUser] = useState<SearchUserRow | null>(null)
  const [type, setType] = useState<GrantRevokeType>('coin_grant')
  const [amount, setAmount] = useState('1')
  const [reason, setReason] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSearching, startSearchTransition] = useTransition()
  const [isSubmitting, startSubmitTransition] = useTransition()

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearchError('')
    setFormMessage('')
    setFormError('')

    startSearchTransition(async () => {
      const { users, error } = await searchUsersAction(searchQuery)
      if (error) {
        setSearchError(error)
        setSearchResults([])
        return
      }
      setSearchResults(users)
      if (users.length === 0) {
        setSearchError('검색 결과가 없습니다.')
      }
    })
  }

  function handleSelectUser(user: SearchUserRow) {
    setSelectedUser(user)
    setFormMessage('')
    setFormError('')
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedUser) {
      setFormError('유저를 선택해 주세요.')
      return
    }

    const parsedAmount = Number(amount)
    setFormMessage('')
    setFormError('')

    startSubmitTransition(async () => {
      const result = await grantRevokeAction(
        selectedUser.id,
        type,
        parsedAmount,
        reason
      )

      if (!result.success) {
        setFormError(result.error ?? '처리에 실패했습니다.')
        return
      }

      setFormMessage(result.message ?? '처리되었습니다.')
      setReason('')
      setAmount('1')

      const { users } = await searchUsersAction(
        selectedUser.nickname ?? selectedUser.phone_number ?? ''
      )
      const updated = users.find((user) => user.id === selectedUser.id)
      if (updated) {
        setSelectedUser(updated)
        setSearchResults((prev) =>
          prev.map((user) => (user.id === updated.id ? updated : user))
        )
      } else {
        setSelectedUser({
          ...selectedUser,
          coin_balance:
            type === 'coin_grant'
              ? (selectedUser.coin_balance ?? 0) + parsedAmount
              : type === 'coin_revoke'
                ? (selectedUser.coin_balance ?? 0) - parsedAmount
                : selectedUser.coin_balance,
          token_balance:
            type === 'token_grant'
              ? (selectedUser.token_balance ?? 0) + parsedAmount
              : type === 'token_revoke'
                ? (selectedUser.token_balance ?? 0) - parsedAmount
                : selectedUser.token_balance,
        })
      }
    })
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E0DDD8',
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h3
        style={{
          color: '#1A1A1A',
          fontSize: 16,
          fontWeight: 900,
          margin: '0 0 16px',
        }}
      >
        유저 검색 · 지급/회수
      </h3>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="닉네임 또는 전화번호로 검색"
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
          disabled={isSearching}
          style={{
            backgroundColor: '#8CC63F',
            color: '#1A1A1A',
            border: 'none',
            borderRadius: 10,
            padding: '0 18px',
            fontSize: 14,
            fontWeight: 900,
            cursor: isSearching ? 'wait' : 'pointer',
            opacity: isSearching ? 0.7 : 1,
          }}
        >
          {isSearching ? '검색 중…' : '검색'}
        </button>
      </form>

      {searchError ? (
        <p style={{ color: '#DC2626', fontSize: 13, margin: '0 0 12px' }}>{searchError}</p>
      ) : null}

      {searchResults.length > 0 ? (
        <div
          style={{
            border: '1px solid #E0DDD8',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          {searchResults.map((user) => {
            const selected = selectedUser?.id === user.id
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectUser(user)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  border: 'none',
                  borderBottom: '1px solid #F0EEEA',
                  backgroundColor: selected ? '#EEFBD0' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <span style={{ fontWeight: 800, color: '#1A1A1A' }}>
                  {user.nickname || '(닉네임 없음)'}
                </span>
                <span style={{ color: '#6B7280', marginLeft: 8 }}>
                  {user.phone_number || '-'}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {selectedUser ? (
        <div
          style={{
            backgroundColor: '#F9F9F9',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
            fontSize: 14,
            color: '#1A1A1A',
          }}
        >
          <strong>{selectedUser.nickname || '(닉네임 없음)'}</strong>
          <span style={{ color: '#6B7280', marginLeft: 8 }}>
            코인: {(selectedUser.coin_balance ?? 0).toLocaleString()} · 토큰:{' '}
            {(selectedUser.token_balance ?? 0).toLocaleString()}
          </span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            <span style={{ color: '#6B7280', fontWeight: 700 }}>처리 유형</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as GrantRevokeType)}
              style={{
                border: '1px solid #E0DDD8',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
              }}
            >
              {GRANT_REVOKE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            <span style={{ color: '#6B7280', fontWeight: 700 }}>수량</span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              style={{
                border: '1px solid #E0DDD8',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
              }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: 13,
              gridColumn: '1 / -1',
            }}
          >
            <span style={{ color: '#6B7280', fontWeight: 700 }}>사유 (필수)</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="지급/회수 사유를 입력하세요"
              required
              style={{
                border: '1px solid #E0DDD8',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
              }}
            />
          </label>
        </div>

        {formError ? (
          <p style={{ color: '#DC2626', fontSize: 13, margin: '0 0 10px' }}>{formError}</p>
        ) : null}
        {formMessage ? (
          <p style={{ color: '#5B8B1E', fontSize: 13, margin: '0 0 10px' }}>{formMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !selectedUser}
          style={{
            backgroundColor: '#8B5CF6',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 10,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 900,
            cursor: isSubmitting || !selectedUser ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !selectedUser ? 0.6 : 1,
          }}
        >
          {isSubmitting ? '처리 중…' : '실행'}
        </button>
      </form>
    </div>
  )
}
