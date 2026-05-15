'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, FileText, Trash2, ExternalLink } from 'lucide-react'
import { adminFetch } from '@/lib/admin-api'
import { AdminEmptyState, AdminErrorState, AdminSkeleton } from './_shared'

type ScholarshipRow = {
  id: number
  title: string
  category: string | null
  postUrl: string | null
  postedAt: string | null
  applyPeriod: string | null
  viewCount: number | null
  crawledAt: string | null
  sourceSite: string | null
}

type ScholarshipPage = {
  content?: ScholarshipRow[]
  totalElements?: number
  totalPages?: number
  number?: number
}

const PAGE_SIZE = 20

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return iso
  }
}

export function AdminPosts() {
  const [rows, setRows] = useState<ScholarshipRow[] | null>(null)
  const [meta, setMeta] = useState<{ total: number; pages: number; current: number }>({
    total: 0,
    pages: 1,
    current: 0,
  })
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all')
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const path = keyword.trim()
        ? `/api/scholarships/search?keyword=${encodeURIComponent(keyword.trim())}&page=${page}&size=${PAGE_SIZE}`
        : `/api/scholarships?page=${page}&size=${PAGE_SIZE}`
      const data = await adminFetch<ScholarshipPage | ScholarshipRow[]>(path)
      // Page<Scholarship> 또는 List<Scholarship> 응답 모두 처리
      if (Array.isArray(data)) {
        setRows(data)
        setMeta({ total: data.length, pages: 1, current: 0 })
      } else {
        setRows(data.content ?? [])
        setMeta({
          total: data.totalElements ?? data.content?.length ?? 0,
          pages: data.totalPages ?? 1,
          current: data.number ?? 0,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [page, keyword])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!rows) return []
    if (categoryFilter === 'all') return rows
    return rows.filter((r) => (r.category ?? '').toLowerCase() === categoryFilter.toLowerCase())
  }, [rows, categoryFilter])

  const remove = async (id: number) => {
    if (!confirm('이 공고를 정말 삭제하시겠어요? 되돌릴 수 없습니다.')) return
    setDeleting(id)
    try {
      await adminFetch(`/api/admin/scholarships/${id}`, { method: 'DELETE' })
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    } finally {
      setDeleting(null)
    }
  }

  if (loading && !rows) return <AdminSkeleton rows={8} />
  if (error && !rows) return <AdminErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-0.5 bg-stone-50 dark:bg-secondary rounded-lg">
            {(['all', 'SCHOLARSHIP', 'CONTEST', 'NOTICE'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  categoryFilter === c
                    ? 'bg-paper-card dark:bg-card text-ink dark:text-foreground shadow-sm'
                    : 'text-stone-400 dark:text-muted-foreground'
                }`}
              >
                {c === 'all' ? '전체' : c === 'SCHOLARSHIP' ? '장학금' : c === 'CONTEST' ? '공모전' : '공지'}
              </button>
            ))}
          </div>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="제목 또는 본문에서 검색"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(0)
            }}
            className="w-full pl-8 pr-3 py-2 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal"
          />
        </div>
      </div>

      <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <AdminEmptyState
            icon={FileText}
            title={keyword ? '검색 결과가 없습니다' : '아직 공고가 없습니다'}
            description={keyword ? '다른 키워드로 검색해보세요.' : '크롤러를 실행하면 공고가 수집됩니다.'}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-stone-400 dark:text-muted-foreground bg-stone-50 dark:bg-secondary">
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium w-24">카테고리</th>
                <th className="px-4 py-3 font-medium w-36">출처</th>
                <th className="px-4 py-3 font-medium w-28">신청 기간</th>
                <th className="px-4 py-3 font-medium w-24">수집일</th>
                <th className="px-4 py-3 font-medium w-20 text-right">조회수</th>
                <th className="px-4 py-3 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-stone-100 dark:border-border hover:bg-stone-50/60 dark:hover:bg-secondary/60"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm text-ink dark:text-foreground line-clamp-1">{row.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-stone-400 dark:text-muted-foreground">
                      {row.category === 'SCHOLARSHIP'
                        ? '장학금'
                        : row.category === 'CONTEST'
                        ? '공모전'
                        : row.category === 'NOTICE'
                        ? '공지'
                        : row.category ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-stone-400 dark:text-muted-foreground truncate block max-w-[180px]">
                      {row.sourceSite ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-stone-400 dark:text-muted-foreground line-clamp-1">
                      {row.applyPeriod ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-stone-400 dark:text-muted-foreground tabular-nums">
                      {fmtDate(row.crawledAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-xs text-stone-400 dark:text-muted-foreground tabular-nums">
                      {row.viewCount?.toLocaleString() ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {row.postUrl && (
                        <a
                          href={row.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-stone-100 dark:hover:bg-muted rounded"
                          title="원문 열기"
                        >
                          <ExternalLink size={14} className="text-stone-400" />
                        </a>
                      )}
                      <button
                        onClick={() => remove(row.id)}
                        disabled={deleting === row.id}
                        className="p-1 hover:bg-critical/10 rounded disabled:opacity-30"
                        title="삭제"
                      >
                        <Trash2 size={14} className="text-stone-400 hover:text-critical" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-stone-400">
          <span>
            {meta.total.toLocaleString()}건 중 {meta.current * PAGE_SIZE + 1}–
            {Math.min((meta.current + 1) * PAGE_SIZE, meta.total)} 표시
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={meta.current === 0}
              className="px-2 py-1 rounded hover:bg-stone-50 dark:hover:bg-secondary disabled:opacity-30"
            >
              ←
            </button>
            <span className="px-2 py-1 font-mono">
              {meta.current + 1} / {meta.pages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={meta.current + 1 >= meta.pages}
              className="px-2 py-1 rounded hover:bg-stone-50 dark:hover:bg-secondary disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
