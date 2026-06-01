interface ChipProps {
  label: string
  isActive?: boolean
  onClick?: () => void
}

export function Chip({ label, isActive = false, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-sm rounded-lg transition-colors
        ${isActive 
          ? 'bg-ink dark:bg-foreground text-paper-card dark:text-background' 
          : 'bg-stone-50 dark:bg-secondary text-ink dark:text-foreground hover:bg-stone-100 dark:hover:bg-muted'
        }
      `}
    >
      {label}
    </button>
  )
}

interface SegmentedTabsProps {
  tabs: string[]
  activeIndex: number
  onChange: (index: number) => void
}

export function SegmentedTabs({ tabs, activeIndex, onChange }: SegmentedTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-stone-50 dark:bg-secondary rounded-[10px]">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => onChange(i)}
          className={`
            flex-1 px-3 py-1.5 text-sm rounded-lg transition-all
            ${activeIndex === i 
              ? 'bg-paper-card dark:bg-card text-ink dark:text-foreground shadow-sm' 
              : 'text-stone-400 dark:text-muted-foreground hover:text-ink dark:hover:text-foreground'
            }
          `}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
