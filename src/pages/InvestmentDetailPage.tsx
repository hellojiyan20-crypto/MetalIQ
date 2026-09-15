import { useMemo } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Clock, Target, Wallet, Percent } from 'lucide-react'
import { useInvestments, useMarketRates } from '../hooks/useData'
import { useSettings } from '../context/AuthContext'
import { useAssetScope } from '../context/AssetScopeContext'
import { valueInvestment, investmentValueSeries, formatHoldingPeriod } from '../services/calculations'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { InvestmentHistoryChart } from '../components/charts/InvestmentHistoryChart'
import { ASSET_META } from '../components/market/AssetIcon'
import { formatCurrency, formatPct } from '../lib/utils'
import { formatDateShort } from '../lib/dates'
import { unitLabel } from '../lib/units'

export default function InvestmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { investments } = useInvestments()
  const { rates } = useMarketRates()
  const { settings } = useSettings()
  const { scope } = useAssetScope()
  const base = scope === 'gold' || scope === 'silver' ? scope : 'gold'

  const inv = useMemo(() => investments.find((i) => i.id === id) ?? null, [investments, id])
  const method = settings.default_valuation_method
  const currency = settings.currency

  if (!id) return <Navigate to={`/${base}/investments`} replace />
  if (!inv) return <div className="flex items-center justify-center py-20 text-sm text-muted">Loading or not found…</div>

  const valuation = valueInvestment(inv, rates, method)
  const { points, usedPurchaseFallback } = investmentValueSeries(inv, rates, method)
  const meta = ASSET_META[inv.asset_type]
  const positive = (valuation.profit ?? 0) >= 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${meta.label} investment detail`}
        subtitle={`${inv.quantity} ${inv.unit} · purchased ${formatDateShort(inv.investment_date)}`}
        actions={
          <Link to={`/${base}/investments`} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Original"
          value={formatCurrency(valuation.original, currency)}
          sub={inv.notes ?? undefined}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Current value"
          value={formatCurrency(valuation.currentValue, currency)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Profit / loss"
          value={
            <span className={positive ? 'text-positive' : 'text-negative'}>
              {positive ? '+' : ''}
              {formatCurrency(valuation.profit, currency)}
            </span>
          }
          tone={positive ? 'positive' : 'negative'}
          icon={<Percent className="h-4 w-4" />}
        />
        <StatCard
          label="Return"
          value={
            <span className={positive ? 'text-positive' : 'text-negative'}>
              {formatPct(valuation.profitPct, { sign: true })}
            </span>
          }
          tone={positive ? 'positive' : 'negative'}
          icon={<Percent className="h-4 w-4" />}
        />
        <StatCard
          label="Current market rate"
          value={valuation.currentRate !== null ? formatCurrency(valuation.currentRate, currency) : '—'}
          sub={valuation.currentRate !== null ? `per ${unitLabel(valuation.currentRateUnit)} · ${valuation.usedRateLabel.toLowerCase()}` : 'No market data yet'}
          icon={<Target className="h-4 w-4" />}
        />
        <StatCard
          label="Holding"
          value={formatHoldingPeriod(valuation.holdingDays)}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {usedPurchaseFallback && (
        <div className="rounded-xl border border-gold/30 bg-gold-bg px-4 py-3 text-xs text-muted">
          Some historical points used purchase cost due to missing market data. This does not affect current valuation.
        </div>
      )}

      <Card>
        <CardHeader title="Value over time" />
        <CardBody className="pt-0">
          <InvestmentHistoryChart points={points} investedAmount={valuation.original} />
        </CardBody>
      </Card>

      <div className="rounded-2xl border border-edge bg-surface p-5">
        <p className="eyebrow mb-3">Purchase record</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <div><dt className="text-muted">Asset</dt><dd className="font-semibold text-ink">{meta.label} ({inv.asset_type === 'gold' ? 'Au' : 'Ag'})</dd></div>
          <div><dt className="text-muted">Date</dt><dd className="font-semibold text-ink">{formatDateShort(inv.investment_date)}</dd></div>
          <div><dt className="text-muted">Quantity</dt><dd className="num font-semibold text-ink">{inv.quantity} {inv.unit}</dd></div>
          <div><dt className="text-muted">Purchase rate</dt><dd className="num font-semibold text-ink">{formatCurrency(inv.purchase_rate, currency)}</dd></div>
          <div><dt className="text-muted">Total invested</dt><dd className="num font-semibold text-ink">{formatCurrency(inv.total_amount, currency)}</dd></div>
          <div><dt className="text-muted">Holding period</dt><dd className="font-semibold text-ink">{formatHoldingPeriod(valuation.holdingDays)}</dd></div>
          {inv.notes && <div className="col-span-full"><dt className="text-muted">Notes</dt><dd className="mt-0.5 text-ink">{inv.notes}</dd></div>}
        </dl>
      </div>
    </div>
  )
}