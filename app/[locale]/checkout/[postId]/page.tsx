import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import CheckoutClient from '@/components/checkout/CheckoutClient'

interface CheckoutPageProps {
  params: Promise<{ postId: string }>
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { postId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('posts')
    .select('id, title, content, image_url, image_urls, price, type, user_id')
    .eq('id', postId)
    .single()

  if (error || !data) {
    notFound()
  }

  const post = data as { id: string; title: string; content: string | null; image_url: string | null; image_urls: string[] | null; price: number | null; type: string; user_id: string }
  if (post.type !== 'sales') {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF]">
      <CheckoutClient postId={postId} initialPost={post} sellerId={post.user_id} />
    </div>
  )
}
