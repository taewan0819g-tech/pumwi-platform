# PUMWI - 아티스트와 팬을 위한 플랫폼

Next.js 14와 Supabase를 사용하여 구축된 아티스트-팬 연결 플랫폼입니다.

## 기술 스택

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Auth & DB:** Supabase (`@supabase/ssr`)
- **Styling:** Tailwind CSS
- **Theme:** Violet/Purple (#8E86F5)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local.example` 파일을 참고하여 `.env.local` 파일을 생성하고 Supabase 프로젝트 정보를 입력하세요:

```bash
cp .env.local.example .env.local
```

`.env.local` 파일에 다음 내용을 추가:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
pumwipage7/
├── app/
│   ├── layout.tsx          # 전역 레이아웃
│   ├── page.tsx            # 메인 페이지
│   ├── login/
│   │   └── page.tsx        # 로그인 페이지 (클라이언트 사이드)
│   └── globals.css         # 전역 스타일
├── components/
│   └── LogoutButton.tsx    # 로그아웃 버튼 컴포넌트
├── lib/
│   └── supabase/
│       ├── client.ts       # 브라우저 클라이언트
│       └── server.ts       # 서버 클라이언트
└── middleware.ts           # 세션 갱신 및 라우트 보호
```

## 인증 아키텍처

이 프로젝트는 이전에 발생했던 인증 문제들을 방지하기 위해 다음과 같은 아키텍처를 따릅니다:

1. **클라이언트 사이드 로그인**: Server Action 대신 클라이언트에서 직접 `signInWithPassword` 호출
2. **쿠키 설정**: `secure: process.env.NODE_ENV === 'production'` 로직으로 로컬 개발 환경 지원
3. **세션 갱신**: Middleware에서 자동으로 세션 갱신 및 쿠키 복사
4. **강제 리다이렉트**: 로그인 성공 시 `window.location.href`로 쿠키 적용 보장

## 주요 기능

- ✅ 로그인/로그아웃
- ✅ 세션 관리
- ✅ 라우트 보호
- ✅ 반응형 디자인

## 다음 단계

- 회원가입 페이지 구현
- 프로필 페이지
- 아티스트 대시보드
- 팬 대시보드
