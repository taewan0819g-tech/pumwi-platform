import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MessagesClient from './messages-client'

export const dynamic = 'force-dynamic'

export type ConversationWithOther = {
  id: string
  participant_ids: string[]
  otherParticipant: { id: string; full_name: string | null; avatar_url: string | null }
  unread_count: number
}

type PageProps = { searchParams?: { conversation?: string } }

export default async function MessagesPage({ searchParams }: PageProps) {
  const conversationIdFromQuery = searchParams?.conversation ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: convRows } = await supabase
    .from('conversations')
    .select('id, participant_ids')
    .contains('participant_ids', [user.id])
    .order('updated_at', { ascending: false })

  const conversations = (convRows ?? []) as { id: string; participant_ids: string[] }[]
  const convIds = conversations.map((c) => c.id)
  const otherIds = [...new Set(
    conversations.flatMap((c) => c.participant_ids.filter((id) => id !== user.id))
  )].filter(Boolean)

  let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', otherIds)
    for (const p of profiles ?? []) {
      const row = p as { id: string; full_name: string | null; avatar_url: string | null }
      profilesMap[row.id] = { full_name: row.full_name, avatar_url: row.avatar_url }
    }
  }

  const unreadByConv: Record<string, number> = {}
  if (convIds.length > 0) {
    const { data: unreadRows } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('is_read', false)
      .neq('sender_id', user.id)
      .in('conversation_id', convIds)
    for (const row of unreadRows ?? []) {
      const r = row as { conversation_id: string }
      unreadByConv[r.conversation_id] = (unreadByConv[r.conversation_id] ?? 0) + 1
    }
  }

  const conversationsWithOther: ConversationWithOther[] = conversations.map((c) => {
    const otherId = c.participant_ids.find((id) => id !== user.id) ?? ''
    return {
      id: c.id,
      participant_ids: c.participant_ids,
      otherParticipant: {
        id: otherId,
        ...(profilesMap[otherId] ?? { full_name: null, avatar_url: null }),
      },
      unread_count: unreadByConv[c.id] ?? 0,
    }
  })

  return (
    <div className="flex flex-col bg-[#F9F9F8] rounded-2xl border border-gray-100 shadow-sm">
      <MessagesClient
        initialConversations={conversationsWithOther}
        currentUserId={user.id}
        initialConversationId={conversationIdFromQuery}
      />
    </div>
  )
}
