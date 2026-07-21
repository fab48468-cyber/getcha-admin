'use client'

import type { AdminRole } from '@/lib/auth'

type HeaderProps = {
  title: string
  role: AdminRole
}

export function Header({ title, role }: HeaderProps) {
  const isSuperAdmin = role === 'super_admin'
  const isCs = role === 'cs'

  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        height: 56,
        borderBottom: '1px solid #E0DDD8',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <h1
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: '#1A1A1A',
          margin: 0,
        }}
      >
        {title}
      </h1>
      <span
        style={{
          padding: '4px 12px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          backgroundColor: isSuperAdmin
            ? '#F0EEFF'
            : isCs
              ? '#EEFBD0'
              : '#F5F5F5',
          color: isSuperAdmin ? '#8B5CF6' : isCs ? '#5B8B1E' : '#6B6B6B',
          border: isSuperAdmin
            ? '1px solid #8B5CF6'
            : isCs
              ? '1px solid #B7E46B'
              : '1px solid #E0DDD8',
        }}
      >
        {role}
      </span>
    </header>
  )
}
