export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(
  value: number | null | undefined,
  currency = 'PKR',
  opts: { maximumFractionDigits?: number; compact?: boolean } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const { maximumFractionDigits = 0, compact = false } = opts
  const formatter = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits,
    ...(compact ? { notation: 'compact' as const, maximumFractionDigits: 1 } : {}),
  })
  return formatter.format(value)
}

export function formatNumber(
  value: number | null | undefined,
  opts: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const { minimumFractionDigits = 0, maximumFractionDigits = minimumFractionDigits } = opts
  return new Intl.NumberFormat('en-PK', { minimumFractionDigits, maximumFractionDigits }).format(value)
}

export function formatQuantity(
  value: number | null | undefined,
  maximumFractionDigits = 4,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-PK', {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 2 ? 2 : maximumFractionDigits,
  }).format(value)
}

export function formatPct(
  value: number | null | undefined,
  opts: { sign?: boolean; decimals?: number } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const { sign = false, decimals = 2 } = opts
  const signPrefix = sign && value > 0 ? '+' : ''
  return `${signPrefix}${value.toFixed(decimals)}%`
}

/** Compact currency for tight spots, e.g. "28.4L" is avoided; uses PKR notation parser */
export function formatCurrencyAxis(value: number): string {
  return new Intl.NumberFormat('en-PK', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}