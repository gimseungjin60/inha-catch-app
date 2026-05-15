'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2 } from 'lucide-react'
import {
  API_BASE,
  AdminApiError,
  setAdminToken,
  setAdminRefreshToken,
  setAdminProfile,
  getAdminToken,
} from '@/lib/admin-api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이미 로그인된 상태면 / 로 보냄
  useEffect(() => {
    if (getAdminToken()) {
      router.replace('/')
    }
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 429) {
        setError(data.message || '요청이 너무 잦아요. 잠시 후 다시 시도해주세요.')
        return
      }
      if (!res.ok) {
        setError(data.message || '이메일 또는 비밀번호가 올바르지 않아요.')
        return
      }

      // ADMIN 권한 확인
      const role = data?.user?.role
      if (role !== 'ADMIN') {
        setError('관리자 권한이 없는 계정이에요.')
        return
      }

      setAdminToken(data.token)
      if (data.refreshToken) setAdminRefreshToken(data.refreshToken)
      setAdminProfile({
        email: data.user.email,
        name: data.user.name ?? '관리자',
        role: 'ADMIN',
      })

      router.replace('/')
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : '서버에 연결할 수 없어요.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        {/* 워드마크 */}
        <div className="mb-12 text-center">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[1.2px]">
            INHA-CATCH ─ ADMIN
          </p>
          <h1 className="mt-3 text-3xl font-bold text-ink tracking-tight">
            관리자 로그인
          </h1>
          <p className="mt-2 text-sm text-stone-400 leading-relaxed">
            인하캐치 운영 콘솔에 접근하려면 관리자 계정으로 로그인하세요.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {/* 이메일 */}
          <div>
            <label className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1.5 block">
              이메일
            </label>
            <div className="relative">
              <Mail
                size={14}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@inhatc.ac.kr"
                disabled={loading}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal text-ink placeholder:text-stone-300"
                autoFocus
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1.5 block">
              비밀번호
            </label>
            <div className="relative">
              <Lock
                size={14}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                disabled={loading}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal text-ink placeholder:text-stone-300"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-critical pt-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-4 bg-ink text-paper-card text-sm font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                로그인 중…
              </>
            ) : (
              '로그인'
            )}
          </button>
        </form>

        <p className="mt-8 text-[11px] text-stone-400 text-center leading-relaxed">
          관리자 권한이 필요합니다. 일반 사용자는 모바일 앱을 이용해주세요.
        </p>
      </div>
    </div>
  )
}
