import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. 응답 객체를 먼저 만들고, setAll에서 이 응답에 쿠키를 쓰도록 함 (쿠키 동기화)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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
            request.cookies.set(name, value)
            response.cookies.set(name, value, {
              ...(options as Record<string, unknown>),
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              httpOnly: true,
            })
          })
        },
      },
    }
  )

  // 2. 세션 검증 및 갱신 (getUser 호출 시 만료된 토큰이면 갱신 후 setAll로 쿠키 반영)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const publicPaths = ['/login', '/signup', '/auth']
  const isPublicPath =
    publicPaths.some((p) => pathname === p) || pathname.startsWith('/auth/')

  // 3. 로그인된 유저가 /login, /signup 접근 시 -> 홈으로
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 4. 로그인 안 된 유저가 홈(/) 또는 기타 보호 경로 접근 시 -> /login으로
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
