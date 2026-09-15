import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, type TooltipProps } from 'recharts'
import type { AllocationSlice } from '../../services/calculations'
import { formatCurrency, formatPct } from '../../lib/utils'

interface Props {
  slices: AllocationSlice[]
  total: number
  height?: number
}

export function AllocationDonut({ slices, total, height = 220 }: Props) {
  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const s = payload[0].payload as AllocationSlice
    return (
      <div className="rounded-xl border border-edge bg-surface px-4 py-3 shadow-pop text-xs">
        <p className="font-semibold text-ink mb-1">{s.label}</p>
        <p className="text-muted">Value <span className="ml-2 font-semibold text-ink">{formatCurrency(s.value)}</span></p>
        <p className="text-muted">Share <span className="ml-2 font-semibold text-ink">{formatPct(s.pct, { sign: false })}</span></p>
      </div>
    )
  }

  if (!total) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted">
        No holdings to allocate.
      </div>
    )
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="86%"
            strokeWidth={0}
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell key={s.asset} fill={s.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} cursor={false} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total</p>
        <p className="mt-0.5 text-base font-bold text-ink num">{formatCurrency(total, 'PKR', { compact: true })}</p>
        <div className="mt-1.5 flex gap-3">
          {slices.map((s) => (
            <span key={s.asset} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label} {formatPct(s.pct, { sign: false, decimals: 0 })}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}