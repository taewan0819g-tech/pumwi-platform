import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 인증 후 돌아갈 페이지 (기본값: /)
  const next = searchParams.get('next') ?? '/'

  if (code) {
    // 리다이렉트 응답에 세션 쿠키를 설정해야 브라우저에 저장됨 (request.cookies.set은 동작하지 않음)
    const redirectResponse = NextResponse.redirect(`${origin}${next}`)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, {
                ...(options as Record<string, unknown>),
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                httpOnly: true,
                path: '/',
              })
            })
          },
        },
      }
    )

    // 코드를 세션으로 교환 (여기서 실제 로그인이 완료됨)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 성공하면 404 없이 바로 다음 페이지로 리다이렉트
      return redirectResponse
    }
  }

  // 에러 발생 시 로그인 페이지로 안전하게 리다이렉트
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
