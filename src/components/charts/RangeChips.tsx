import type { ChartPeriodKey } from '../../types'
import { PERIODS } from '../../context/DateRangeContext'
import { cn } from '../../lib/utils'

interface RangeChipsProps {
  value: ChartPeriodKey
  onChange: (key: ChartPeriodKey) => void
  exclude?: ChartPeriodKey[]
  className?: string
}

export function RangeChips({ value, onChange, exclude = ['today', 'custom'], className }: RangeChipsProps) {
  const items = PERIODS.filter((p) => !exclude.includes(p.key))
  return (
    <div
      className={cn(
        'scrollbar-none flex items-center gap-1 overflow-x-auto rounded-lg bg-surface2 p-1',
        className,
      )}
      role="tablist"
      aria-label="Time range"
    >
      {items.map((p) => (
        <button
          key={p.key}
          role="tab"
          aria-selected={value === p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            'whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
            value === p.key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}