import createIntlMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

function getLocaleFromPathname(pathname: string): string {
  const match = pathname.match(/^\/(en|ko|ja)(\/|$)/)
  return match ? match[1] : routing.defaultLocale
}

function pathnameWithoutLocale(pathname: string): string {
  const without = pathname.replace(/^\/(en|ko|ja)/, '') || '/'
  return without
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files (e.g. favicon.ico, .png, .jpg) so they are not treated as locale paths
  if (pathname.includes('.')) {
    return NextResponse.next()
  }

  const pathWithoutLocale = pathnameWithoutLocale(pathname)
  const locale = getLocaleFromPathname(pathname)

  // 1. Supabase auth: refresh session and get user (so we can redirect if needed)
  let authResponse = NextResponse.next({
    request: { headers: request.headers },
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
            authResponse.cookies.set(name, value, {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicPaths = ['/', '/login', '/signup', '/auth']
  const isPublicPath =
    publicPaths.some((p) => pathWithoutLocale === p) ||
    pathWithoutLocale === '' || // locale root e.g. /en → pathWithoutLocale ''
    pathWithoutLocale.startsWith('/auth/')

  if ((pathWithoutLocale === '/login' || pathWithoutLocale === '/signup') && user) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url))
  }

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  // OAuth callback: locale prefix 없이 그대로 통과 (next-intl 리다이렉트 방지 → 404 해결)
  if (pathname === '/auth/callback') {
    return NextResponse.next()
  }

  // 2. Run next-intl (redirects / to /en, rewrites, sets locale cookie)
  const intlResponse = intlMiddleware(request)

  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    authResponse.cookies.getAll().forEach((c) => {
      intlResponse.cookies.set(c.name, c.value, c)
    })
    return intlResponse
  }

  authResponse.cookies.getAll().forEach((c) => {
    intlResponse.cookies.set(c.name, c.value, c)
  })
  return intlResponse
}

export const config = {
  // 1. api, _next, favicon.ico 등 모든 정적 파일을 명확히 제외
  // 2. 확장자가 있는 파일(.png, .jpg 등)도 제외
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
}
