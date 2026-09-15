import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { PctInfo } from '../../services/calculations'
import { formatCurrency, formatPct } from '../../lib/utils'
import { cn } from '../../lib/utils'

interface Props {
  info: PctInfo
  currency?: string
  showAbsolute?: boolean
  decimals?: number
  className?: string
  absClassName?: string
}

export function ChangeIndicator({ info, currency = 'PKR', showAbsolute = true, decimals = 2, className }: Props) {
  if (!info.ok || info.pct === null) {
    return <span className={cn('text-xs text-faint', className)}>—</span>
  }
  const positive = info.pct > 0
  const negative = info.pct < 0
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', className)}>
      <Icon
        className={cn(
          'h-4 w-4',
          positive ? 'text-positive' : negative ? 'text-negative' : 'text-muted',
        )}
      />
      {positive && <span className="text-positive">{'+'}{info.absolute !== null && showAbsolute ? formatCurrency(info.absolute, currency) : ''}</span>}
      {negative && <span className="text-negative">{'-'}{info.absolute !== null && showAbsolute ? formatCurrency(Math.abs(info.absolute), currency) : ''}</span>}
      {!positive && !negative && <span className="text-muted">{formatCurrency(0, currency)}</span>}
      <span
        className={cn(
          'text-xs font-medium',
          positive ? 'text-positive' : negative ? 'text-negative' : 'text-muted',
        )}
      >
        {positive ? '+' : ''}
        {formatPct(info.pct, { decimals }).replace('%', '')}%
      </span>
    </span>
  )
}

/** Bare up/down/flat arrow with % (for tight table cells / pills). */
export function ArrowPct({ value, decimals = 2, className }: { value: number | null; decimals?: number; className?: string }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className={cn('text-xs text-faint', className)}>—</span>
  }
  const positive = value > 0
  const negative = value < 0
  return (
    <span
      className={cn(
        'num inline-flex items-center gap-1 text-xs font-semibold',
        positive ? 'text-positive' : negative ? 'text-negative' : 'text-muted',
        className,
      )}
    >
      {positive ? '▲' : negative ? '▼' : '◆'} {positive ? '+' : ''}{value.toFixed(decimals)}%
    </span>
  )
}