'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Moon, Command, LogOut } from 'lucide-react'
import { AdminSidebar } from '@/components/inha-catch/AdminSidebar'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { AdminPosts } from '@/components/admin/AdminPosts'
import { AdminUsers } from '@/components/admin/AdminUsers'
import { AdminCrawling } from '@/components/admin/AdminCrawling'
import { AdminAlgorithm } from '@/components/admin/AdminAlgorithm'
import { AdminNotifications } from '@/components/admin/AdminNotifications'
import { AdminSettings } from '@/components/admin/AdminSettings'
import {
  API_BASE,
  clearAdminSession,
  getAdminProfile,
  getAdminToken,
  type AdminProfile,
} from '@/lib/admin-api'

type AdminTab = 'dashboard' | 'posts' | 'users' | 'crawling' | 'algorithm' | 'notifications' | 'settings'

const TAB_META: Record<AdminTab, { title: string; breadcrumb: string }> = {
  dashboard: { title: '대시보드', breadcrumb: 'Overview' },
  posts: { title: '공고 관리', breadcrumb: 'All Listings' },
  users: { title: '사용자', breadcrumb: 'Members' },
  crawling: { title: '크롤링 로그', breadcrumb: 'Live Logs' },
  algorithm: { title: '추천 알고리즘', breadcrumb: 'Weights' },
  notifications: { title: '알림 발송', breadcrumb: 'Composer' },
  settings: { title: '설정', breadcrumb: 'General' },
}

export default function AdminPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  // 인증 가드 — 토큰 없으면 /login 으로
  useEffect(() => {
    const token = getAdminToken()
    if (!token) {
      router.replace('/login')
      return
    }
    setProfile(getAdminProfile())
    setAuthChecked(true)
  }, [router])

  const logout = async () => {
    if (!confirm('로그아웃 하시겠어요?')) return
    const token = getAdminToken()
    try {
      // 서버 측 토큰 블랙리스트 등록 (실패해도 진행)
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch {
      /* ignore */
    }
    clearAdminSession()
    router.replace('/login')
  }

  // 인증 확인 전엔 빈 화면 (깜빡임 방지)
  if (!authChecked) {
    return <div className="min-h-screen bg-paper" />
  }

  const { title, breadcrumb } = TAB_META[adminTab]
  const initial = (profile?.name?.[0] ?? profile?.email?.[0] ?? 'A').toUpperCase()

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-paper dark:bg-background transition-colors flex">
        <AdminSidebar activeTab={adminTab} onChange={setAdminTab} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 shrink-0 border-b border-stone-100 dark:border-border bg-paper-card dark:bg-card flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-ink dark:text-foreground">{title}</h3>
              <span className="text-stone-300 dark:text-stone-500">/</span>
              <span className="text-sm text-stone-400 dark:text-muted-foreground">{breadcrumb}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 dark:bg-secondary rounded-lg text-sm text-stone-400 dark:text-muted-foreground">
                <Command size={14} />
                <span className="font-mono">K</span>
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 hover:bg-stone-50 dark:hover:bg-secondary rounded-lg transition-colors"
                title={isDarkMode ? '라이트 모드' : '다크 모드'}
              >
                {isDarkMode ? <Sun size={18} className="text-foreground" /> : <Moon size={18} className="text-ink" />}
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="w-8 h-8 bg-ink dark:bg-foreground rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                  title={profile?.email ?? '관리자'}
                >
                  <span className="text-sm font-medium text-paper-card dark:text-background">
                    {initial}
                  </span>
                </button>
                {menuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="닫기"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-10 z-50 w-56 bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-lg shadow-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-stone-100 dark:border-border">
                        <p className="text-sm font-medium text-ink dark:text-foreground truncate">
                          {profile?.name ?? '관리자'}
                        </p>
                        <p className="text-xs text-stone-400 dark:text-muted-foreground truncate mt-0.5">
                          {profile?.email ?? ''}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          logout()
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-critical hover:bg-stone-50 dark:hover:bg-secondary transition-colors"
                      >
                        <LogOut size={14} />
                        로그아웃
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-y-auto">
            {adminTab === 'dashboard' && <AdminDashboard />}
            {adminTab === 'posts' && <AdminPosts />}
            {adminTab === 'users' && <AdminUsers />}
            {adminTab === 'crawling' && <AdminCrawling />}
            {adminTab === 'algorithm' && <AdminAlgorithm />}
            {adminTab === 'notifications' && <AdminNotifications />}
            {adminTab === 'settings' && <AdminSettings />}
          </main>
        </div>
      </div>
    </div>
  )
}
