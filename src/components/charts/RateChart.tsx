import { useState } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  type TooltipProps,
} from 'recharts'
import type { AssetType, ChartPeriodKey } from '../../types'
import { formatCurrency } from '../../lib/utils'
import { formatDateMed } from '../../lib/dates'
import { CHART, axisTick, tooltipStyle } from './chartTheme'
import { RangeChips } from './RangeChips'
import { ChartEmpty } from './ChartCard'
import { cn } from '../../lib/utils'

interface ChartSeries {
  date: string
  buy: number | null
  sell: number | null
}

type Mode = 'buy' | 'sell' | 'both'

interface RateChartProps {
  series: ChartSeries[]
  asset: AssetType
  period: ChartPeriodKey
  onPeriodChange: (k: ChartPeriodKey) => void
  height?: number
  className?: string
}

export function RateChart({
  series,
  asset,
  period,
  onPeriodChange,
  height = 280,
  className,
}: RateChartProps) {
  const [mode, setMode] = useState<Mode>(
    asset === 'gold' ? 'sell' : 'sell',
  )

  const color = asset === 'gold' ? CHART.gold : CHART.silver
  const colorAlt = asset === 'gold' ? CHART.gold2 : CHART.silver2

  const data = series.map((r, i) => ({
    ...r,
    _pct:
      i > 0 && series[i - 1].sell !== null && r.sell !== null && series[i - 1].sell! !== 0
        ? ((r.sell! - series[i - 1].sell!) / series[i - 1].sell!) * 100
        : null,
  }))

  if (!series.length) {
    return (
      <ChartEmpty>No market data for this range.</ChartEmpty>
    )
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const row = data.find((d) => d.date === label)
    const buy = row?.buy ?? null
    const sell = row?.sell ?? null
    const pct = row?._pct
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-3 shadow-pop text-xs">
        <p className="font-semibold text-ink mb-1.5">{label}</p>
        {mode !== 'sell' && buy !== null && (
          <p className="text-muted">
            Buy{' '}
            <span className="ml-2 font-semibold text-ink">{formatCurrency(buy)}</span>
          </p>
        )}
        {sell !== null && (
          <p className="text-muted">
            Sell{' '}
            <span className="ml-2 font-semibold text-ink">{formatCurrency(sell)}</span>
          </p>
        )}
        {pct !== null && pct !== undefined && (
          <p
            className={cn(
              'mt-1.5 font-semibold',
              pct > 0 ? 'text-positive' : pct < 0 ? 'text-negative' : 'text-muted',
            )}
          >
            {pct > 0 ? '+' : ''}{pct.toFixed(2)}% daily
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <RangeChips value={period} onChange={onPeriodChange} />
        <div className="flex gap-1 rounded-lg bg-surface2 p-1">
          {(['sell', 'buy', 'both'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                mode === m ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {m === 'both' ? 'Both' : m}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--edge)" strokeOpacity={0.45} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateMed}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v)}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={52}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} {...tooltipStyle()} />
          {(mode === 'both' || mode === 'sell') && (
            <Area
              type="monotone"
              dataKey="sell"
              name="Sell"
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={asset === 'gold' ? 0.08 : 0.06}
              dot={false}
              activeDot={{ r: 4, stroke: color, fill: 'var(--surface)', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {(mode === 'both' || mode === 'buy') && (
            <Line
              type="monotone"
              dataKey="buy"
              name="Buy"
              stroke={mode === 'both' ? colorAlt : color}
              strokeWidth={mode === 'both' ? 1.5 : 2}
              strokeDasharray={mode === 'both' ? '5 3' : undefined}
              dot={false}
              activeDot={{ r: 3.5, stroke: colorAlt, fill: 'var(--surface)', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}