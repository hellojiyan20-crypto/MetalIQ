import { useMemo } from 'react'
import { GitCompareArrows } from 'lucide-react'
import { useMarketRates } from '../hooks/useData'
import { useSettings } from '../context/AuthContext'
import { assetReturns, volatility } from '../services/calculations'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { ComparisonChart } from '../components/charts/ComparisonChart'
import { AssetIcon } from '../components/market/AssetIcon'
import { EmptyState } from '../components/ui/State'
import { formatCurrency, formatPct } from '../lib/utils'

export default function ComparisonPage() {
  const { rates } = useMarketRates()
  const { settings } = useSettings()

  const method = settings.default_valuation_method
  const currency = settings.currency

  const goldReturns = useMemo(() => assetReturns(rates, 'gold', method), [rates, method])
  const silverReturns = useMemo(() => assetReturns(rates, 'silver', method), [rates, method])
  const goldVol = useMemo(() => volatility(rates, 'gold', method), [rates, method])
  const silverVol = useMemo(() => volatility(rates, 'silver', method), [rates, method])

  const alignedChart = useMemo(() => {
    const data = rates
      .filter((r) => r.gold_sell_rate !== null && r.silver_sell_rate !== null)
      .map((r) => ({ date: r.date, gold: r.gold_sell_rate!, silver: r.silver_sell_rate! }))
    if (!data.length) return []
    const goldBase = data[0].gold
    const silverBase = data[0].silver
    return data.map((p) => ({
      date: p.date,
      gold: goldBase !== 0 ? ((p.gold - goldBase) / goldBase) * 100 : 0,
      silver: silverBase !== 0 ? ((p.silver - silverBase) / silverBase) * 100 : 0,
    }))
  }, [rates])

  const volLabel = (v: number | null): string => {
    if (v === null) return '—'
    if (v < 5) return `${v.toFixed(2)}% (low)`
    if (v < 12) return `${v.toFixed(2)}% (moderate)`
    return `${v.toFixed(2)}% (high)`
  }

  const row = (label: string, goldVal: React.ReactNode, silverVal: React.ReactNode) => (
    <tr className="table-row">
      <td className="td text-xs text-muted">{label}</td>
      <td className="td text-right"><span className="num text-sm font-semibold text-ink">{goldVal}</span></td>
      <td className="td text-right"><span className="num text-sm font-semibold text-ink">{silverVal}</span></td>
    </tr>
  )

  if (!rates.length) {
    return (
      <div className="space-y-4">
        <PageHeader title="Gold vs Silver" />
        <Card>
          <EmptyState
            icon={<GitCompareArrows className="h-6 w-6" />}
            title="No data to compare"
            description="Add rates for at least two metals to see a relative comparison."
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gold vs Silver"
        subtitle="Performance and return comparison across both metals."
      />

      <Card>
        <CardHeader
          title="Normalized return"
          subtitle="Both metals normalized to 0% at the earliest shared data point."
          icon={<GitCompareArrows className="h-4 w-4" />}
        />
        <CardBody className="pt-0">
          <ComparisonChart data={alignedChart} />
          <div className="mt-3 flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{background:'var(--gold)'}} /> Gold</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{background:'var(--silver)'}} /> Silver</span>
          </div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-surface2/60">
              <tr>
                <th className="th">Metric</th>
                <th className="th text-right">
                  <span className="flex items-center justify-end gap-1.5"><AssetIcon asset="gold" size="sm" /> Gold</span>
                </th>
                <th className="th text-right">
                  <span className="flex items-center justify-end gap-1.5"><AssetIcon asset="silver" size="sm" /> Silver</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {row('Current price', formatCurrency(goldReturns.current, currency), formatCurrency(silverReturns.current, currency))}
              {row('7-day return', formatPct(goldReturns.d7.pct, { sign: true }), formatPct(silverReturns.d7.pct, { sign: true }))}
              {row('30-day return', formatPct(goldReturns.d30.pct, { sign: true }), formatPct(silverReturns.d30.pct, { sign: true }))}
              {row('90-day return', formatPct(goldReturns.d90.pct, { sign: true }), formatPct(silverReturns.d90.pct, { sign: true }))}
              {row('1-year return', formatPct(goldReturns.d365.pct, { sign: true }), formatPct(silverReturns.d365.pct, { sign: true }))}
              {row('All-time return', formatPct(goldReturns.allTime.pct, { sign: true }), formatPct(silverReturns.allTime.pct, { sign: true }))}
              {row('Volatility', volLabel(goldVol), volLabel(silverVol))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[11px] text-muted">
        Returns are calculated using the latest {method} rate. Volatility is standard deviation of daily price returns — a statistical dispersion measure, not a predictive tool.
      </p>
    </div>
  )
}