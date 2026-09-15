import { ArrowUpRight, ArrowDownRight, MoveRight } from 'lucide-react'
import type { TrendResult } from '../../services/calculations'
import { formatCurrency } from '../../lib/utils'
import { cn } from '../../lib/utils'

export function TrendBadge({ trend, className }: { trend: TrendResult; className?: string }) {
  const up = trend.direction === 'up'
  const down = trend.direction === 'down'
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : MoveRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold',
        up ? 'border-positive/25 bg-positive-bg text-positive' : down ? 'border-negative/25 bg-negative-bg text-negative' : 'border-edge bg-surface2 text-muted',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {trend.label}
    </span>
  )
}

export function TrendSummary({ trend, assetLabel, currency }: { trend: TrendResult; assetLabel: string; currency: string }) {
  if (!trend.sufficient) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{assetLabel}</span>
        </div>
        <p className="text-xs text-muted">Insufficient data for a trend reading (needs ~30 days).</p>
      </div>
    )
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{assetLabel}</p>
          <p className="mt-0.5 text-xs text-muted">
            Current {formatCurrency(trend.current, currency)} · score {trend.score}/5
          </p>
        </div>
        <TrendBadge trend={trend} />
      </div>

      <div className="mt-3 space-y-2">
        {trend.reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-muted">
            <span
              className={cn(
                'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                r.kind === 'positive' ? 'bg-positive' : r.kind === 'negative' ? 'bg-negative' : 'bg-faint',
              )}
            />
            <span>{r.text}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-edge pt-3 text-center">
        {[
          { label: '7d avg', v: trend.currentVs7.pct },
          { label: '30d avg', v: trend.currentVs30.pct },
          { label: '90d avg', v: trend.currentVs90.pct },
        ].map((c) => (
          <div key={c.label}>
            <p className="text-[11px] text-muted">vs {c.label}</p>
            <p className={cn('num text-xs font-bold', (c.v ?? 0) >= 0 ? 'text-positive' : 'text-negative')}>
              {c.v === null ? '—' : `${c.v >= 0 ? '+' : ''}${c.v.toFixed(2)}%`}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}