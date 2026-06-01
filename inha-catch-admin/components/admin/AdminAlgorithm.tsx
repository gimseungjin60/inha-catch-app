'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Sparkles, RotateCw, Save } from 'lucide-react'
import { adminFetch } from '@/lib/admin-api'
import { AdminEmptyState, AdminErrorState, AdminSkeleton } from './_shared'

type Weight = { key: string; label: string; value: number; desc: string }
type RecoPreview = { rank: number; title: string; score: number; category: string }

export function AdminAlgorithm() {
  const [weights, setWeights] = useState<Weight[] | null>(null)
  const [initial, setInitial] = useState<Weight[] | null>(null)
  const [preview, setPreview] = useState<RecoPreview[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [w, p] = await Promise.all([
        adminFetch<Weight[]>('/api/admin/algorithm/weights'),
        adminFetch<RecoPreview[]>('/api/admin/algorithm/preview'),
      ])
      setWeights(w)
      setInitial(w)
      setPreview(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const dirty = useMemo(() => {
    if (!weights || !initial) return false
    return weights.some((w, i) => Math.abs(w.value - initial[i].value) > 0.001)
  }, [weights, initial])

  const total = weights?.reduce((s, w) => s + w.value, 0) ?? 0
  const totalValid = Math.abs(total - 1) < 0.001

  const updateWeight = (key: string, value: number) => {
    if (!weights) return
    setWeights(weights.map((w) => (w.key === key ? { ...w, value } : w)))
  }

  const save = async () => {
    if (!weights) return
    setSaving(true)
    try {
      await adminFetch('/api/admin/algorithm/weights', {
        method: 'PUT',
        body: JSON.stringify({ weights }),
      })
      const p = await adminFetch<RecoPreview[]>('/api/admin/algorithm/preview')
      setPreview(p)
      setInitial(weights)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    if (initial) setWeights(initial)
  }

  if (loading && !weights) return <AdminSkeleton rows={5} />
  if (error && !weights) return <AdminErrorState message={error} onRetry={load} />

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-7 bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl">
        <div className="px-5 py-4 border-b border-stone-100 dark:border-border">
          <h3 className="text-sm font-semibold text-ink dark:text-foreground">가중치</h3>
          <p className="text-xs text-stone-400 dark:text-muted-foreground mt-1">전체 항목의 합은 1.00 이어야 합니다.</p>
        </div>
        {!weights || weights.length === 0 ? (
          <AdminEmptyState
            icon={Sparkles}
            title="가중치 설정이 없습니다"
            description="백엔드에서 기본 가중치를 등록해주세요."
          />
        ) : (
          <div className="p-5 space-y-5">
            {weights.map((w) => (
              <div key={w.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-ink dark:text-foreground">{w.label}</label>
                  <span className="text-sm font-mono tabular-nums text-ink dark:text-foreground">
                    {w.value.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={w.value}
                  onChange={(e) => updateWeight(w.key, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-stone-100 dark:bg-secondary rounded-full appearance-none cursor-pointer accent-ink dark:accent-foreground"
                />
                <p className="text-xs text-stone-400 dark:text-muted-foreground mt-1 leading-korean">{w.desc}</p>
              </div>
            ))}

            <div className="pt-4 border-t border-stone-100 dark:border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider">합계</span>
                <span
                  className={`text-sm font-mono tabular-nums font-semibold ${
                    totalValid ? 'text-emerald-600' : 'text-critical'
                  }`}
                >
                  {total.toFixed(2)} / 1.00
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  disabled={!dirty}
                  className="px-3 py-1.5 text-sm bg-stone-50 dark:bg-secondary text-ink dark:text-foreground rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <RotateCw size={14} />
                  초기화
                </button>
                <button
                  onClick={save}
                  disabled={!dirty || !totalValid || saving}
                  className="px-3 py-1.5 text-sm bg-ink dark:bg-foreground text-paper-card dark:text-background rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Save size={14} />
                  {saving ? '저장 중…' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="col-span-5 bg-signal-soft dark:bg-signal-soft-dark border border-signal/20 dark:border-signal/40 rounded-xl">
        <div className="px-5 py-4 border-b border-signal/20 dark:border-signal/40">
          <p className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider">Preview</p>
          <h3 className="text-sm font-semibold text-ink dark:text-foreground mt-0.5">현재 가중치로 상위 5개</h3>
        </div>
        {!preview || preview.length === 0 ? (
          <AdminEmptyState
            icon={Sparkles}
            title="추천 결과가 없습니다"
            description="공고가 등록되면 자동으로 계산됩니다."
          />
        ) : (
          <ul className="p-3 space-y-1">
            {preview.map((p) => (
              <li key={p.rank} className="flex items-center gap-3 px-3 py-2.5 bg-paper-card/70 dark:bg-card/70 rounded-lg">
                <span className="text-sm font-mono tabular-nums text-stone-400 w-5 shrink-0">{p.rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink dark:text-foreground truncate">{p.title}</p>
                  <p className="text-xs text-stone-400 dark:text-muted-foreground mt-0.5">{p.category}</p>
                </div>
                <span className="text-sm font-mono tabular-nums font-semibold text-signal dark:text-signal-dark shrink-0">
                  {p.score.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
