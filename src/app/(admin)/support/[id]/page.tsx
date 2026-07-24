import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import InquiryAnswerForm from './InquiryAnswerForm'

export default async function SupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = await getAdminUser()
  if (!admin) notFound()

  const adminClient = createAdminClient()

  const { data: inquiry } = await adminClient
    .from('support_inquiries')
    .select('*, assigned_to, updated_at')
    .eq('id', id)
    .single()

  if (!inquiry) notFound()

  const { data: userData } = await adminClient
    .from('users')
    .select('nickname, phone_number')
    .eq('id', inquiry.user_id)
    .single()

  let assigneeDisplay: string | null = null
  if (inquiry.assigned_to) {
    const { data: assigneeAdmin } = await adminClient
      .from('admins')
      .select('id, display_name')
      .eq('id', inquiry.assigned_to)
      .single()
    assigneeDisplay =
      assigneeAdmin?.display_name ?? inquiry.assigned_to.slice(0, 8)
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A' }}>문의 상세</h1>
        <Link href="/support" style={{ color: '#8B5CF6', fontSize: 14 }}>목록으로</Link>
      </div>

      {/* 기본 정보 */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E0DDD8', padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>문의 기본 정보</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div><div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 4 }}>유저 닉네임</div><div style={{ fontWeight: 700 }}>{userData?.nickname ?? '-'}</div></div>
          <div><div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 4 }}>전화번호</div><div style={{ fontWeight: 700 }}>{userData?.phone_number ?? '-'}</div></div>
          <div><div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 4 }}>카테고리</div><div style={{ fontWeight: 700 }}>{inquiry.category}</div></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 4 }}>제목</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{inquiry.title}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 4 }}>내용</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{inquiry.content}</div>
        </div>
        {inquiry.image_urls && inquiry.image_urls.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 8 }}>첨부 이미지</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {inquiry.image_urls.map((url: string, i: number) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt={`첨부${i + 1}`} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <InquiryAnswerForm
        inquiry={inquiry}
        assigneeDisplay={assigneeDisplay}
        currentAdminId={admin.id}
        currentAdminRole={admin.role}
      />
    </div>
  )
}
