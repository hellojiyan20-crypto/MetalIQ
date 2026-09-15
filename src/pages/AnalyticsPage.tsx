import { useMemo } from 'react'
import { Activity, TrendingUp, TrendingDown, Timer } from 'lucide-react'
import { useMarketRates } from '../hooks/useData'
import { useSettings } from '../context/AuthContext'
import { useDateRange, filterRatesByRange } from '../context/DateRangeContext'
import { useAssetScope, scopeAssets } from '../context/AssetScopeContext'
import {
  assetAnalytics,
  computeTrend,
  rateLabel,
  dailyChange,
} from '../services/calculations'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { AssetIcon, ASSET_META } from '../components/market/AssetIcon'
import { RangeChips } from '../components/charts/RangeChips'
import { TrendSummary, TrendBadge } from '../components/market/TrendSummary'
import { EmptyState, LoadingState, ErrorState } from '../components/ui/State'
import { formatCurrency, formatPct } from '../lib/utils'
import { formatDateShort } from '../lib/dates'
import { cn } from '../lib/utils'
import type { AssetType } from '../types'

function MetricRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-edge/70 py-2 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-right">
        <span className="num text-sm font-semibold text-ink">{value}</span>
        {sub && <span className="ml-1.5 text-[11px] text-faint">{sub}</span>}
      </span>
    </div>
  )
}

function MetricSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-faint">{title}</p>
      {children}
    </div>
  )
}

function AssetAnalyticsPanel({ asset, rates, currency, method, periodLabel }: {
  asset: AssetType
  rates: Parameters<typeof assetAnalytics>[0]
  currency: string
  method: 'sell' | 'buy' | 'average'
  periodLabel: string
}) {
  const meta = ASSET_META[asset]
  const a = useMemo(() => assetAnalytics(rates, asset, method), [rates, asset, method])
  const trend = useMemo(() => computeTrend(rates, asset, method), [rates, asset, method])
  const day = dailyChange(rates, asset, method)

  if (a.sampleCount === 0) {
    return (
      <Card>
        <CardHeader title={`${meta.label} analytics`} icon={<AssetIcon asset={asset} />} />
        <CardBody>
          <EmptyState title={`No ${meta.label.toLowerCase()} data in this period`} description="Widen the range or add rates for this metal." />
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={`${meta.label} analytics`}
        subtitle={`${a.sampleCount} data points in ${periodLabel} · valued at ${rateLabel(method).toLowerCase()}`}
        icon={<AssetIcon asset={asset} />}
        actions={<TrendBadge trend={trend} />}
      />
      <CardBody className="pb-5">
        <div className="grid grid-cols-3 gap-3 border-b border-edge pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Current</p>
            <p className={cn('num mt-1 text-base font-bold', meta.text)}>{formatCurrency(a.current, currency)}</p>
            <p className={cn('num text-[11px] font-semibold', (day.pct ?? 0) >= 0 ? 'text-positive' : 'text-negative')}>
              {day.pct === null ? '—' : `${day.pct >= 0 ? '+' : ''}${day.pct.toFixed(2)}% today`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Avg (period)</p>
            <p className="num mt-1 text-base font-bold text-ink">{formatCurrency(a.avgAll, currency)}</p>
            <p className="num text-[11px] text-muted">total growth {formatPct(a.totalGrowth, { sign: true })}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Range</p>
            <p className="num mt-1 text-base font-bold text-ink">
              {formatCurrency(a.lowest, currency)}{' '}
              <span className="text-[11px] font-normal text-faint">–</span> {formatCurrency(a.highest, currency)}
            </p>
            <p className="text-[11px] text-muted">{formatDateShort(a.lowestDate ?? '')} – {formatDateShort(a.highestDate ?? '')}</p>
          </div>
        </div>

        <MetricSection title="Averages">
          <MetricRow label="7-day average" value={formatCurrency(a.avg7, currency)} />
          <MetricRow label="30-day average" value={formatCurrency(a.avg30, currency)} />
          <MetricRow label="90-day average" value={formatCurrency(a.avg90, currency)} />
          <MetricRow label="1-year average" value={formatCurrency(a.avgYear, currency)} />
        </MetricSection>

        <MetricSection title="Extremes">
          <MetricRow
            label="All-time high"
            value={formatCurrency(a.highest, currency)}
            sub={a.highestDate ? formatDateShort(a.highestDate) : undefined}
          />
          <MetricRow
            label="All-time low"
            value={formatCurrency(a.lowest, currency)}
            sub={a.lowestDate ? formatDateShort(a.lowestDate) : undefined}
          />
        </MetricSection>

        <MetricSection title="Movements">
          <MetricRow
            label="Largest daily gain"
            value={a.highestDailyIncrease === null ? '—' : formatCurrency(a.highestDailyIncrease, currency)}
            sub={a.highestDailyIncreaseDate ? formatDateShort(a.highestDailyIncreaseDate) : undefined}
          />
          <MetricRow
            label="Largest daily drop"
            value={a.highestDailyDecrease === null ? '—' : formatCurrency(a.highestDailyDecrease, currency)}
            sub={a.highestDailyDecreaseDate ? formatDateShort(a.highestDailyDecreaseDate) : undefined}
          />
        </MetricSection>
      </CardBody>
    </Card>
  )
}

export default function AnalyticsPage() {
  const { rates, loading, error, refresh } = useMarketRates()
  const { settings } = useSettings()
  const { range, setPreset } = useDateRange()
  const { scope } = useAssetScope()
  const assets = scopeAssets(scope)

  const currency = settings.currency
  const method = settings.default_valuation_method

  const inRange = useMemo(() => filterRatesByRange(rates, range), [rates, range])
  const trendGold = useMemo(() => computeTrend(rates, 'gold', method), [rates, method])
  const trendSilver = useMemo(() => computeTrend(rates, 'silver', method), [rates, method])

  const periodLabel = range.key === 'custom' ? 'custom range'
    : range.key === 'all' ? 'all time'
    : { '7d': '7 days', '30d': '30 days', '3m': '3 months', '6m': '6 months', '1y': '1 year', today: 'today' }[range.key] ?? range.key

  if (loading) return <LoadingState label="Crunching analytics" />
  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title={scope === 'both' ? 'Market analytics' : `${scope === 'gold' ? 'Gold' : 'Silver'} analytics`}
        subtitle="Transparent historical metrics — averages, extremes, movements and trend."
        actions={<RangeChips value={range.key as Parameters<typeof RangeChips>[0]['value']} onChange={setPreset} />}
      />

      {rates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title="No market data yet"
            description="Add rates to unlock analytics: averages, extremes, movement and trend readings."
          />
        </Card>
      ) : (
        <>
          <div className={cn('grid gap-4', scope === 'both' ? 'xl:grid-cols-2' : '')}>
            {assets.includes('gold') && (
              <AssetAnalyticsPanel asset="gold" rates={inRange} currency={currency} method={method} periodLabel={periodLabel} />
            )}
            {assets.includes('silver') && (
              <AssetAnalyticsPanel asset="silver" rates={inRange} currency={currency} method={method} periodLabel={periodLabel} />
            )}
          </div>

          {(scope === 'both' || scope === 'gold' || scope === 'silver') && (
          <Card>
            <CardHeader
              title="Market trend"
              subtitle="How the current price relates to recent averages. Historical reading — not a forecast."
              icon={<Activity className="h-4 w-4" />}
            />
            <CardBody className={cn('grid gap-6', scope === 'both' && 'lg:grid-cols-2')}>
              {assets.includes('gold') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AssetIcon asset="gold" size="sm" />
                    <p className="text-sm font-semibold text-ink">Gold trend</p>
                  </div>
                  <TrendSummary trend={trendGold} assetLabel="Gold" currency={currency} />
                </div>
              )}
              {assets.includes('silver') && (
                <div className={cn('space-y-4', scope === 'both' && 'border-t border-edge pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0')}>
                  <div className="flex items-center gap-2">
                    <AssetIcon asset="silver" size="sm" />
                    <p className="text-sm font-semibold text-ink">Silver trend</p>
                  </div>
                  <TrendSummary trend={trendSilver} assetLabel="Silver" currency={currency} />
                </div>
              )}
            </CardBody>
          </Card>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Trend uses the full history, ignoring the selected range.</span>
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-positive" /> Averages & extremes are computed within the selected range.
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-negative" /> Volatile periods show larger spreads between buy and sell.
            </span>
          </div>
        </>
      )}
    </div>
  )
}