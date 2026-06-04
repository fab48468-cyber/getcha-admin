import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import AnnouncementForm from '../AnnouncementForm'
import type { AnnouncementCategory, AnnouncementRow } from '../announcement-utils'

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { data } = await adminClient
    .from('announcements')
    .select(
      'id, title, content, category, is_pinned, published_at, expires_at, created_at, updated_at, created_by'
    )
    .eq('id', id)
    .single()

  if (!data) {
    notFound()
  }

  const announcement = data as AnnouncementRow

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            color: '#1A1A1A',
            fontSize: 24,
            fontWeight: 900,
            margin: 0,
          }}
        >
          공지 수정
        </h2>
        <Link
          href="/announcements"
          style={{
            color: '#8B5CF6',
            fontSize: 14,
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          목록으로
        </Link>
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E0DDD8',
          padding: 20,
          maxWidth: 720,
        }}
      >
        <AnnouncementForm
          mode="edit"
          announcementId={announcement.id}
          initial={{
            title: announcement.title,
            content: announcement.content,
            category: (announcement.category as AnnouncementCategory) || 'general',
            is_pinned: Boolean(announcement.is_pinned),
            published_at: announcement.published_at,
            expires_at: announcement.expires_at,
          }}
        />
      </div>
    </div>
  )
}
