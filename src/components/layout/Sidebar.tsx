'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { AdminRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

const BASE_NAV_ITEMS = [
  { icon: '🏠', label: '대시보드', href: '/' },
  { icon: '🖼️', label: '홈 배너', href: '/banners' },
  { icon: '📊', label: '매출 통계', href: '/stats' },
  { icon: '🎰', label: '가챠 관리', href: '/gacha' },
  { icon: '🎫', label: '쿠지 관리', href: '/kuji' },
  { icon: '📦', label: '배송 관리', href: '/shipments' },
  { icon: '🗃️', label: '악성재고 관리', href: '/bad-inventory' },
  { icon: '⚒️', label: '공방 관리', href: '/workshop' },
  { icon: '📖', label: '도감북 관리', href: '/dex' },
  { icon: '👥', label: '유저 관리', href: '/users' },
  { icon: '📢', label: '공지사항', href: '/announcements' },
  { icon: '🔔', label: '푸시 알림', href: '/push-notifications' },
  { icon: '💬', label: '고객센터', href: '/support' },
  { icon: '🔍', label: '관리자 로그', href: '/admin-logs' },
] as const

const SUPER_ADMIN_NAV_ITEM = {
  icon: '💰',
  label: '코인/토큰 관리',
  href: '/coins',
} as const

/** cs 에게 숨기는 쓰기 전용 메뉴 */
const CS_HIDDEN_HREFS = new Set([
  '/banners',
  '/gacha',
  '/kuji',
  '/announcements',
  '/push-notifications',
  '/coins',
])

type SidebarProps = {
  email: string
  role: AdminRole
}

export function Sidebar({ email, role }: SidebarProps) {
  const navItems = (() => {
    const items =
      role === 'super_admin'
        ? [...BASE_NAV_ITEMS, SUPER_ADMIN_NAV_ITEM]
        : [...BASE_NAV_ITEMS]

    if (role === 'cs') {
      return items.filter((item) => !CS_HIDDEN_HREFS.has(item.href))
    }
    return items
  })()
  const pathname = usePathname()
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 240,
        height: '100vh',
        backgroundColor: '#1A1A1A',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
      }}
    >
      <div style={{ padding: 20 }}>
        <div style={{ lineHeight: 1.2 }}>
          <span style={{ fontWeight: 900, fontSize: 18 }}>
            <span style={{ color: '#7EC845' }}>G</span>
            <span style={{ color: '#FFFFFF' }}>E-</span>
            <span style={{ color: '#8B5CF6' }}>C</span>
            <span style={{ color: '#FFFFFF' }}>HA</span>
          </span>
          <span style={{ color: '#FFFFFF', fontWeight: 900, fontSize: 18 }}>
            {' '}
            ADMIN
          </span>
        </div>
        <p
          style={{
            color: '#9E9E9E',
            fontSize: 12,
            marginTop: 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {email}
        </p>
      </div>

      <nav style={{ padding: 8, flex: 1 }}>
        {navItems.map(({ href, label, icon }) => {
          const active = isActive(href)
          const hovered = hoveredHref === href

          return (
            <Link
              key={href}
              href={href}
              onMouseEnter={() => setHoveredHref(href)}
              onMouseLeave={() => setHoveredHref(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                textDecoration: 'none',
                marginBottom: 4,
                backgroundColor: active
                  ? '#8CC63F'
                  : hovered
                    ? 'rgba(255,255,255,0.08)'
                    : 'transparent',
                color: active ? '#1A1A1A' : '#9E9E9E',
                fontWeight: active ? 700 : 400,
                fontSize: 14,
              }}
            >
              <span aria-hidden>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: 8, marginTop: 'auto' }}>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: '#FFFFFF',
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            textAlign: 'left',
          }}
        >
          로그아웃
        </button>
      </div>
    </aside>
  )
}
