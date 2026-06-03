'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, Play, RefreshCw, FileDown, Sparkles, Globe, Trash2, AlertTriangle } from 'lucide-react'
import { KPICard } from '@/components/inha-catch/KPICard'
import { adminFetch, API_BASE, getAdminToken } from '@/lib/admin-api'
import { AdminErrorState, AdminSkeleton } from './_shared'

type CrawlStats = {
  totalScholarships: number
  totalUsers: number
  totalNotifications: number
}

type CrawlAction = {
  key: string
  label: string
  description: string
  endpoint: string
  method: 'POST' | 'DELETE'
  icon: typeof Play
  variant: 'default' | 'danger'
}

const ACTIONS: CrawlAction[] = [
  {
    key: 'save',
    label: '증분 크롤링',
    description: '인하공전 신규 게시글만 수집 (권장)',
    endpoint: '/api/crawl/save',
    method: 'POST',
    icon: RefreshCw,
    variant: 'default',
  },
  {
    key: 'save-all',
    label: '전체 크롤링',
    description: '인하공전 전체 게시판 재수집',
    endpoint: '/api/crawl/save-all',
    method: 'POST',
    icon: FileDown,
    variant: 'default',
  },
  {
    key: 'backfill',
    label: 'AI 요약 채우기',
    description: '요약이 없는 공고에 Gemini 요약 생성',
    endpoint: '/api/crawl/backfill',
    method: 'POST',
    icon: Sparkles,
    variant: 'default',
  },
  {
    key: 'external',
    label: '외부 일괄 (위비티 + 씽굿)',
    description: '위비티 + 씽굿 동시 수집',
    endpoint: '/api/crawl/external',
    method: 'POST',
    icon: Globe,
    variant: 'default',
  },
  {
    key: 'wevity',
    label: '위비티만',
    description: 'wevity.com 공모전/대외활동',
    endpoint: '/api/crawl/external/wevity',
    method: 'POST',
    icon: Globe,
    variant: 'default',
  },
  {
    key: 'thinkcontest',
    label: '씽굿만',
    description: 'thinkcontest.com 공모전',
    endpoint: '/api/crawl/external/thinkcontest',
    method: 'POST',
    icon: Globe,
    variant: 'default',
  },
  {
    key: 'list',
    label: '목록만 미리보기',
    description: '크롤링 결과를 DB 저장 없이 조회',
    endpoint: '/api/crawl/list',
    method: 'POST',
    icon: Activity,
    variant: 'default',
  },
  {
    key: 'clear',
    label: '전체 공고 삭제',
    description: '⚠️ 복구 불가. 신중히 사용하세요.',
    endpoint: '/api/crawl/clear',
    method: 'DELETE',
    icon: Trash2,
    variant: 'danger',
  },
]

type LogEntry = {
  id: number
  time: string
  level: 'INFO' | 'WARN' | 'ERROR'
  action: string
  message: string
}

let logIdCounter = 0

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

export function AdminCrawling() {
  const [stats, setStats] = useState<CrawlStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await adminFetch<CrawlStats>('/api/crawl/stats')
      setStats(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const appendLog = (level: LogEntry['level'], action: string, message: string) => {
    setLogs((prev) =>
      [{ id: ++logIdCounter, time: nowTime(), level, action, message }, ...prev].slice(0, 100)
    )
  }

  const runAction = async (action: CrawlAction) => {
    if (action.variant === 'danger') {
      if (!confirm(`정말 "${action.label}"을 실행하시겠어요?\n${action.description}`)) return
      // 추가 안전장치 — 정확한 문구 타이핑 확인
      const typed = prompt(
        `복구할 수 없는 작업이에요. 계속하려면 아래 문구를 정확히 입력해주세요:\n\n전체 삭제`
      )
      if (typed?.trim() !== '전체 삭제') {
        alert('입력값이 일치하지 않아 작업을 취소했어요.')
        return
      }
    }
    setPendingKey(action.key)
    appendLog('INFO', action.key, `${action.label} 시작…`)
    try {
      // 크롤링 액션은 응답 형식이 String 또는 List 라서 raw fetch 사용
      const token = getAdminToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}${action.endpoint}`, { method: action.method, headers })
      const contentType = res.headers.get('content-type') ?? ''
      let body: string
      if (contentType.includes('application/json')) {
        const json = await res.json()
        body = typeof json === 'string' ? json : `${JSON.stringify(json).slice(0, 200)}…`
      } else {
        body = await res.text()
      }

      if (!res.ok) {
        appendLog('ERROR', action.key, `${res.status} ${res.statusText} ─ ${body.slice(0, 200)}`)
      } else {
        appendLog('INFO', action.key, body.slice(0, 200))
        load() // stats 갱신
      }
    } catch (e) {
      appendLog('ERROR', action.key, e instanceof Error ? e.message : '네트워크 오류')
    } finally {
      setPendingKey(null)
    }
  }

  if (loading && !stats) return <AdminSkeleton rows={3} />

  return (
    <div className="space-y-5">
      {error && !stats && <AdminErrorState message={error} onRetry={load} />}

      <div className="grid grid-cols-3 gap-4">
        <KPICard label="전체 공고" value={stats?.totalScholarships?.toLocaleString() ?? '—'} delay={0} />
        <KPICard label="전체 사용자" value={stats?.totalUsers?.toLocaleString() ?? '—'} delay={50} />
        <KPICard label="발송 알림" value={stats?.totalNotifications?.toLocaleString() ?? '—'} delay={100} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink dark:text-foreground mb-3">크롤링 작업</h3>
        <div className="grid grid-cols-4 gap-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon
            const isPending = pendingKey === action.key
            const isDanger = action.variant === 'danger'
            return (
              <button
                key={action.key}
                onClick={() => runAction(action)}
                disabled={pendingKey !== null}
                className={`text-left p-4 rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDanger
                    ? 'bg-paper-card dark:bg-card border-critical/30 hover:bg-critical/5'
                    : 'bg-paper-card dark:bg-card border-stone-100 dark:border-border hover:bg-stone-50/60 dark:hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Icon size={18} strokeWidth={1.5} className={isDanger ? 'text-critical' : 'text-stone-400'} />
                  {isPending && (
                    <span className="text-[10px] font-mono text-signal dark:text-signal-dark">RUNNING…</span>
                  )}
                </div>
                <p className={`text-sm font-medium mb-1 ${isDanger ? 'text-critical' : 'text-ink dark:text-foreground'}`}>
                  {action.label}
                </p>
                <p className="text-xs text-stone-400 dark:text-muted-foreground leading-korean">{action.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl">
        <div className="px-5 py-3 border-b border-stone-100 dark:border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-ink dark:text-foreground">실행 로그</h3>
            <span className="text-[10px] text-stone-400 font-mono">{logs.length} entries</span>
          </div>
          <button
            onClick={() => setLogs([])}
            disabled={logs.length === 0}
            className="text-xs text-stone-400 hover:text-ink dark:hover:text-foreground transition-colors disabled:opacity-30"
          >
            지우기
          </button>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-4 bg-stone-50/50 dark:bg-paper-dark/50 font-mono text-xs leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-stone-400 text-center py-8">아직 실행 기록이 없습니다.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-3 py-0.5">
                <span className="text-stone-400 tabular-nums shrink-0">[{log.time}]</span>
                <span
                  className={`shrink-0 w-12 font-semibold ${
                    log.level === 'INFO'
                      ? 'text-stone-400'
                      : log.level === 'WARN'
                      ? 'text-amber-600'
                      : 'text-critical'
                  }`}
                >
                  {log.level}
                </span>
                <span className="shrink-0 w-24 text-stone-500">{log.action}</span>
                <span className="text-ink dark:text-foreground break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-paper-card dark:bg-card border border-critical/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-critical shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-critical mb-1">주의</p>
          <p className="text-xs text-stone-400 dark:text-muted-foreground leading-korean">
            크롤링 작업은 외부 사이트의 응답 속도에 따라 수십 초~수 분이 걸릴 수 있어요. "전체 삭제"는 복구 불가하니
            신중히 사용하세요.
          </p>
        </div>
      </div>
    </div>
  )
}
