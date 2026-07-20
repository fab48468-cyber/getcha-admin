'use client'

import { usePathname } from 'next/navigation'
import { Header } from './Header'

const PAGE_TITLES: Record<string, string> = {
  '/': '대시보드',
  '/banners': '홈 배너',
  '/gacha': '가챠 관리',
  '/kuji': '쿠지 관리',
  '/shipments': '배송 관리',
  '/users': '유저 관리',
  '/announcements': '공지사항',
  '/support': '고객센터',
  '/coins': '코인/토큰 관리',
}

function getPageTitle(pathname: string) {
  const exact = PAGE_TITLES[pathname]
  if (exact) return exact

  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (path !== '/' && pathname.startsWith(path)) return title
  }

  return '관리자'
}

type AdminLayoutShellProps = {
  role: 'admin' | 'super_admin'
  children: React.ReactNode
}

export function AdminLayoutShell({ role, children }: AdminLayoutShellProps) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <div
      style={{
        flex: 1,
        marginLeft: 240,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Header title={title} role={role} />
      <main
        style={{
          padding: 24,
          backgroundColor: '#F5F2ED',
          minHeight: 'calc(100vh - 56px)',
          flex: 1,
        }}
      >
        {children}
      </main>
    </div>
  )
}
