'use client'

import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-stone-50 dark:bg-secondary flex items-center justify-center mb-3">
        <Icon size={20} strokeWidth={1.5} className="text-stone-400 dark:text-muted-foreground" />
      </div>
      <h4 className="text-sm font-semibold text-ink dark:text-foreground mb-1">{title}</h4>
      <p className="text-xs text-stone-400 dark:text-muted-foreground max-w-xs leading-korean">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-3 py-1.5 text-xs bg-ink dark:bg-foreground text-paper-card dark:text-background rounded-lg"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export function AdminSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-stone-50 dark:bg-secondary rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-stone-50 dark:bg-secondary flex items-center justify-center mb-3">
        <AlertTriangle size={20} strokeWidth={1.5} className="text-critical" />
      </div>
      <h4 className="text-sm font-semibold text-ink dark:text-foreground mb-1">불러오지 못했어요</h4>
      <p className="text-xs text-stone-400 dark:text-muted-foreground mb-4 max-w-xs leading-korean">{message}</p>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 text-xs bg-stone-50 dark:bg-secondary text-ink dark:text-foreground rounded-lg flex items-center gap-1.5"
      >
        <RefreshCw size={12} />
        다시 시도
      </button>
    </div>
  )
}

export function SettingToggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string
  description: string
  enabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 mr-4">
        <p className="text-sm text-ink dark:text-foreground">{label}</p>
        <p className="text-xs text-stone-400 dark:text-muted-foreground mt-0.5 leading-korean">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-10 h-5 rounded-full shrink-0 transition-colors ${
          enabled ? 'bg-ink dark:bg-foreground' : 'bg-stone-200 dark:bg-stone-500'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-paper-card dark:bg-background rounded-full transition-transform ${
            enabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export function StatBar({ label, value, color }: { label: string; value: number; color: 'ink' | 'signal' | 'stone' }) {
  const colorClasses = {
    ink: 'bg-ink dark:bg-foreground',
    signal: 'bg-signal dark:bg-signal-dark',
    stone: 'bg-stone-400 dark:bg-stone-500',
  }

  return (
    <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-stone-400 dark:text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-ink dark:text-foreground tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 bg-stone-100 dark:bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${colorClasses[color]} rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
