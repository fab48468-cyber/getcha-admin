'use client'

import { useMemo, useState, type CSSProperties } from 'react'

export type AdminLogRow = {
  id: string
  action_type: string
  created_at: string | null
  admin_nickname: string
  target_nickname: string
  details: Record<string, unknown> | null
}

type ActionFilter =
  | 'all'
  | 'coin_grant'
  | 'coin_revoke'
  | 'token_grant'
  | 'token_revoke'
  | 'suspend_user'
  | 'activate_user'
  | 'remove_penalty'

const ACTION_FILTER_OPTIONS: { value: ActionFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'coin_grant', label: '코인 지급' },
  { value: 'coin_revoke', label: '코인 회수' },
  { value: 'token_grant', label: '토큰 지급' },
  { value: 'token_revoke', label: '토큰 회수' },
  { value: 'suspend_user', label: '계정 정지' },
  { value: 'activate_user', label: '계정 활성화' },
  { value: 'remove_penalty', label: '패널티 해제' },
]

const BADGE_STYLES: Record<
  string,
  { label: string; backgroundColor: string; color: string }
> = {
  coin_grant: { label: '코인 지급', backgroundColor: '#EEFBD0', color: '#5B8B1E' },
  coin_revoke: { label: '코인 회수', backgroundColor: '#FEE2E2', color: '#DC2626' },
  token_grant: { label: '토큰 지급', backgroundColor: '#EEF0FF', color: '#8B5CF6' },
  token_revoke: { label: '토큰 회수', backgroundColor: '#FEF3C7', color: '#D97706' },
  suspend_user: { label: '계정 정지', backgroundColor: '#FEE2E2', color: '#DC2626' },
  activate_user: { label: '계정 활성화', backgroundColor: '#EEFBD0', color: '#5B8B1E' },
  remove_penalty: { label: '패널티 해제', backgroundColor: '#EEF0FF', color: '#8B5CF6' },
}

const DEFAULT_BADGE = {
  label: '기타',
  backgroundColor: '#F5F5F5',
  color: '#6B6B6B',
}

const inputStyle: CSSProperties = {
  border: '1px solid #E0DDD8',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  color: '#1A1A1A',
  backgroundColor: '#FFFFFF',
  outline: 'none',
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`
}

function parseAmount(details: Record<string, unknown> | null) {
  if (!details || details.amount == null) return null
  const raw = details.amount
  const num = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(num) ? num : null
}

export function formatActionDetails(
  actionType: string,
  details: Record<string, unknown> | null
) {
  if (!details) return '-'

  const parts: string[] = []
  const amount = parseAmount(details)

  if (amount != null) {
    const abs = Math.abs(amount).toLocaleString()
    if (actionType === 'coin_grant') parts.push(`+${abs}코인`)
    else if (actionType === 'coin_revoke') parts.push(`-${abs}코인`)
    else if (actionType === 'token_grant') parts.push(`+${abs}토큰`)
    else if (actionType === 'token_revoke') parts.push(`-${abs}토큰`)
    else parts.push(amount >= 0 ? `+${amount}` : String(amount))
  }

  const reason = details.reason
  if (typeof reason === 'string' && reason.trim()) {
    parts.push(reason.trim())
  }

  return parts.length > 0 ? parts.join(' · ') : '-'
}

function ActionBadge({ actionType }: { actionType: string }) {
  const style = BADGE_STYLES[actionType] ?? {
    ...DEFAULT_BADGE,
    label: actionType || DEFAULT_BADGE.label,
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  )
}

function isWithinDateRange(
  createdAt: string | null,
  startDate: string,
  endDate: string
) {
  if (!createdAt) return false
  const created = new Date(createdAt)
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    if (created < start) return false
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`)
    if (created > end) return false
  }
  return true
}

export default function AdminLogsClient({ logs }: { logs: AdminLogRow[] }) {
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action_type !== actionFilter) {
        return false
      }
      if ((startDate || endDate) && !isWithinDateRange(log.created_at, startDate, endDate)) {
        return false
      }
      if (query) {
        const admin = log.admin_nickname.toLowerCase()
        const target = log.target_nickname.toLowerCase()
        if (!admin.includes(query) && !target.includes(query)) {
          return false
        }
      }
      return true
    })
  }, [logs, actionFilter, startDate, endDate, searchQuery])

  return (
    <div>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
          <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>액션</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
            style={{ ...inputStyle, cursor: 'pointer', minWidth: 160 }}
          >
            {ACTION_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>기간</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
            <span style={{ color: '#6B7280', fontSize: 14 }}>~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
          <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 800 }}>검색</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="관리자 또는 대상 유저 닉네임"
            style={{ ...inputStyle, width: '100%', maxWidth: 320 }}
          />
        </label>

        <p style={{ color: '#6B7280', fontSize: 13, margin: 0, width: '100%' }}>
          최근 200건 · 필터 결과 {filteredLogs.length.toLocaleString()}건
        </p>
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#F9F9F9' }}>
            <tr>
              {['일시', '관리자', '액션', '대상 유저', '상세 내용'].map((header) => (
                <th
                  key={header}
                  style={{
                    color: '#6B7280',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '14px 16px',
                    textAlign: 'left',
                    borderBottom: '1px solid #E0DDD8',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    color: '#6B7280',
                    fontSize: 14,
                    padding: 32,
                    textAlign: 'center',
                  }}
                >
                  표시할 로그가 없습니다.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td
                    style={{
                      color: '#6B7280',
                      fontSize: 13,
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDateTime(log.created_at)}
                  </td>
                  <td
                    style={{
                      color: '#1A1A1A',
                      fontSize: 14,
                      fontWeight: 800,
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                    }}
                  >
                    {log.admin_nickname}
                  </td>
                  <td style={{ padding: 16, borderBottom: '1px solid #F0EEEA' }}>
                    <ActionBadge actionType={log.action_type} />
                  </td>
                  <td
                    style={{
                      color: '#1A1A1A',
                      fontSize: 14,
                      fontWeight: 800,
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                    }}
                  >
                    {log.target_nickname}
                  </td>
                  <td
                    style={{
                      color: '#6B7280',
                      fontSize: 14,
                      padding: 16,
                      borderBottom: '1px solid #F0EEEA',
                      maxWidth: 360,
                    }}
                  >
                    {formatActionDetails(log.action_type, log.details)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
