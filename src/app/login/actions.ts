'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function loginAction(
  _prevState: { error: string },
  formData: FormData
) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  // 관리자 권한 체크
  const adminClient = createAdminClient()
  const { data: adminData } = await adminClient
    .from('admins')
    .select('id, role')
    .eq('id', data.user.id)
    .single()

  if (!adminData) {
    await supabase.auth.signOut()
    return { error: '관리자 권한이 없습니다.' }
  }

  redirect('/')
}
