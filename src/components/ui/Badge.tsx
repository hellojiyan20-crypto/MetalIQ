import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Tone = 'gold' | 'silver' | 'positive' | 'negative' | 'neutral'

const tones: Record<Tone, string> = {
  gold: 'bg-gold-bg text-gold border-gold/20',
  silver: 'bg-silver-bg text-silver border-silver/25',
  positive: 'bg-positive-bg text-positive border-positive/20',
  negative: 'bg-negative-bg text-negative border-negative/20',
  neutral: 'bg-surface2 text-muted border-edge',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Colored delta pill — for profit/loss, changes, returns. */
export function DeltaBadge({
  value,
  decimals = 2,
  suffix = '%',
  invert = false,
  className,
}: {
  value: number | null
  decimals?: number
  suffix?: string
  invert?: boolean
  className?: string
}) {
  if (value === null || !Number.isFinite(value)) return <Badge tone="neutral">—</Badge>
  const positive = value > 0
  const negative = value < 0
  const zero = !positive && !negative
  let tone: Tone = 'neutral'
  if (!invert) {
    if (positive) tone = 'positive'
    else if (negative) tone = 'negative'
  } else {
    if (positive) tone = 'negative'
    else if (negative) tone = 'positive'
  }
  return (
    <Badge tone={zero ? 'neutral' : tone} className={className}>
      {positive ? '▲' : negative ? '▼' : '◆'} {positive ? '+' : ''}
      {value.toFixed(decimals)}
      {suffix}
    </Badge>
  )
}