import {
  AreaChart,
  Area,
  Line,
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
  valuePoints: SeriesPoint[]
  investedPoints: SeriesPoint[]
  className?: string
}

export function PortfolioValueChart({ valuePoints, investedPoints, className }: Props) {
  if (!valuePoints.length) {
    return <ChartEmpty>No portfolio history to chart yet.</ChartEmpty>
  }

  const data = valuePoints.map((p, i) => ({
    date: p.date,
    value: p.value,
    invested: investedPoints[i]?.value ?? 0,
  }))

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const d = data.find((r) => r.date === label)
    if (!d) return null
    const profit = d.value - d.invested
    const pct = d.invested > 0 ? (profit / d.invested) * 100 : 0
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-3 shadow-pop text-xs">
        <p className="mb-1.5 font-semibold text-ink">{label}</p>
        <p className="text-muted">Value <span className="ml-2 font-semibold text-ink">{formatCurrency(d.value)}</span></p>
        <p className="text-muted">Invested <span className="ml-2 font-semibold text-ink">{formatCurrency(d.invested)}</span></p>
        <p className={`mt-1.5 font-semibold ${profit >= 0 ? 'text-positive' : 'text-negative'}`}>
          {profit >= 0 ? '+' : ''}{formatCurrency(profit)} ({pct.toFixed(2)}%)
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--edge)" strokeOpacity={0.35} />
          <XAxis dataKey="date" tickFormatter={formatDateMed} tick={axisTick} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} tick={axisTick} axisLine={false} tickLine={false} width={52} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} cursor={false} {...tooltipStyle()} />
          <Area
            type="monotone"
            dataKey="value"
            name="Portfolio value"
            stroke="var(--gold)"
            strokeWidth={2}
            fill="var(--gold)"
            fillOpacity={0.08}
            dot={false}
            activeDot={{ r: 3.5, stroke: 'var(--gold)', fill: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="invested"
            name="Total invested"
            stroke="var(--muted)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}