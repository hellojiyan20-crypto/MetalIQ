import type { ReactNode } from 'react'
import { Card } from './Card'
import { cn } from '../../lib/utils'

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'default',
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'gold' | 'silver' | 'positive' | 'negative'
  className?: string
}) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        {icon && (
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              tone === 'gold' && 'bg-gold-bg text-gold',
              tone === 'silver' && 'bg-silver-bg text-silver',
              tone === 'positive' && 'bg-positive-bg text-positive',
              tone === 'negative' && 'bg-negative-bg text-negative',
              tone === 'default' && 'bg-surface2 text-muted',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="num mt-2 text-2xl font-bold tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-muted">{sub}</div>}
    </Card>
  )
}