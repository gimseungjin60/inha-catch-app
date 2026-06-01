'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  sparklineData?: number[]
  delay?: number
}

export function KPICard({ label, value, change, changeType = 'neutral', sparklineData, delay = 0 }: KPICardProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const getTrendIcon = () => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp size={12} className="text-emerald-500" />
      case 'negative':
        return <TrendingDown size={12} className="text-critical" />
      default:
        return <Minus size={12} className="text-stone-400" />
    }
  }

  return (
    <div 
      className={`bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 transition-all duration-300 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-stone-400 dark:text-muted-foreground">{label}</p>
        {change && (
          <div className={`flex items-center gap-1 text-[10px] ${
            changeType === 'positive' ? 'text-emerald-500' : 
            changeType === 'negative' ? 'text-critical' : 
            'text-stone-400'
          }`}>
            {getTrendIcon()}
            <span>{change}</span>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-ink dark:text-foreground tabular-nums">
          {value}
        </p>
        {sparklineData && sparklineData.length > 0 && (
          <Sparkline data={sparklineData} />
        )}
      </div>
    </div>
  )
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const height = 28
  const width = 56

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="var(--signal)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60"
      />
    </svg>
  )
}
