import { Link } from 'react-router-dom'
import { Wallet, ArrowRight } from 'lucide-react'
import type { PortfolioSummary } from '../../services/calculations'
import { goldSilverAllocation } from '../../services/calculations'
import { formatCurrency, formatPct, formatQuantity } from '../../lib/utils'
import { unitLabel } from '../../lib/units'
import { Card, CardHeader, CardBody } from '../ui/Card'
import { AllocationDonut } from '../charts/AllocationDonut'
import { EmptyState } from '../ui/State'
import { cn } from '../../lib/utils'
import { scopeAssets, type AssetScope } from '../../context/AssetScopeContext'

export function PortfolioSnapshot({
  summary,
  currency,
  methodLabel,
  compact = false,
  scope = 'both',
}: {
  summary: PortfolioSummary
  currency: string
  methodLabel: string
  compact?: boolean
  scope?: AssetScope
}) {
  if (summary.count === 0) {
    const scoped = scope !== 'both'
    const base = scoped ? scope : 'gold'
    return (
      <Card>
        <CardHeader title="Portfolio" subtitle={scoped ? `${scope === 'gold' ? 'Gold' : 'Silver'} only · current workspace` : 'Invested · Current · P/L'} />
        <CardBody>
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title={scoped ? `No ${scope === 'gold' ? 'gold' : 'silver'} investments yet` : 'No investments yet'}
            description="Add your first gold or silver purchase to start tracking portfolio performance."
            action={
              <Link to={`/${base}/investments`} className="btn-primary">
                Add an investment
              </Link>
            }
          />
        </CardBody>
      </Card>
    )
  }

  const alloc = goldSilverAllocation(summary)
  const positive = summary.profit >= 0
  const hasData = summary.valuations.some((v) => v.currentValue !== null)

  return (
    <Card>
      <CardHeader
        title="Portfolio"
        subtitle={`Valuation uses ${methodLabel}`}
        actions={
          <Link to={`/${scope === 'both' ? 'gold' : scope}/portfolio`} className="btn-secondary btn-sm">
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <CardBody>
        <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
          {[
            {
              label: 'Total invested',
              value: <>{formatCurrency(summary.invested, currency)}</>,
              tone: 'text-ink',
            },
            {
              label: 'Current value',
              value: <>{hasData ? formatCurrency(summary.currentValue, currency) : '—'}</>,
              tone: 'text-ink',
            },
            {
              label: 'Total profit',
              value: hasData ? (
                <span className={positive ? 'text-positive' : 'text-negative'}>
                  {positive ? '+' : ''}
                  {formatCurrency(summary.profit, currency)}
                </span>
              ) : (
                '—'
              ),
              tone: positive ? 'text-positive' : 'text-negative',
            },
            {
              label: 'Total return',
              value: hasData ? (
                <span className={positive ? 'text-positive' : 'text-negative'}>
                  {formatPct(summary.profitPct, { sign: true })}
                </span>
              ) : (
                '—'
              ),
              tone: positive ? 'text-positive' : 'text-negative',
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-edge bg-surface2/50 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{s.label}</p>
              <p className={cn('num mt-1 text-lg font-bold', s.tone)}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
          {scope === 'both' && (
            <div className="w-full flex-1">
              <AllocationDonut slices={alloc} total={summary.currentValue} height={150} />
            </div>
          )}
          <div className={cn('grid w-full grid-cols-2 gap-2 text-sm flex-1', scope === 'both' && 'sm:max-w-60')}>
            {[
              { asset: 'gold' as const, base: summary.gold },
              { asset: 'silver' as const, base: summary.silver },
            ]
              .filter((x) => scopeAssets(scope).includes(x.asset))
              .flatMap(({ asset, base }) => [
                { label: `${asset === 'gold' ? 'Gold' : 'Silver'} holdings`, value: `${formatQuantity(base.quantity)} ${unitLabel(base.units)}` },
                { label: `${asset === 'gold' ? 'Gold' : 'Silver'} value`, value: formatCurrency(base.value, currency) },
              ])
              .map((r) => (
                <div key={r.label}>
                  <p className="text-[11px] text-muted">{r.label}</p>
                  <p className="num font-semibold text-ink">{r.value}</p>
                </div>
              ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}