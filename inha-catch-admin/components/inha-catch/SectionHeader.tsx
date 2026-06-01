interface SectionHeaderProps {
  title: string
  subtitle?: string
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h2 className="text-xs font-medium text-stone-400 dark:text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      {subtitle && (
        <>
          <span className="text-stone-300 dark:text-stone-500">─</span>
          <span className="text-xs text-stone-400 dark:text-muted-foreground">{subtitle}</span>
        </>
      )}
    </div>
  )
}
