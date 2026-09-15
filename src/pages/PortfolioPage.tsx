import { useMemo } from 'react'
import { PieChart, TrendingUp, Target, Award, AlertTriangle, Layers } from 'lucide-react'
import { useInvestments, useMarketRates } from '../hooks/useData'
import { useSettings } from '../context/AuthContext'
import { useAssetScope, scopedByAsset, scopeAssets } from '../context/AssetScopeContext'
import {
  summarizePortfolio,
  portfolioValueSeries,
  goldSilverAllocation,
  rateLabel,
  formatHoldingPeriod,
  type InvestmentValuation,
} from '../services/calculations'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { PortfolioValueChart } from '../components/charts/PortfolioValueChart'
import { AllocationDonut } from '../components/charts/AllocationDonut'
import { EmptyState, LoadingState } from '../components/ui/State'
import { AssetIcon, ASSET_META } from '../components/market/AssetIcon'
import { formatCurrency, formatPct, formatQuantity } from '../lib/utils'
import { formatDateShort } from '../lib/dates'
import { unitLabel } from '../lib/units'
import { cn } from '../lib/utils'
import { Link } from 'react-router-dom'

export default function PortfolioPage() {
  const { investments, loading } = useInvestments()
  const { rates } = useMarketRates()
  const { settings } = useSettings()
  const { scope } = useAssetScope()

  const currency = settings.currency
  const method = settings.default_valuation_method
  const assets = scopeAssets(scope)
  const scopeLabel = scope === 'both' ? 'Portfolio' : `${scope === 'gold' ? 'Gold' : 'Silver'} portfolio`

  const scopedInvestments = useMemo(
    () => investments.filter((i) => scopedByAsset(scope, i.asset_type)),
    [investments, scope],
  )
  const summary = useMemo(() => summarizePortfolio(scopedInvestments, rates, method), [scopedInvestments, rates, method])
  const hasValuationData = summary.valuations.some((v) => v.currentValue !== null)
  const alloc = useMemo(() => goldSilverAllocation(summary), [summary])
  const { points, investedPoints } = useMemo(
    () => portfolioValueSeries(scopedInvestments, rates, method),
    [scopedInvestments, rates, method],
  )

  if (loading) return <LoadingState label="Loading portfolio" />

  if (scopedInvestments.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Portfolio" />
        <Card>
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title="No portfolio to show"
            description="Add investments to see your overall portfolio value, allocation and performance."
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={scopeLabel}
        subtitle={scope !== 'both' ? `Showing ${scope === 'gold' ? 'gold' : 'silver'} positions only` : `Valuation uses ${rateLabel(method).toLowerCase()}`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total invested" value={formatCurrency(summary.invested, currency)} icon={<Target className="h-4 w-4" />} />
        <StatCard
          label="Current value"
          value={hasValuationData ? formatCurrency(summary.currentValue, currency) : '—'}
          sub={hasValuationData ? undefined : 'No market data yet'}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Total profit"
          value={
            hasValuationData ? (
              <span className={summary.profit >= 0 ? 'text-positive' : 'text-negative'}>
                {summary.profit >= 0 ? '+' : ''}{formatCurrency(summary.profit, currency)}
              </span>
            ) : (
              '—'
            )
          }
          sub={hasValuationData ? undefined : 'No market data yet'}
          icon={<Award className="h-4 w-4" />}
          tone={summary.profit >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Return"
          value={
            hasValuationData ? (
              <span className={summary.profit >= 0 ? 'text-positive' : 'text-negative'}>
                {formatPct(summary.profitPct, { sign: true })}
              </span>
            ) : (
              '—'
            )
          }
          sub={hasValuationData ? undefined : 'No market data yet'}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={summary.profit >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Allocation" icon={<PieChart className="h-4 w-4" />} />
          <CardBody className="space-y-4">
            {scope === 'both' && <AllocationDonut slices={alloc} total={summary.currentValue} />}
            <div className="space-y-2">
              {assets.map((asset) => {
                const h = summary[asset]
                return (
                  <div key={asset} className="flex items-center gap-3 rounded-xl border border-edge px-3 py-2.5 text-xs">
                    <AssetIcon asset={asset} size="sm" />
                    <div className="flex-1">
                      <p className={cn('font-semibold', ASSET_META[asset].text)}>{ASSET_META[asset].label}</p>
                      <p className="text-muted">{formatQuantity(h.quantity)} {unitLabel(h.units)} held</p>
                    </div>
                    <div className="text-right">
                      <p className="num font-semibold text-ink">{formatCurrency(h.value, currency)}</p>
                      <p className="text-muted">invested {formatCurrency(h.invested, currency)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Portfolio value over time" icon={<TrendingUp className="h-4 w-4" />} />
          <CardBody className="pt-0">
            <PortfolioValueChart valuePoints={points} investedPoints={investedPoints} />
            <p className="mt-2 px-1 text-[11px] text-faint">Solid line = portfolio value. Dashed line = cumulative invested amount.</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {summary.best && (
          <PnlCard
            title="Best performer"
            v={summary.best}
            currency={currency}
            base={scope}
            positive={summary.best.profitPct !== null && summary.best.profitPct >= 0}
          />
        )}
        {summary.worst && (
          <PnlCard
            title="Worst performer"
            v={summary.worst}
            currency={currency}
            base={scope}
            positive={summary.worst.profitPct !== null && summary.worst.profitPct >= 0}
          />
        )}
      </div>

      <div className="rounded-2xl border border-edge bg-surface px-5 py-4 text-xs text-muted space-y-1">
        <p>• Number of investments: <span className="font-semibold text-ink">{summary.count}</span></p>
        <p>• Average investment amount: <span className="num font-semibold text-ink">{formatCurrency(summary.avgInvestment, currency)}</span></p>
        <p>• Portfolio value over time may include purchase-cost fallback where historical rates are missing.</p>
      </div>
    </div>
  )
}

function PnlCard({ title, v, currency, positive, base }: { title: string; v: InvestmentValuation; currency: string; positive: boolean; base: 'gold' | 'silver' | 'both' }) {
  const meta = ASSET_META[v.investment.asset_type]
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} icon={<Award className="h-4 w-4" />} />
      <CardBody>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AssetIcon asset={v.investment.asset_type} />
            <div>
              <p className={cn('text-sm font-semibold', meta.text)}>
                {meta.label} · {v.investment.quantity} {v.investment.unit}
              </p>
              <p className="text-xs text-muted">Purchased {formatDateShort(v.investment.investment_date)} · held {formatHoldingPeriod(v.holdingDays)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn('num text-base font-bold', positive ? 'text-positive' : 'text-negative')}>
              {formatCurrency(v.profit, currency)}
            </p>
            <p className={cn('num text-xs font-semibold', positive ? 'text-positive' : 'text-negative')}>
              {formatPct(v.profitPct, { sign: true })}
            </p>
          </div>
        </div>
        <Link
          to={`/${base === 'silver' ? 'silver' : 'gold'}/investments/${v.investment.id}`}
          className="mt-3 block text-center text-xs font-semibold text-muted hover:text-ink transition-colors"
        >
          View detail →
        </Link>
      </CardBody>
    </Card>
  )
}