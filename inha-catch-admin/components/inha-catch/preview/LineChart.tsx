'use client'

import { useEffect, useState, useRef } from 'react'

interface LineChartProps {
  data: { label: string; scholarship: number; competition: number }[]
}

export function LineChart({ data }: LineChartProps) {
  const [mounted, setMounted] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)

  const maxValue = Math.max(...data.flatMap(d => [d.scholarship, d.competition]))
  const height = 180
  const padding = { top: 16, right: 16, bottom: 32, left: 40 }
  const chartHeight = height - padding.top - padding.bottom
  const chartWidth = 400 - padding.left - padding.right

  useEffect(() => {
    setMounted(true)
  }, [])

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight

  // 라인 경로 생성
  const createPath = (getValue: (d: typeof data[0]) => number) => {
    return data.map((d, i) => {
      const x = getX(i)
      const y = getY(getValue(d))
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    }).join(' ')
  }

  const scholarshipPath = createPath(d => d.scholarship)
  const competitionPath = createPath(d => d.competition)

  // Grid lines - 고정 값 사용
  const gridValues = [0, 10, 20, 30, 40]

  return (
    <div ref={chartRef} className="w-full">
      <svg 
        viewBox={`0 0 400 ${height}`} 
        className="w-full h-auto" 
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid */}
        {gridValues.map((value) => {
          const y = getY(value)
          return (
            <g key={value}>
              <line
                x1={padding.left}
                y1={y}
                x2={400 - padding.right}
                y2={y}
                stroke="var(--stone-100)"
                strokeWidth="1"
                className="dark:stroke-border"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-stone-400 dark:fill-muted-foreground font-mono"
              >
                {value}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {data.filter((_, i) => i % 6 === 0).map((d, idx) => {
          const i = idx * 6
          const x = getX(i)
          return (
            <text
              key={d.label}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] fill-stone-400 dark:fill-muted-foreground font-mono"
            >
              {d.label}
            </text>
          )
        })}

        {/* Lines with animation */}
        <path
          d={scholarshipPath}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`dark:stroke-foreground transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}
          style={{
            strokeDasharray: mounted ? 'none' : '1000',
            strokeDashoffset: mounted ? '0' : '1000'
          }}
        />
        <path
          d={competitionPath}
          fill="none"
          stroke="var(--signal)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-all duration-1000 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        />
      </svg>

      {/* Legend */}
      <div className={`flex items-center justify-center gap-6 mt-3 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-ink dark:bg-foreground rounded-full" />
          <span className="text-xs text-stone-400 dark:text-muted-foreground">장학금</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-signal rounded-full" />
          <span className="text-xs text-stone-400 dark:text-muted-foreground">공모전</span>
        </div>
      </div>
    </div>
  )
}
