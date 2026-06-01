'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Save } from 'lucide-react'
import { adminFetch } from '@/lib/admin-api'
import { AdminErrorState, AdminSkeleton, SettingToggle } from './_shared'

type GeneralSettings = { serviceName: string; adminEmail: string; timezone: string; language: string }
type CrawlSettings = { intervalMinutes: number; nightStop: boolean; autoRetry: boolean }

export function AdminSettings() {
  const [general, setGeneral] = useState<GeneralSettings | null>(null)
  const [crawl, setCrawl] = useState<CrawlSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingCrawl, setSavingCrawl] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [g, c] = await Promise.all([
        adminFetch<GeneralSettings>('/api/admin/settings/general'),
        adminFetch<CrawlSettings>('/api/admin/settings/crawl'),
      ])
      setGeneral(g)
      setCrawl(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveGeneral = async () => {
    if (!general) return
    setSavingGeneral(true)
    try {
      await adminFetch('/api/admin/settings/general', { method: 'PUT', body: JSON.stringify(general) })
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSavingGeneral(false)
    }
  }

  const saveCrawl = async () => {
    if (!crawl) return
    setSavingCrawl(true)
    try {
      await adminFetch('/api/admin/settings/crawl', { method: 'PUT', body: JSON.stringify(crawl) })
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSavingCrawl(false)
    }
  }

  if (loading && !general) return <AdminSkeleton rows={5} />
  if (error && !general) return <AdminErrorState message={error} onRetry={load} />

  return (
    <div className="max-w-3xl space-y-5">
      <section className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl">
        <div className="px-5 py-4 border-b border-stone-100 dark:border-border">
          <h3 className="text-sm font-semibold text-ink dark:text-foreground">일반</h3>
          <p className="text-xs text-stone-400 dark:text-muted-foreground mt-1">서비스 기본 정보</p>
        </div>
        {general && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  서비스 이름
                </label>
                <input
                  type="text"
                  value={general.serviceName}
                  onChange={(e) => setGeneral({ ...general, serviceName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  관리자 이메일
                </label>
                <input
                  type="email"
                  value={general.adminEmail}
                  onChange={(e) => setGeneral({ ...general, adminEmail: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  타임존
                </label>
                <select
                  value={general.timezone}
                  onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="Asia/Seoul">Asia/Seoul (UTC+9)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  기본 언어
                </label>
                <select
                  value={general.language}
                  onChange={(e) => setGeneral({ ...general, language: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={saveGeneral}
                disabled={savingGeneral}
                className="px-3 py-1.5 text-sm bg-ink dark:bg-foreground text-paper-card dark:text-background rounded-lg disabled:opacity-40 flex items-center gap-1.5"
              >
                <Save size={14} />
                {savingGeneral ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl">
        <div className="px-5 py-4 border-b border-stone-100 dark:border-border">
          <h3 className="text-sm font-semibold text-ink dark:text-foreground">크롤링</h3>
          <p className="text-xs text-stone-400 dark:text-muted-foreground mt-1">자동 수집 주기와 안전 장치</p>
        </div>
        {crawl && (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-1.5 block">
                크롤링 주기
              </label>
              <div className="flex gap-1 p-0.5 bg-stone-50 dark:bg-secondary rounded-lg w-fit">
                {[10, 30, 60, 360].map((m) => (
                  <button
                    key={m}
                    onClick={() => setCrawl({ ...crawl, intervalMinutes: m })}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      crawl.intervalMinutes === m
                        ? 'bg-paper-card dark:bg-card text-ink dark:text-foreground shadow-sm'
                        : 'text-stone-400 dark:text-muted-foreground'
                    }`}
                  >
                    {m < 60 ? `${m}분` : `${m / 60}시간`}
                  </button>
                ))}
              </div>
            </div>

            <SettingToggle
              label="야간 크롤링 중지"
              description="00:00–06:00 사이 크롤러를 일시 중지합니다."
              enabled={crawl.nightStop}
              onChange={(v) => setCrawl({ ...crawl, nightStop: v })}
            />

            <SettingToggle
              label="실패 시 자동 재시도"
              description="크롤링 실패 시 최대 3회까지 재시도합니다."
              enabled={crawl.autoRetry}
              onChange={(v) => setCrawl({ ...crawl, autoRetry: v })}
            />

            <div className="flex justify-end pt-2">
              <button
                onClick={saveCrawl}
                disabled={savingCrawl}
                className="px-3 py-1.5 text-sm bg-ink dark:bg-foreground text-paper-card dark:text-background rounded-lg disabled:opacity-40 flex items-center gap-1.5"
              >
                <Save size={14} />
                {savingCrawl ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="bg-paper-card dark:bg-card border border-critical/30 rounded-xl">
        <div className="px-5 py-4 border-b border-critical/30 flex items-center gap-2">
          <AlertTriangle size={14} className="text-critical" />
          <h3 className="text-sm font-semibold text-critical">위험 구역</h3>
        </div>
        <ul className="divide-y divide-stone-100 dark:divide-border">
          <li className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-ink dark:text-foreground">관리자 계정 추가</p>
              <p className="text-xs text-stone-400 dark:text-muted-foreground mt-0.5 leading-korean">
                새 운영자에게 관리자 권한을 부여합니다.
              </p>
            </div>
            <button className="px-3 py-1.5 text-sm bg-stone-50 dark:bg-secondary text-ink dark:text-foreground rounded-lg shrink-0">
              추가
            </button>
          </li>
          <li className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-ink dark:text-foreground">서비스 일시 중지</p>
              <p className="text-xs text-stone-400 dark:text-muted-foreground mt-0.5 leading-korean">
                신규 가입과 알림 발송을 중지합니다.
              </p>
            </div>
            <button className="px-3 py-1.5 text-sm border border-critical/40 text-critical rounded-lg hover:bg-critical/5 shrink-0">
              중지
            </button>
          </li>
          <li className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-ink dark:text-foreground">모든 사용자 데이터 초기화</p>
              <p className="text-xs text-stone-400 dark:text-muted-foreground mt-0.5 leading-korean">
                되돌릴 수 없습니다. 신중히 결정해주세요.
              </p>
            </div>
            <button className="px-3 py-1.5 text-sm border border-critical/40 text-critical rounded-lg hover:bg-critical/5 shrink-0">
              초기화
            </button>
          </li>
        </ul>
      </section>
    </div>
  )
}
