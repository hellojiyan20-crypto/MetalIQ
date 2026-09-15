import type { AssetType, MarketRate, ValuationMethod } from '../../types'
import {
  assetBuy,
  assetSell,
  dailyChange,
  latestRate,
  periodChange,
  rateValue,
  trailingWindow,
} from '../../services/calculations'
import { formatCurrency } from '../../lib/utils'
import { Card } from '../ui/Card'
import { AssetIcon, ASSET_META } from './AssetIcon'
import { ChangeIndicator } from './ChangeIndicator'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { unitLabel } from '../../lib/units'
import { cn } from '../../lib/utils'

function Sparkline({ rates, asset, method }: { rates: MarketRate[]; asset: AssetType; method: ValuationMethod }) {
  const data = trailingWindow(rates, 60)
    .map((r) => rateValue(r, asset, method))
    .filter((v): v is number => v !== null)
    .map((v, i) => ({ i, v }))
  if (data.length < 2) return null
  const color = asset === 'gold' ? 'var(--gold)' : 'var(--silver)'
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.08} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface MarketCardProps {
  asset: AssetType
  rates: MarketRate[]
  method: ValuationMethod
}

export function MarketCard({ asset, rates, method }: MarketCardProps) {
  const meta = ASSET_META[asset]
  // Only dates that actually carry this metal — a gold-only latest day must not
  // make the silver card (or vice versa) look empty.
  const assetRates = rates.filter((r) => assetBuy(r, asset) !== null || assetSell(r, asset) !== null)
  const last = latestRate(assetRates)

  if (!last) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <AssetIcon asset={asset} />
          <div>
            <p className="text-sm font-semibold text-ink">{meta.label}</p>
            <p className="text-xs text-muted">No market data yet</p>
          </div>
        </div>
      </Card>
    )
  }

  const unit = unitLabel(asset === 'gold' ? last.gold_unit : last.silver_unit)
  const prev = assetRates.length > 1 ? assetRates[assetRates.length - 2] : null
  const day = dailyChange(assetRates, asset, method)
  const week = periodChange(assetRates, asset, method, 7)
  const month = periodChange(assetRates, asset, method, 30)
  const year = periodChange(assetRates, asset, method, 365)

  const buy = assetBuy(last, asset)
  const sell = assetSell(last, asset)
  const mainValue = rateValue(last, asset, method)

  const cells = [
    { label: 'Daily', info: day, withAbs: true },
    { label: 'Weekly', info: week, withAbs: false },
    { label: 'Monthly', info: month, withAbs: false },
    { label: 'Yearly', info: year, withAbs: false },
  ]

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow hover:shadow-card dark:hover:shadow-card-dark',
        asset === 'gold' ? 'border-gold/20' : 'border-silver/25',
      )}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AssetIcon asset={asset} />
            <div>
              <p className="text-sm font-semibold text-ink">{meta.label}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                per {unit}
                <span className={cn('rounded border px-1 text-[10px] font-semibold', meta.chip)}>{meta.symbol}</span>
              </p>
            </div>
          </div>
          <ChangeIndicator info={day} showAbsolute={false} className="text-xs" />
        </div>

        <div className="mt-4">
          <p className="num text-3xl font-bold tracking-tight text-ink">{formatCurrency(mainValue)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            <span>
              Buy <span className="num font-semibold text-ink">{formatCurrency(buy)}</span>
            </span>
            <span>
              Sell <span className="num font-semibold text-ink">{formatCurrency(sell)}</span>
            </span>
            {prev && (
              <span>
                Prev <span className="num font-semibold text-ink">{formatCurrency(assetSell(prev, asset))}</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Sparkline rates={rates} asset={asset} method={method} />
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-edge sm:grid-cols-4">
        {cells.map((c) => (
          <div
            key={c.label}
            className={cn(
              'px-4 py-3',
              c.label !== 'Daily' && 'border-l border-edge',
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{c.label}</p>
            <div className="mt-1">
              <ChangeIndicator info={c.info} showAbsolute={c.withAbs} decimals={c.withAbs ? 0 : 2} className="text-[13px]" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}