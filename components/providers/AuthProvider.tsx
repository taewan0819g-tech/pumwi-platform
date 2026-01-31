'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

interface AuthContextValue {
  user: SupabaseUser | null
  session: Session | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
  initialSession?: Session | null
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(
    initialSession?.user ?? null
  )
  const [session, setSession] = useState<Session | null>(initialSession ?? null)
  const [isLoading, setIsLoading] = useState(!initialSession)

  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setIsLoading(false)
      // 로그인/로그아웃/토큰 갱신 시 서버 컴포넌트가 최신 세션을 쓰도록 갱신
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED'
      ) {
        router.refresh()
      }
    })

    // 초기 세션이 없을 때 한 번 더 확인 (클라이언트 쿠키 기준)
    if (!initialSession) {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s)
        setUser(s?.user ?? null)
        setIsLoading(false)
      })
    }

    return () => subscription.unsubscribe()
  }, [router])

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
