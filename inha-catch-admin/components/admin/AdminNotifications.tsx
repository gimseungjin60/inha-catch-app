'use client'

import { useState, useEffect, useCallback } from 'react'
import { Send, Bell, RefreshCw } from 'lucide-react'
import { adminFetch } from '@/lib/admin-api'
import { AdminEmptyState, AdminErrorState, AdminSkeleton } from './_shared'

type PushHistory = { id: number; title: string; sentAt: string; recipients: number; openRate: number }

const SEGMENT_OPTIONS = ['전체 사용자', '특정 학과 구독자', '관심 키워드 매칭', '최근 30일 활성 사용자']

export function AdminNotifications() {
  const [history, setHistory] = useState<PushHistory[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [segment, setSegment] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [deepLink, setDeepLink] = useState('')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetch<PushHistory[]>('/api/admin/notifications/history')
      setHistory(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const send = async () => {
    if (!title.trim() || !body.trim()) return
    setSending(true)
    setSendError(null)
    try {
      await adminFetch('/api/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({
          segment: SEGMENT_OPTIONS[segment],
          title: title.trim(),
          body: body.trim(),
          deepLink: deepLink.trim() || null,
          scheduleMode,
        }),
      })
      setTitle('')
      setBody('')
      setDeepLink('')
      load()
    } catch (e) {
      setSendError(e instanceof Error ? e.message : '발송 실패')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-6 bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl">
        <div className="px-5 py-4 border-b border-stone-100 dark:border-border">
          <h3 className="text-sm font-semibold text-ink dark:text-foreground">새 알림 작성</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-1.5 block">
              대상
            </label>
            <select
              value={segment}
              onChange={(e) => setSegment(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal"
            >
              {SEGMENT_OPTIONS.map((s, i) => (
                <option key={i} value={i}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-1.5 block">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="알림 제목"
              maxLength={50}
              className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal"
            />
            <p className="text-[10px] text-stone-400 mt-1 font-mono tabular-nums">{title.length} / 50</p>
          </div>

          <div>
            <label className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-1.5 block">
              본문
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={200}
              placeholder="사용자에게 보낼 메시지"
              className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal resize-none leading-korean"
            />
            <p className="text-[10px] text-stone-400 mt-1 font-mono tabular-nums">{body.length} / 200</p>
          </div>

          <div>
            <label className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-1.5 block">
              발송 시각
            </label>
            <div className="flex gap-1 p-0.5 bg-stone-50 dark:bg-secondary rounded-lg w-fit">
              {(['now', 'schedule'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setScheduleMode(m)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    scheduleMode === m
                      ? 'bg-paper-card dark:bg-card text-ink dark:text-foreground shadow-sm'
                      : 'text-stone-400 dark:text-muted-foreground'
                  }`}
                >
                  {m === 'now' ? '즉시 발송' : '예약'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-1.5 block">
              딥링크 (선택)
            </label>
            <input
              type="text"
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              placeholder="/listings/123"
              className="w-full px-3 py-2 text-sm font-mono bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal"
            />
          </div>

          {sendError && <p className="text-xs text-critical">{sendError}</p>}

          <div className="pt-2 flex gap-2">
            <button className="px-3 py-2 text-sm bg-stone-50 dark:bg-secondary text-ink dark:text-foreground rounded-lg">
              초안 저장
            </button>
            <button
              onClick={send}
              disabled={!title.trim() || !body.trim() || sending}
              className="flex-1 px-3 py-2 text-sm bg-ink dark:bg-foreground text-paper-card dark:text-background rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={14} />
              {sending ? '발송 중…' : scheduleMode === 'now' ? '발송' : '예약'}
            </button>
          </div>
        </div>
      </div>

      <div className="col-span-6 bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl">
        <div className="px-5 py-4 border-b border-stone-100 dark:border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink dark:text-foreground">발송 이력</h3>
          <button
            onClick={load}
            className="text-xs text-stone-400 hover:text-ink dark:hover:text-foreground transition-colors flex items-center gap-1"
          >
            <RefreshCw size={11} />
            새로고침
          </button>
        </div>
        {loading && !history ? (
          <div className="p-5">
            <AdminSkeleton rows={4} />
          </div>
        ) : error && !history ? (
          <AdminErrorState message={error} onRetry={load} />
        ) : !history || history.length === 0 ? (
          <AdminEmptyState
            icon={Bell}
            title="아직 발송한 알림이 없습니다"
            description="왼쪽 폼에서 첫 알림을 작성해보세요."
          />
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-border max-h-[560px] overflow-y-auto">
            {history.map((p) => (
              <li key={p.id} className="px-5 py-4">
                <div className="flex items-start justify-between mb-2 gap-3">
                  <p className="text-sm font-medium text-ink dark:text-foreground flex-1 truncate">{p.title}</p>
                  <span className="text-xs text-stone-400 dark:text-muted-foreground shrink-0">{p.sentAt}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-stone-400 dark:text-muted-foreground shrink-0">
                    <span className="font-mono tabular-nums">{p.recipients.toLocaleString()}</span>명
                  </span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="flex-1 h-1 bg-stone-100 dark:bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ink dark:bg-foreground rounded-full transition-all"
                        style={{ width: `${p.openRate}%` }}
                      />
                    </div>
                    <span className="font-mono tabular-nums text-ink dark:text-foreground shrink-0">
                      {p.openRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
