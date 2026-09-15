import {
  AreaChart,
  Area,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  type TooltipProps,
} from 'recharts'
import type { SeriesPoint } from '../../services/calculations'
import { formatCurrency } from '../../lib/utils'
import { formatDateMed } from '../../lib/dates'
import { axisTick, tooltipStyle } from './chartTheme'
import { ChartEmpty } from './ChartCard'

interface Props {
  points: SeriesPoint[]
  investedAmount: number
  height?: number
}

export function InvestmentHistoryChart({ points, investedAmount, height = 260 }: Props) {
  if (!points.length) {
    return <ChartEmpty>No historical data for this investment.</ChartEmpty>
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const val = payload[0]?.value ?? 0
    const profit = val - investedAmount
    const pct = investedAmount > 0 ? (profit / investedAmount) * 100 : 0
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-3 shadow-pop text-xs">
        <p className="mb-1.5 font-semibold text-ink">{label}</p>
        <p className="text-muted">Value <span className="ml-2 font-semibold text-ink">{formatCurrency(val)}</span></p>
        <p className="text-muted">Cost <span className="ml-2 font-semibold text-ink">{formatCurrency(investedAmount)}</span></p>
        <p className={`mt-1.5 font-semibold ${profit >= 0 ? 'text-positive' : 'text-negative'}`}>
          {profit >= 0 ? '+' : ''}{formatCurrency(profit)} ({pct.toFixed(2)}%)
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--edge)" strokeOpacity={0.35} />
        <XAxis dataKey="date" tickFormatter={formatDateMed} tick={axisTick} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis tickFormatter={(v) => formatCurrency(v)} tick={axisTick} axisLine={false} tickLine={false} width={52} domain={['auto', 'auto']} />
        <Tooltip content={<CustomTooltip />} cursor={false} {...tooltipStyle()} />
        <ReferenceLine y={investedAmount} stroke="var(--muted)" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: 'Purchase cost', position: 'right', fill: 'var(--muted)', fontSize: 11 }} />
        <Area
          type="monotone"
          dataKey="value"
          name="Value"
          stroke="var(--gold)"
          strokeWidth={2}
          fill="var(--gold)"
          fillOpacity={0.07}
          dot={false}
          activeDot={{ r: 3.5, stroke: 'var(--gold)', fill: 'var(--surface)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}