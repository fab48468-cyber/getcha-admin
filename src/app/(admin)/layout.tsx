import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { AdminLayoutShell } from '@/components/layout/AdminLayoutShell'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const admin = await getAdminUser()

  if (!admin) {
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar email={admin.email ?? ''} role={admin.role} />
      <AdminLayoutShell role={admin.role}>{children}</AdminLayoutShell>
    </div>
  )
}
