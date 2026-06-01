'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Users, Shield, Power, Mail } from 'lucide-react'
import { KPICard } from '@/components/inha-catch/KPICard'
import { adminFetch } from '@/lib/admin-api'
import { AdminEmptyState, AdminErrorState, AdminSkeleton } from './_shared'

type AdminUserRow = {
  id: number
  email: string
  name: string | null
  major: string | null
  role: 'USER' | 'ADMIN'
  provider: 'LOCAL' | 'KAKAO' | string
  isActive: boolean | null
  createdAt: string | null
  hasFcmToken: boolean
}

type UsersPage = {
  content: AdminUserRow[]
  totalElements: number
  totalPages: number
  number: number
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

export function AdminUsers() {
  const [resp, setResp] = useState<UsersPage | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'USER' | 'ADMIN'>('all')
  const [actionPending, setActionPending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetch<UsersPage>(`/api/admin/users?page=${page}&size=${PAGE_SIZE}`)
      setResp(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!resp) return []
    return resp.content.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (keyword) {
        const k = keyword.toLowerCase()
        const name = (u.name ?? '').toLowerCase()
        if (!name.includes(k) && !u.email.toLowerCase().includes(k)) return false
      }
      return true
    })
  }, [resp, roleFilter, keyword])

  const selected = resp?.content.find((u) => u.id === selectedId) ?? null

  const changeRole = async (id: number, role: 'USER' | 'ADMIN', userName: string) => {
    const msg = role === 'ADMIN'
      ? `${userName}님께 관리자 권한을 부여하시겠어요?\n이 사용자는 어드민 콘솔에 접근할 수 있게 됩니다.`
      : `${userName}님의 관리자 권한을 해제하시겠어요?`
    if (!confirm(msg)) return

    setActionPending(true)
    try {
      await adminFetch(`/api/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      })
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : '권한 변경 실패')
    } finally {
      setActionPending(false)
    }
  }

  const toggleActive = async (id: number, currentActive: boolean, userName: string) => {
    const msg = currentActive
      ? `${userName}님 계정을 비활성화하시겠어요?\n비활성 사용자는 로그인할 수 없게 됩니다.`
      : `${userName}님 계정을 다시 활성화하시겠어요?`
    if (!confirm(msg)) return

    setActionPending(true)
    try {
      await adminFetch(`/api/admin/users/${id}/toggle-active`, { method: 'PUT' })
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : '상태 변경 실패')
    } finally {
      setActionPending(false)
    }
  }

  const adminCount = resp?.content.filter((u) => u.role === 'ADMIN').length ?? 0
  const activeCount = resp?.content.filter((u) => u.isActive).length ?? 0

  if (loading && !resp) return <AdminSkeleton rows={6} />
  if (error && !resp) return <AdminErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <KPICard label="전체 사용자" value={resp?.totalElements?.toLocaleString() ?? '—'} delay={0} />
        <KPICard label={`현재 페이지 활성`} value={activeCount} delay={50} />
        <KPICard label="현재 페이지 관리자" value={adminCount} delay={100} />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-6 bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl flex flex-col">
          <div className="p-4 border-b border-stone-100 dark:border-border flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="이름 또는 이메일로 검색"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal"
              />
            </div>
            <div className="flex gap-1 p-0.5 bg-stone-50 dark:bg-secondary rounded-lg">
              {(['all', 'USER', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    roleFilter === r
                      ? 'bg-paper-card dark:bg-card text-ink dark:text-foreground shadow-sm'
                      : 'text-stone-400 dark:text-muted-foreground'
                  }`}
                >
                  {r === 'all' ? '전체' : r === 'USER' ? '학생' : '관리자'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[520px]">
            {filtered.length === 0 ? (
              <AdminEmptyState
                icon={Users}
                title={resp && resp.totalElements > 0 ? '검색 결과가 없습니다' : '아직 사용자가 없습니다'}
                description={
                  resp && resp.totalElements > 0
                    ? '검색어나 필터를 바꿔보세요.'
                    : '사용자가 가입하면 여기에 표시됩니다.'
                }
              />
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-border">
                {filtered.map((user) => (
                  <li key={user.id}>
                    <button
                      onClick={() => setSelectedId(user.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        selectedId === user.id
                          ? 'bg-stone-50 dark:bg-secondary'
                          : 'hover:bg-stone-50/50 dark:hover:bg-secondary/50'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-500 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-paper-card dark:text-background">
                          {(user.name ?? user.email)[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink dark:text-foreground truncate">
                          {user.name ?? '(이름 없음)'}
                        </p>
                        <p className="text-xs text-stone-400 dark:text-muted-foreground truncate">
                          {user.major ?? '학과 미지정'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!user.isActive && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-critical/10 text-critical rounded">
                            비활성
                          </span>
                        )}
                        {user.role === 'ADMIN' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-ink dark:bg-foreground text-paper-card dark:text-background rounded">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {resp && resp.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-stone-100 dark:border-border flex items-center justify-between text-xs text-stone-400">
              <span>
                {resp.totalElements.toLocaleString()}명 중 {resp.number * PAGE_SIZE + 1}–
                {Math.min((resp.number + 1) * PAGE_SIZE, resp.totalElements)} 표시
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={resp.number === 0}
                  className="px-2 py-1 rounded hover:bg-stone-50 dark:hover:bg-secondary disabled:opacity-30"
                >
                  ←
                </button>
                <span className="px-2 py-1 font-mono">
                  {resp.number + 1} / {resp.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={resp.number + 1 >= resp.totalPages}
                  className="px-2 py-1 rounded hover:bg-stone-50 dark:hover:bg-secondary disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-6 bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl">
          {!selected ? (
            <AdminEmptyState
              icon={Users}
              title="사용자를 선택해주세요"
              description="왼쪽 목록에서 사용자를 클릭하면 상세 정보가 표시됩니다."
            />
          ) : (
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-paper-card dark:text-background">
                    {(selected.name ?? selected.email)[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink dark:text-foreground">
                    {selected.name ?? '(이름 없음)'}
                  </h3>
                  <p className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mt-0.5">
                    {selected.major ?? '학과 미지정'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-md ${
                      selected.role === 'ADMIN'
                        ? 'bg-ink dark:bg-foreground text-paper-card dark:text-background'
                        : 'bg-stone-50 dark:bg-secondary text-stone-400 dark:text-muted-foreground'
                    }`}
                  >
                    {selected.role === 'ADMIN' ? '관리자' : '학생'}
                  </span>
                  {!selected.isActive && (
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-critical/10 text-critical rounded-md">
                      비활성
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 pb-6 border-b border-stone-100 dark:border-border">
                <div>
                  <p className="text-xs text-stone-400 dark:text-muted-foreground mb-0.5">이메일</p>
                  <p className="text-sm text-ink dark:text-foreground truncate flex items-center gap-1">
                    <Mail size={12} className="text-stone-400" />
                    {selected.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 dark:text-muted-foreground mb-0.5">로그인 방식</p>
                  <p className="text-sm text-ink dark:text-foreground">{selected.provider}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 dark:text-muted-foreground mb-0.5">가입일</p>
                  <p className="text-sm font-mono tabular-nums text-ink dark:text-foreground">
                    {fmtDate(selected.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 dark:text-muted-foreground mb-0.5">FCM 토큰</p>
                  <p className="text-sm text-ink dark:text-foreground">{selected.hasFcmToken ? '등록됨' : '없음'}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    changeRole(
                      selected.id,
                      selected.role === 'ADMIN' ? 'USER' : 'ADMIN',
                      selected.name ?? selected.email
                    )
                  }
                  disabled={actionPending}
                  className="flex-1 px-3 py-2 text-sm bg-stone-50 dark:bg-secondary text-ink dark:text-foreground rounded-lg flex items-center justify-center gap-1.5 hover:bg-stone-100 dark:hover:bg-muted transition-colors disabled:opacity-40"
                >
                  <Shield size={14} />
                  {selected.role === 'ADMIN' ? '관리자 해제' : '관리자로 승급'}
                </button>
                <button
                  onClick={() => toggleActive(selected.id, !!selected.isActive, selected.name ?? selected.email)}
                  disabled={actionPending}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 ${
                    selected.isActive
                      ? 'border border-critical/40 text-critical hover:bg-critical/5'
                      : 'bg-stone-50 dark:bg-secondary text-ink dark:text-foreground hover:bg-stone-100 dark:hover:bg-muted'
                  }`}
                >
                  <Power size={14} />
                  {selected.isActive ? '비활성화' : '활성화'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
