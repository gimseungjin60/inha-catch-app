'use client'

import { useEffect, useState } from 'react'

interface DonutChartProps {
  value: number
  total: number
  label: string
}

export function DonutChart({ value, total, label }: DonutChartProps) {
  const [mounted, setMounted] = useState(false)
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  const percentage = (value / total) * 100
  const radius = 38
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    setMounted(true)
    
    // 부드러운 애니메이션
    const duration = 800
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      
      setAnimatedPercentage(percentage * eased)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [percentage])

  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg 
        width="100" 
        height="100" 
        viewBox="0 0 100 100"
        className={`transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--stone-200)"
          strokeWidth={strokeWidth}
          className="dark:stroke-stone-600"
        />
        
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
          className="dark:stroke-foreground transition-all duration-100"
        />
        
        {/* Center content */}
        <text
          x="50"
          y="46"
          textAnchor="middle"
          className="text-lg font-bold fill-ink dark:fill-foreground"
        >
          {value}
        </text>
        <text
          x="50"
          y="60"
          textAnchor="middle"
          className="text-[10px] fill-stone-400 dark:fill-muted-foreground"
        >
          / {total}
        </text>
      </svg>
      
      <p className="text-xs text-stone-400 dark:text-muted-foreground mt-2">{label}</p>
    </div>
  )
}
