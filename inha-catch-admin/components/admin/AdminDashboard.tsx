'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, AlertTriangle } from 'lucide-react'
import { KPICard } from '@/components/inha-catch/KPICard'
import { adminFetch } from '@/lib/admin-api'
import { AdminErrorState, AdminSkeleton, StatBar } from './_shared'

type AdminStats = {
  totalScholarships: number
  totalUsers: number
  totalNotifications: number
  totalBookmarks: number
  todayScholarships: number
  todayUsers: number
}

type RecentUser = {
  id: number
  name: string | null
  email: string
  major: string | null
  createdAt: string | null
}

type RecentError = {
  id: number
  targetUrl: string
  errorMessage: string | null
  createdAt: string | null
}

type Overview = {
  categoryBreakdown: Record<string, number>
  recentUsers: RecentUser[]
  recentErrors: RecentError[]
}

const CATEGORY_LABEL: Record<string, string> = {
  SCHOLARSHIP: '장학금',
  CONTEST: '공모전',
  NOTICE: '공지',
  UNKNOWN: '미분류',
}

const CATEGORY_COLOR: Record<string, 'ink' | 'signal' | 'stone'> = {
  SCHOLARSHIP: 'ink',
  CONTEST: 'signal',
  NOTICE: 'stone',
  UNKNOWN: 'stone',
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    const date = new Date(iso)
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
    if (diffMin < 1) return '방금'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}시간 전`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return '어제'
    if (diffDays < 7) return `${diffDays}일 전`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
    return `${Math.floor(diffDays / 30)}개월 전`
  } catch {
    return '—'
  }
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 통계는 필수, overview 는 실패해도 부분 표시
      const s = await adminFetch<AdminStats>('/api/admin/stats')
      setStats(s)
      try {
        const o = await adminFetch<Overview>('/api/admin/dashboard/overview')
        setOverview(o)
      } catch {
        setOverview(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !stats) return <AdminSkeleton rows={3} />
  if (error && !stats) return <AdminErrorState message={error} onRetry={load} />

  // 카테고리 분포 — 백분율 계산
  const breakdown = overview?.categoryBreakdown ?? {}
  const breakdownTotal = Object.values(breakdown).reduce((s, v) => s + v, 0)
  const breakdownItems = Object.entries(breakdown).map(([key, count]) => ({
    key,
    label: CATEGORY_LABEL[key] ?? key,
    count,
    percent: breakdownTotal > 0 ? Math.round((count / breakdownTotal) * 100) : 0,
    color: CATEGORY_COLOR[key] ?? 'stone',
  }))

  return (
    <div className="space-y-5">
      {/* KPI 4장 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          label="전체 공고"
          value={stats?.totalScholarships?.toLocaleString() ?? '—'}
          change={stats ? `오늘 +${stats.todayScholarships}` : undefined}
          changeType={stats && stats.todayScholarships > 0 ? 'positive' : 'neutral'}
          delay={0}
        />
        <KPICard
          label="전체 사용자"
          value={stats?.totalUsers?.toLocaleString() ?? '—'}
          change={stats ? `오늘 +${stats.todayUsers}` : undefined}
          changeType={stats && stats.todayUsers > 0 ? 'positive' : 'neutral'}
          delay={50}
        />
        <KPICard label="발송 알림" value={stats?.totalNotifications?.toLocaleString() ?? '—'} delay={100} />
        <KPICard label="북마크" value={stats?.totalBookmarks?.toLocaleString() ?? '—'} delay={150} />
      </div>

      {/* 카테고리 분포 — 3-up StatBar */}
      <div>
        <h3 className="text-sm font-semibold text-ink dark:text-foreground mb-3">카테고리 분포</h3>
        {breakdownItems.length === 0 ? (
          <p className="text-xs text-stone-400 dark:text-muted-foreground">아직 공고가 없어요.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {breakdownItems.slice(0, 3).map((item) => (
              <StatBar key={item.key} label={`${item.label} (${item.count.toLocaleString()})`} value={item.percent} color={item.color} />
            ))}
          </div>
        )}
      </div>

      {/* 최근 가입자 + 최근 크롤 에러 */}
      <div className="grid grid-cols-12 gap-5">
        {/* 최근 가입자 */}
        <div className="col-span-6 bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl">
          <div className="px-5 py-4 border-b border-stone-100 dark:border-border flex items-center gap-2">
            <Users size={14} strokeWidth={1.5} className="text-stone-400" />
            <h3 className="text-sm font-semibold text-ink dark:text-foreground">최근 가입자</h3>
          </div>
          {!overview?.recentUsers || overview.recentUsers.length === 0 ? (
            <p className="p-5 text-xs text-stone-400 dark:text-muted-foreground">아직 가입자가 없어요.</p>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-border">
              {overview.recentUsers.map((u) => (
                <li key={u.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-500 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-paper-card dark:text-background">
                      {(u.name ?? u.email)[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink dark:text-foreground truncate">
                      {u.name ?? '(이름 없음)'}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-muted-foreground truncate">
                      {u.major ?? '학과 미지정'}
                    </p>
                  </div>
                  <span className="text-xs text-stone-400 dark:text-muted-foreground shrink-0">
                    {relativeTime(u.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 최근 크롤 에러 */}
        <div className="col-span-6 bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl">
          <div className="px-5 py-4 border-b border-stone-100 dark:border-border flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={1.5} className="text-stone-400" />
            <h3 className="text-sm font-semibold text-ink dark:text-foreground">최근 크롤 에러</h3>
          </div>
          {!overview?.recentErrors || overview.recentErrors.length === 0 ? (
            <p className="p-5 text-xs text-stone-400 dark:text-muted-foreground">최근 에러가 없어요. 좋아요 ✨</p>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-border">
              {overview.recentErrors.map((e) => (
                <li key={e.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-xs font-mono tabular-nums text-stone-400 dark:text-muted-foreground truncate flex-1">
                      {e.targetUrl}
                    </p>
                    <span className="text-xs text-stone-400 dark:text-muted-foreground shrink-0">
                      {relativeTime(e.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-critical line-clamp-2">
                    {e.errorMessage ?? '(에러 메시지 없음)'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 빠른 작업 */}
      <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-ink dark:text-foreground mb-2">빠른 작업</h3>
        <p className="text-xs text-stone-400 dark:text-muted-foreground leading-korean">
          좌측 사이드바에서 공고 관리, 사용자 관리, 크롤링 로그를 확인할 수 있어요. 알림 발송 페이지에서 일괄
          공지를 전송할 수도 있어요.
        </p>
      </div>
    </div>
  )
}
