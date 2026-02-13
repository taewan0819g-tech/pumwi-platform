'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Send } from 'lucide-react'
import type { ConversationWithOther } from './page'

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

type Props = {
  initialConversations: ConversationWithOther[]
  currentUserId: string
  /** Optional conversation id from query (e.g. /messages?conversation=...) to auto-select */
  initialConversationId?: string | null
}

export default function MessagesClient({ initialConversations, currentUserId, initialConversationId }: Props) {
  const [conversations, setConversations] = useState<ConversationWithOther[]>(initialConversations)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const id = initialConversationId ?? null
    if (!id) return null
    return initialConversations.some((c) => c.id === id) ? id : null
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messageContainerRef = useRef<HTMLDivElement>(null)

  const selectedConversation = conversations.find((c) => c.id === selectedId)
  const otherParticipant = selectedConversation?.otherParticipant
  const conversationIds = conversations.map((c) => c.id)

  const markAsRead = async (conversationId: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false)
    if (error) {
      console.error('[messages] markAsRead failed:', error)
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    )
  }

  const handleSelectConversation = (convId: string) => {
    setSelectedId(convId)
    markAsRead(convId)
  }

  const moveConversationToTop = (convId: string, options?: { setUnreadToZero?: boolean; incrementUnread?: number }) => {
    setConversations((prev) => {
      let next = prev
      if (options?.setUnreadToZero) next = next.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      if (options?.incrementUnread === 1) next = next.map((c) => (c.id === convId ? { ...c, unread_count: (c.unread_count ?? 0) + 1 } : c))
      const conv = next.find((c) => c.id === convId)
      if (!conv) return next
      return [conv, ...next.filter((c) => c.id !== convId)]
    })
  }

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .eq('conversation_id', selectedId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('[messages] load error', error)
          setMessages([])
        } else {
          setMessages((data ?? []) as Message[])
        }
        setLoading(false)
      })
  }, [selectedId])

  // Auto-scroll the message list only (avoids page jump)
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight
    }
  }, [messages])

  // Realtime: subscribe to new messages (all conversations) for unread + active view
  useEffect(() => {
    if (conversationIds.length === 0) return
    const supabase = createClient()
    const channel = supabase
      .channel('messages-all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const row = payload.new as Message & { is_read?: boolean }
          const convId = row.conversation_id
          const fromOther = row.sender_id !== currentUserId
          if (!conversationIds.includes(convId) || !fromOther) return

          if (convId === selectedId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev
              return [...prev, row]
            })
            markAsRead(convId)
            moveConversationToTop(convId, { setUnreadToZero: true })
          } else {
            moveConversationToTop(convId, { incrementUnread: 1 })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedId, currentUserId, conversationIds.length])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !selectedId || sending) return
    setSending(true)
    setInput('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedId,
          sender_id: currentUserId,
          content: text,
        })
        .select('id, conversation_id, sender_id, content, created_at')
        .single()

      if (error) throw error
      const newMsg = data as Message
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedId)
      moveConversationToTop(selectedId)
    } catch (err) {
      console.error('[messages] send error', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function formatTime(created_at: string) {
    return new Date(created_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[600px]">
      {/* Left sidebar - 25% */}
      <aside className="w-1/4 min-w-[200px] max-w-[280px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col min-h-0">
        <div className="p-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#2F5D50] font-serif">Messages</h2>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <li className="p-4 text-sm text-gray-500">No conversations yet.</li>
          ) : (
            conversations.map((c) => {
              const other = c.otherParticipant
              const isSelected = selectedId === c.id
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectConversation(c.id)}
                    className={`relative w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      isSelected ? 'bg-[#2F5D50]/10 border-l-2 border-[#2F5D50]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                      {other.avatar_url ? (
                        <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left pr-6">
                      <span className="font-medium text-gray-900 truncate block">
                        {other.full_name ?? 'Unknown'}
                      </span>
                    </div>
                    {(c.unread_count ?? 0) > 0 && (
                      <span
                        className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm"
                        aria-label={`${c.unread_count} unread`}
                      />
                    )}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </aside>

      {/* Right main - 75% */}
      <div className="flex-1 flex flex-col bg-[#F9F9F8] min-w-0 min-h-0">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 px-4 min-h-0">
            <p className="text-center font-medium">Select a conversation to start chatting.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex-shrink-0 flex items-center gap-3 p-3 border-b border-gray-200 bg-white">
              <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {otherParticipant?.avatar_url ? (
                  <img src={otherParticipant.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-gray-500" />
                )}
              </div>
              <span className="font-semibold text-gray-900">
                {otherParticipant?.full_name ?? 'Unknown'}
              </span>
            </div>

            {/* Message list - scrollable */}
            <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isMe
                            ? 'bg-[#2F5D50] text-white rounded-br-md'
                            : 'bg-gray-200 text-black rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isMe ? 'text-white/80' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div aria-hidden />
            </div>

            {/* Input area - fixed at bottom */}
            <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 min-h-[44px] max-h-32 resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2F5D50]/30 focus:border-[#2F5D50]"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="flex-shrink-0 h-11 px-4 rounded-xl bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90 disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
