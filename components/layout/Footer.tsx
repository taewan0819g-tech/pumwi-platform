import Link from 'next/link'
import { Instagram, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 상단 메뉴: 회사소개 | 개인정보처리방침 | 이용약관 | 공지사항 */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs text-slate-500 mb-6">
          <Link href="/company" className="hover:text-slate-700 transition-colors">
            회사소개
          </Link>
          <span className="text-slate-300 select-none">|</span>
          <Link
            href="/privacy"
            className="font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            개인정보처리방침
          </Link>
          <span className="text-slate-300 select-none">|</span>
          <Link href="/terms" className="hover:text-slate-700 transition-colors">
            이용약관
          </Link>
          <span className="text-slate-300 select-none">|</span>
          <Link href="/notice" className="hover:text-slate-700 transition-colors">
            공지사항
          </Link>
        </div>

        {/* 사업자 정보 */}
        <div className="text-xs text-slate-500 space-y-1 mb-6">
          <p className="font-semibold text-slate-600">PUMWI (품위)</p>
          <p>대표: 황태완 | 개인정보보호책임자: 황태완</p>
          <p>주소: 경기도 이천시</p>
          <p>
            이메일:{' '}
            <a
              href="mailto:taewan0819g@gmail.com"
              className="hover:text-slate-700 underline"
            >
              taewan0819g@gmail.com
            </a>
          </p>
          <p>
            전화:{' '}
            <a href="tel:010-5173-0819" className="hover:text-slate-700">
              010-5173-0819
            </a>
          </p>
          <p className="text-slate-400 italic mt-2">
            *현재 정식 서비스 준비 중인 베타 버전입니다.
          </p>
        </div>

        {/* 하단 카피라이트 + SNS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-200 text-xs text-slate-500">
          <p>Copyright © 2026 PUMWI. All Rights Reserved.</p>
          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
