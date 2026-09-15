import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, LineChart as LineIcon, Bell, BookOpen, Plus, ArrowRight, Activity, GitCompareArrows } from 'lucide-react'
import { useMarketRates, useInvestments, useNotes, useAlerts } from '../hooks/useData'
import { useSettings } from '../context/AuthContext'
import { useDateRange, filterRatesByRange } from '../context/DateRangeContext'
import { useToast } from '../context/ToastContext'
import { useAssetScope, scopedByAsset, type AssetScope } from '../context/AssetScopeContext'
import {
  latestRate,
  summarizePortfolio,
  computeTrend,
  rateLabel,
  latestAssetRate,
  dailyChange,
} from '../services/calculations'
import type { MarketRate, MarketRateInput, PriceAlert } from '../types'
import { MarketCard } from '../components/market/MarketCard'
import { PortfolioSnapshot } from '../components/portfolio/PortfolioSnapshot'
import { TrendSummary } from '../components/market/TrendSummary'
import { RateChart } from '../components/charts/RateChart'
import { ChartCard } from '../components/charts/ChartCard'
import { RateForm } from '../components/rates/RateForm'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { EmptyState } from '../components/ui/State'
import { Badge } from '../components/ui/Badge'
import { formatCurrency, cn } from '../lib/utils'
import { formatDateShort } from '../lib/dates'
import { todayISO } from '../lib/dates'
import { unitLabel } from '../lib/units'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function evaluateAlert(a: PriceAlert, value: number | null): boolean {
  if (value === null) return false
  if (a.condition === 'above') return a.target_price !== null && value >= a.target_price
  if (a.condition === 'below') return a.target_price !== null && value <= a.target_price
  return false
}

export default function DashboardPage() {
  const { rates, loading, saveRate } = useMarketRates()
  const { investments } = useInvestments()
  const { notes } = useNotes()
  const { alerts } = useAlerts()
  const { settings } = useSettings()
  const { range, setPreset } = useDateRange()
  const { toast } = useToast()
  const { scope } = useAssetScope()
  const metal: 'gold' | 'silver' = scope === 'silver' ? 'silver' : 'gold'

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MarketRate | null>(null)

  const method = settings.default_valuation_method
  const currency = settings.currency

  const today = todayISO()
  const todaysRate = rates.find((r) => r.date === today) ?? null

  const scopedInvestments = useMemo(
    () => investments.filter((i) => scopedByAsset(scope, i.asset_type)),
    [investments, scope],
  )
  const summary = useMemo(
    () => summarizePortfolio(scopedInvestments, rates, method),
    [scopedInvestments, rates, method],
  )
  const trendGold = useMemo(() => computeTrend(rates, 'gold', method), [rates, method])
  const trendSilver = useMemo(() => computeTrend(rates, 'silver', method), [rates, method])

  const inRange = useMemo(() => filterRatesByRange(rates, range), [rates, range])
  const goldSeries = useMemo(
    () => inRange.map((r) => ({ date: r.date, buy: r.gold_buy_rate, sell: r.gold_sell_rate })),
    [inRange],
  )
  const silverSeries = useMemo(
    () => inRange.map((r) => ({ date: r.date, buy: r.silver_buy_rate, sell: r.silver_sell_rate })),
    [inRange],
  )

  const last = latestRate(rates)
  const spark = useMemo(
    () =>
      rates
        .map((r) => (metal === 'gold' ? r.gold_sell_rate : r.silver_sell_rate))
        .filter((v): v is number => v !== null)
        .slice(-30),
    [rates, metal],
  )
  const recentNotes = notes
    .filter((n) => (scope === 'both' ? true : n.asset_type === scope))
    .slice(0, 3)

  const goldLast = latestAssetRate(rates, 'gold', method)
  const silverLast = latestAssetRate(rates, 'silver', method)

  const activeAlerts = alerts.filter((a) => a.is_active && scopedByAsset(scope, a.asset_type))
  const triggered = activeAlerts.filter((a) => evaluateAlert(a, a.asset_type === 'gold' ? goldLast : silverLast))

  const handleSaveRate = async (input: MarketRateInput, existing?: MarketRate) => {
    try {
      const updatedExisting = Boolean(existing)
      await saveRate(input, existing)
      toast(updatedExisting ? 'Rate updated.' : 'Rate saved.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save rate.', 'error')
    }
  }

  const openNewRate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEditToday = () => {
    setEditing(todaysRate)
    setFormOpen(true)
  }

  if (!loading && rates.length === 0) {
    return (
      <div className="space-y-6">
        <MetalHero metal={metal} rates={rates} currency={currency} greeting={greeting()} onAdd={openNewRate} spark={spark} />
        <Card>
          <EmptyState
            icon={<CalendarClock className="h-6 w-6" />}
            title={metal === 'gold' ? 'No gold data yet' : 'No silver data yet'}
            description={`Add today's ${metal === 'gold' ? 'gold' : 'silver'} rates to start building your market history, charts and analytics.`}
            action={
              <button onClick={openNewRate} className="btn-primary">
                <Plus className="h-4 w-4" /> Add today's {metal === 'gold' ? 'gold' : 'silver'} rates
              </button>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <MetalHero metal={metal} rates={rates} currency={currency} greeting={greeting()} onAdd={openNewRate} spark={spark} />

      {/* market overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        {scopedByAsset(scope, 'gold') && <MarketCard asset="gold" rates={rates} method={method} />}
        {scopedByAsset(scope, 'silver') && <MarketCard asset="silver" rates={rates} method={method} />}
      </div>

      {/* portfolio + snapshot */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioSnapshot
            summary={summary}
            currency={currency}
            methodLabel={rateLabel(method)}
            compact
            scope={scope}
          />
        </div>
        <TodaySnapshotCard last={last} rates={rates} onEditToday={todaysRate ? openEditToday : openNewRate} scope={scope} />
      </div>

      {/* charts */}
      <div className={cn('grid gap-4', scope === 'both' ? 'lg:grid-cols-2' : 'lg:grid-cols-1')}>
        {scopedByAsset(scope, 'gold') && (
          <ChartCard title="Gold price" subtitle="Buy & sell rates, PKR" icon={<LineIcon className="h-4 w-4" />}>
            <RateChart series={goldSeries} asset="gold" period={range.key} onPeriodChange={setPreset} />
          </ChartCard>
        )}
        {scopedByAsset(scope, 'silver') && (
          <ChartCard title="Silver price" subtitle="Buy & sell rates, PKR" icon={<LineIcon className="h-4 w-4" />}>
            <RateChart series={silverSeries} asset="silver" period={range.key} onPeriodChange={setPreset} />
          </ChartCard>
        )}
      </div>

      {/* trends + journal + alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Market trend" subtitle="Transparent, purely historical signals" icon={<Activity className="h-4 w-4" />} />
          <CardBody className="space-y-5">
            {scopedByAsset(scope, 'gold') && <TrendSummary trend={trendGold} assetLabel="Gold" currency={currency} />}
            {scope === 'both' && <div className="my-1 border-t border-edge" />}
            {scopedByAsset(scope, 'silver') && <TrendSummary trend={trendSilver} assetLabel="Silver" currency={currency} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Market journal"
            subtitle="Your latest notes"
            icon={<BookOpen className="h-4 w-4" />}
            actions={
              <Link to={`/${metal}/journal`} className="btn-secondary btn-sm">
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardBody>
            {recentNotes.length === 0 ? (
              <EmptyState
                title="No notes yet"
                description="Capture your read of the market — it becomes part of your history."
                action={
                  <Link to={`/${metal}/journal`} className="btn-secondary btn-sm">
                    Write a note
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {recentNotes.map((n) => (
                  <li key={n.id} className="rounded-xl border border-edge p-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={n.asset_type === 'gold' ? 'gold' : n.asset_type === 'silver' ? 'silver' : 'neutral'}>
                        {n.asset_type ? (n.asset_type === 'gold' ? 'Gold' : 'Silver') : 'Market'}
                      </Badge>
                      <span className="text-[11px] text-muted">{formatDateShort(n.date)}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-snug text-ink">{n.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Price alerts"
            subtitle={`${activeAlerts.length} active${triggered.length ? ` · ${triggered.length} triggered` : ''}`}
            icon={<Bell className="h-4 w-4" />}
            actions={
              <Link to={`/${metal}/alerts`} className="btn-secondary btn-sm">
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardBody>
            {activeAlerts.length === 0 ? (
              <EmptyState
                title="No alerts set"
                description='Add alerts like "Gold reaches PKR 320,000" to see them surface here.'
                action={
                  <Link to={`/${metal}/alerts`} className="btn-secondary btn-sm">
                    Set an alert
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {activeAlerts.slice(0, 5).map((a) => {
                  const hit = triggered.some((t) => t.id === a.id)
                  return (
                    <li
                      key={a.id}
                      className={`rounded-xl border px-3 py-2.5 text-sm ${
                        hit ? 'border-positive/30 bg-positive-bg' : 'border-edge bg-surface2/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink">{a.asset_type === 'gold' ? 'Gold' : 'Silver'}</span>
                        {hit && <Badge tone="positive">triggered now</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {a.condition === 'above' && `above PKR ${a.target_price?.toLocaleString()}`}
                        {a.condition === 'below' && `below PKR ${a.target_price?.toLocaleString()}`}
                        {a.condition === 'increase_pct' && `up ${a.target_pct}%`}
                        {a.condition === 'decrease_pct' && `down ${a.target_pct}%`}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <RateForm open={formOpen} onClose={() => setFormOpen(false)} existing={editing} rates={rates} onSave={handleSaveRate} />
    </div>
  )
}

function MetalHero({
  metal,
  rates,
  currency,
  greeting,
  onAdd,
  spark,
}: {
  metal: 'gold' | 'silver'
  rates: MarketRate[]
  currency: string
  greeting: string
  onAdd: () => void
  spark: number[]
}) {
  const sell = latestAssetRate(rates, metal, 'sell')
  const buy = latestAssetRate(rates, metal, 'buy')
  const day = dailyChange(rates, metal, 'sell')
  const last = latestRate(rates)
  const unit = last ? (metal === 'gold' ? last.gold_unit : last.silver_unit) : 'tola'
  const label = metal === 'gold' ? 'Gold' : 'Silver'
  const up = day.pct !== null && day.pct > 0
  const down = day.pct !== null && day.pct < 0
  const accentBorder = metal === 'gold' ? 'border-gold/25 bg-gold-bg text-gold' : 'border-silver/30 bg-silver-bg text-silver'

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-edge p-6 sm:p-8"
      style={{
        background:
          'radial-gradient(900px 340px at 92% -20%, var(--gold-bg), transparent 62%), radial-gradient(520px 240px at -5% 110%, var(--gold-bg), transparent 60%), var(--surface)',
      }}
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-60 w-60 rounded-full border border-gold/10" />
      <div className="pointer-events-none absolute -right-2 -top-2 h-36 w-36 rounded-full border border-gold/10" />

      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider', accentBorder)}>
              {metal === 'gold' ? 'Au' : 'Ag'} · {label} workspace
            </span>
            <span className="text-xs text-muted">{formatDateShort(todayISO())}</span>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{greeting}</h1>
          <p className="mt-1 text-sm text-muted">Here is how {label} is moving today.</p>

          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Sell rate · per {unitLabel(unit)}
              </p>
              <div className="mt-1 flex items-center gap-2.5">
                <span className="num text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                  {sell !== null ? formatCurrency(sell, currency) : '—'}
                </span>
                {day.pct !== null && (
                  <span
                    className={cn(
                      'num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
                      up ? 'bg-positive-bg text-positive' : down ? 'bg-negative-bg text-negative' : 'bg-surface3 text-muted',
                    )}
                  >
                    {up ? '▲' : down ? '▼' : '•'} {day.pct >= 0 ? '+' : ''}
                    {day.pct.toFixed(2)}% today
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Buy <span className="num font-semibold text-ink">{buy !== null ? formatCurrency(buy, currency) : '—'}</span>
                {last ? ` · last entry ${formatDateShort(last.date)}` : ''}
              </p>
            </div>

            {sell !== null && (
              <div className="rounded-xl border border-edge bg-surface/70 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">30-day movement</p>
                <div className="mt-1 flex items-center gap-2">
                  <Sparkline values={spark} />
                  {day.pct !== null && (
                    <span className="num text-xs font-bold text-muted">{up || down ? 'trending' : 'flat'}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:items-end">
          <button onClick={onAdd} className="btn-primary">
            <Plus className="h-4 w-4" /> Today's rates
          </button>
          <Link to="/comparison" className="btn-secondary">
            <GitCompareArrows className="h-4 w-4" /> Compare
          </Link>
        </div>
      </div>
    </section>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 140
  const h = 38
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = w / (values.length - 1)
  const pts = values.map((v, i) => [i * step, h - 3 - ((v - min) / range) * (h - 8)] as const)
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const up = values[values.length - 1] >= values[0]
  const color = up ? 'var(--positive)' : 'var(--negative)'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[38px] w-[140px] overflow-visible" fill="none" aria-hidden>
      <path d={area} fill={color} opacity="0.12" />
      <path d={line} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TodaySnapshotCard({
  last,
  rates,
  onEditToday,
  scope,
}: {
  last: MarketRate | null
  rates: MarketRate[]
  onEditToday: () => void
  scope: AssetScope
}) {
  const goldDay = dailyChange(rates, 'gold', 'sell')
  const silverDay = dailyChange(rates, 'silver', 'sell')
  const goldUnit = last ? unitLabel(last.gold_unit) : ''
  const silverUnit = last ? unitLabel(last.silver_unit) : ''
  if (!last) return null

  return (
    <Card>
      <CardHeader
        title="Today's snapshot"
        subtitle={`Latest entry · ${formatDateShort(last.date)}`}
        icon={<CalendarClock className="h-4 w-4" />}
        actions={
          <Link to={`/${scope === 'silver' ? 'silver' : 'gold'}/rates`} className="btn-secondary btn-sm">
            History <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <CardBody className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {scopedByAsset(scope, 'gold') && (
            <>
              <SnapshotCell label="Gold · buy" value={last.gold_buy_rate} unit={goldUnit} tone="gold" />
              <SnapshotCell label="Gold · sell" value={last.gold_sell_rate} unit={goldUnit} tone="gold" />
            </>
          )}
          {scopedByAsset(scope, 'silver') && (
            <>
              <SnapshotCell label="Silver · buy" value={last.silver_buy_rate} unit={silverUnit} tone="silver" />
              <SnapshotCell label="Silver · sell" value={last.silver_sell_rate} unit={silverUnit} tone="silver" />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {scopedByAsset(scope, 'gold') && <DeltaRow label="Gold daily" pct={goldDay.pct} />}
          {scopedByAsset(scope, 'silver') && <DeltaRow label="Silver daily" pct={silverDay.pct} />}
        </div>

        <div className="rounded-xl border border-edge bg-surface2/50 px-4 py-3 text-xs">
          <p className="font-semibold text-ink">Market summary</p>
          <p className="mt-1 text-muted">Track weekly, monthly and yearly changes on the Market Rates page.</p>
        </div>

        <button onClick={onEditToday} className="btn-secondary w-full">
          {last.date === todayISO() ? "Update today's entry" : "Add today's rates"}
        </button>
      </CardBody>
    </Card>
  )
}

function DeltaRow({ label, pct }: { label: string; pct: number | null }) {
  const up = pct !== null && pct > 0
  const down = pct !== null && pct < 0
  return (
    <div className="flex items-center justify-between rounded-lg border border-edge px-3 py-2 text-xs">
      <span className="text-muted">{label}</span>
      <span className={`font-bold num ${up ? 'text-positive' : down ? 'text-negative' : 'text-muted'}`}>
        {pct === null ? '—' : `${up ? '+' : ''}${pct.toFixed(2)}%`}
      </span>
    </div>
  )
}

function SnapshotCell({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: number | null
  unit: string
  tone: 'gold' | 'silver'
}) {
  return (
    <div className="rounded-xl border border-edge p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`num mt-1 text-lg font-bold ${tone === 'gold' ? 'text-gold' : 'text-silver'}`}>
        {formatCurrency(value)}
      </p>
      <span className="text-[11px] text-muted">per {unit}</span>
    </div>
  )
}