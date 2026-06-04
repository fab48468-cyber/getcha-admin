import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

/** 현재 세션 유저 가져오기 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** 관리자 여부 + role 반환. 비관리자면 null */
export async function getAdminUser() {
  const user = await getUser()
  if (!user) return null

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('admins')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!data) return null
  return { ...user, role: data.role as 'admin' | 'super_admin' }
}

/** super_admin 여부 확인 */
export async function isSuperAdmin() {
  const admin = await getAdminUser()
  return admin?.role === 'super_admin'
}
