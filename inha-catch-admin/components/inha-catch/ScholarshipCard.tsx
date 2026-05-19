'use client'

import { Bookmark } from 'lucide-react'

interface ScholarshipCardProps {
  title: string
  category: string
  source: string
  dDay: number
  aiSummary?: string[]
  tags: string[]
  isSignal?: boolean
  isBookmarked?: boolean
  onBookmark?: () => void
  onClick?: () => void
  size?: 'default' | 'large'
}

export function ScholarshipCard({
  title,
  category,
  source,
  dDay,
  aiSummary,
  tags,
  isSignal = false,
  isBookmarked = false,
  onBookmark,
  onClick,
  size = 'default',
}: ScholarshipCardProps) {
  const isUrgent = dDay <= 3

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-paper-card dark:bg-card border border-stone-100 dark:border-border
        rounded-[14px] p-4 paper-grain cursor-pointer
        transition-colors hover:bg-stone-50 dark:hover:bg-secondary
        ${size === 'large' ? 'min-w-[280px]' : 'min-w-[240px]'}
      `}
    >
      {/* Margin Marker */}
      <div
        className={`absolute left-0 top-4 w-[5px] h-6 rounded-r-sm ${
          isSignal ? 'bg-signal dark:bg-signal-dark' : 'bg-ink dark:bg-foreground'
        }`}
      />

      {/* Meta line */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-stone-400 dark:text-muted-foreground">
          {category} ─ {source}
        </p>
        <div className="flex items-center gap-1">
          {isUrgent && <span className="w-1.5 h-1.5 rounded-full bg-critical" />}
          <span className="font-mono text-lg font-medium tracking-tight-custom tabular-nums text-ink dark:text-foreground">
            D-{String(dDay).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-ink dark:text-foreground leading-snug line-clamp-2 mb-3 ${
        size === 'large' ? 'text-lg' : 'text-base'
      }`}>
        {title}
      </h3>

      {/* AI Summary */}
      {aiSummary && aiSummary.length > 0 && (
        <div className="bg-signal-soft dark:bg-signal-soft-dark rounded-lg p-3 mb-3">
          <p className="text-xs text-stone-400 dark:text-muted-foreground mb-1.5">AI 요약</p>
          <ul className="space-y-1">
            {aiSummary.map((item, i) => (
              <li key={i} className="text-sm text-ink dark:text-foreground leading-korean">
                — {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags and Bookmark */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs bg-stone-50 dark:bg-secondary text-ink dark:text-foreground rounded-lg"
            >
              {tag}
            </span>
          ))}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onBookmark?.()
          }}
          className="p-1.5 -mr-1.5 hover:bg-stone-100 dark:hover:bg-secondary rounded-lg transition-colors"
        >
          <Bookmark
            size={18}
            strokeWidth={1.5}
            className={isBookmarked ? 'fill-ink dark:fill-foreground text-ink dark:text-foreground' : 'text-stone-400 dark:text-muted-foreground'}
          />
        </button>
      </div>
    </div>
  )
}
