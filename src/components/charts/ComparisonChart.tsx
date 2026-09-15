import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  type TooltipProps,
} from 'recharts'
import { formatPct } from '../../lib/utils'
import { formatDateMed } from '../../lib/dates'
import { CHART, axisTick, tooltipStyle } from './chartTheme'
import { ChartEmpty } from './ChartCard'

interface Point {
  date: string
  gold: number | null
  silver: number | null
}

interface Props {
  data: Point[]
  height?: number
}

export function ComparisonChart({ data, height = 300 }: Props) {
  if (!data.length) {
    return <ChartEmpty>Insufficient data for comparison.</ChartEmpty>
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-3 shadow-pop text-xs">
        <p className="mb-1.5 font-semibold text-ink">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.dataKey === 'gold' ? 'Gold' : 'Silver'}
            <span className="ml-auto font-semibold text-ink">{p.value !== null ? formatPct(p.value, { sign: true }) : '—'}</span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--edge)" strokeOpacity={0.35} />
        <XAxis dataKey="date" tickFormatter={formatDateMed} tick={axisTick} axisLine={false} tickLine={false} minTickGap={28} />
        <YAxis
          tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={48}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} {...tooltipStyle()} />
        <Line type="monotone" dataKey="gold" stroke={CHART.gold} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--surface)', strokeWidth: 2, stroke: CHART.gold }} connectNulls isAnimationActive={false} />
        <Line type="monotone" dataKey="silver" stroke={CHART.silver} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--surface)', strokeWidth: 2, stroke: CHART.silver }} connectNulls isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}