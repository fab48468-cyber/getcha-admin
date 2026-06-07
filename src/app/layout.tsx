import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GE-CHA ADMIN',
  description: 'GE-CHA 관리자',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, minHeight: '100vh' }}>{children}</body>
    </html>
  )
}
