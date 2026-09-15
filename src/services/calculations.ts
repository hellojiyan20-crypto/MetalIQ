import type { AssetType, Investment, MarketRate, ValuationMethod } from '../types'
import { daysBetween, todayISO } from '../lib/dates'
import { convertUnit, normalizeUnit } from '../lib/units'

export interface PctInfo {
  absolute: number | null
  pct: number | null
  ok: boolean
}

export const NO_DATA: PctInfo = { absolute: null, pct: null, ok: false }

export function assetBuy(rate: MarketRate, asset: AssetType): number | null {
  return asset === 'gold' ? rate.gold_buy_rate : rate.silver_buy_rate
}

export function assetSell(rate: MarketRate, asset: AssetType): number | null {
  return asset === 'gold' ? rate.gold_sell_rate : rate.silver_sell_rate
}

export function rateValue(rate: MarketRate, asset: AssetType, method: ValuationMethod): number | null {
  const buy = assetBuy(rate, asset)
  const sell = assetSell(rate, asset)
  if (method === 'buy') return buy
  if (method === 'sell') return sell
  if (buy !== null && sell !== null) return (buy + sell) / 2
  return buy ?? sell
}

/** Latest rate entry on or before `date`. Assumes rates sorted ascending. */
export function rateOnOrBefore(rates: MarketRate[], date: string): MarketRate | null {
  if (!rates.length) return null
  let found: MarketRate | null = null
  for (const r of rates) {
    if (r.date <= date) found = r
    else break
  }
  return found
}

/** The unit a given rate entry is quoted in for an asset (normalized to tola / gram / ounce). */
export function rateUnitOf(rate: MarketRate, asset: AssetType): string {
  const u = asset === 'gold' ? rate.gold_unit : rate.silver_unit
  return normalizeUnit(u ?? '')
}

/** The quote unit for an asset at a date (uses the rate on/before that date, or the latest). */
export function rateUnitFor(rates: MarketRate[], asset: AssetType, date?: string): string {
  const r = date ? rateOnOrBefore(rates, date) : latestRate(rates)
  return r ? rateUnitOf(r, asset) : 'tola'
}

export function latestRate(rates: MarketRate[]): MarketRate | null {
  return rates.length ? rates[rates.length - 1] : null
}

export function latestAssetRate(
  rates: MarketRate[],
  asset: AssetType,
  method: ValuationMethod,
): number | null {
  // Skip trailing dates where this metal has no data, so a gold-only latest day
  // doesn't make the silver workspace appear empty (and vice versa).
  for (let i = rates.length - 1; i >= 0; i--) {
    const v = rateValue(rates[i], asset, method)
    if (v !== null) return v
  }
  return null
}

/** Change between two rate values. Positive base = rising market. */
export function changeBetween(
  current: number | null,
  previous: number | null,
): PctInfo {
  if (current === null || previous === null || previous === 0) return NO_DATA
  const absolute = current - previous
  return { absolute, pct: (absolute / previous) * 100, ok: true }
}

export function dailyChange(
  rates: MarketRate[],
  asset: AssetType,
  method: ValuationMethod,
): PctInfo {
  if (rates.length < 2) return NO_DATA
  const prev = rates[rates.length - 2]
  const last = rates[rates.length - 1]
  return changeBetween(rateValue(last, asset, method), rateValue(prev, asset, method))
}

/**
 * Change over a trailing window (e.g. 7 / 30 / 365 days).
 * Compares the latest value against the value closest to `days` ago.
 */
export function periodChange(
  rates: MarketRate[],
  asset: AssetType,
  method: ValuationMethod,
  days: number,
): PctInfo {
  if (rates.length < 2) return NO_DATA
  const last = latestRate(rates)
  if (!last) return NO_DATA
  const targetDate = last.date <= todayISO() ? last.date : todayISO()
  const cutoff = subDaysISO(targetDate, days)
  const anchor = rateOnOrBefore(rates, cutoff)
  if (!anchor || anchor.date === last.date) return NO_DATA
  return changeBetween(rateValue(last, asset, method), rateValue(anchor, asset, method))
}

function subDaysISO(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() - days)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

/** Rates within the trailing `days` window (inclusive). */
export function trailingWindow(rates: MarketRate[], days: number): MarketRate[] {
  if (!rates.length) return []
  const last = latestRate(rates)!
  const cutoff = subDaysISO(last.date, days)
  return rates.filter((r) => r.date >= cutoff)
}

export function averageRate(
  rates: MarketRate[],
  asset: AssetType,
  method: ValuationMethod,
): number | null {
  const values = rates.map((r) => rateValue(r, asset, method)).filter((v): v is number => v !== null)
  if (!values.length) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export interface TrendReason {
  text: string
  kind: 'positive' | 'negative' | 'neutral'
}

export type TrendLabel = 'Strong Uptrend' | 'Uptrend' | 'Neutral' | 'Downtrend' | 'Strong Downtrend'

export interface TrendResult {
  direction: 'up' | 'down' | 'neutral'
  label: TrendLabel
  score: number
  reasons: TrendReason[]
  current: number | null
  currentVs7: PctInfo
  currentVs30: PctInfo
  currentVs90: PctInfo
  momentum30: PctInfo
  momentum90: PctInfo
  sampleCount: number
  sufficient: boolean
}

function sign(info: PctInfo, tolerance = 0.25): number {
  if (!info.pct || !Number.isFinite(info.pct)) return 0
  if (Math.abs(info.pct) <= tolerance) return 0
  return info.pct > 0 ? 1 : -1
}

/**
 * Transparent trend score.
 * Each of 5 signals contributes +1 / 0 / -1:
 *   current vs 7d avg, vs 30d avg, vs 90d avg, 30-day movement, 90-day movement
 * Score 5..3 → Strong Uptrend · 2..1 → Uptrend · 0 → Neutral · -1..-2 → Downtrend · -3..-5 → Strong Downtrend
 */
export function computeTrend(
  rates: MarketRate[],
  asset: AssetType,
  method: ValuationMethod,
): TrendResult {
  const sufficient = rates.length >= 30
  const last = latestRate(rates)
  const current = last ? rateValue(last, asset, method) : null

  const avg7 = sufficient ? averageRate(trailingWindow(rates, 7), asset, method) : null
  const avg30 = sufficient ? averageRate(trailingWindow(rates, 30), asset, method) : null
  const avg90 = sufficient ? averageRate(trailingWindow(rates, 90), asset, method) : null
  const m30 = periodChange(rates, asset, method, 30)
  const m90 = periodChange(rates, asset, method, 90)

  const c7 = changeBetween(current, avg7)
  const c30 = changeBetween(current, avg30)
  const c90 = changeBetween(current, avg90)

  const score = sign(c7) + sign(c30) + sign(c90) + sign(m30) + sign(m90)

  let label: TrendLabel
  if (score >= 3) label = 'Strong Uptrend'
  else if (score >= 1) label = 'Uptrend'
  else if (score >= -0) label = 'Neutral'
  else if (score >= -2) label = 'Downtrend'
  else label = 'Strong Downtrend'

  const reasons: TrendReason[] = []
  if (current !== null && avg30 !== null && Number.isFinite(c30.pct)) {
    const above = c30.pct! >= 0.25
    reasons.push({
      text: `Current price is ${Math.abs(c30.pct!).toFixed(2)}% ${above ? 'above' : 'below'} the 30-day average.`,
      kind: above ? 'positive' : 'negative',
    })
  }
  if (avg7 !== null && Number.isFinite(c7.pct)) {
    reasons.push({
      text: `Current price is ${Math.abs(c7.pct!).toFixed(2)}% ${c7.pct! >= 0.25 ? 'above' : c7.pct! <= -0.25 ? 'below' : 'near'} the 7-day average.`,
      kind: c7.pct! >= 0.25 ? 'positive' : c7.pct! <= -0.25 ? 'negative' : 'neutral',
    })
  }
  if (Number.isFinite(m30.pct)) {
    reasons.push({
      text: `30-day movement: ${m30.pct! >= 0 ? '+' : ''}${m30.pct!.toFixed(2)}%.`,
      kind: m30.pct! >= 0.25 ? 'positive' : m30.pct! <= -0.25 ? 'negative' : 'neutral',
    })
  }
  if (Number.isFinite(m90.pct)) {
    reasons.push({
      text: `90-day movement: ${m90.pct! >= 0 ? '+' : ''}${m90.pct!.toFixed(2)}%.`,
      kind: m90.pct! >= 0.25 ? 'positive' : m90.pct! <= -0.25 ? 'negative' : 'neutral',
    })
  }

  return {
    direction: score > 0 ? 'up' : score < 0 ? 'down' : 'neutral',
    label,
    score,
    reasons,
    current,
    currentVs7: c7,
    currentVs30: c30,
    currentVs90: c90,
    momentum30: m30,
    momentum90: m90,
    sampleCount: rates.length,
    sufficient,
  }
}

/* --------------------------------------------------------------------------
 * Asset analytics
 * ------------------------------------------------------------------------ */

export interface AssetAnalytics {
  current: number | null
  highest: number | null
  highestDate: string | null
  lowest: number | null
  lowestDate: string | null
  avgAll: number | null
  avg7: number | null
  avg30: number | null
  avg90: number | null
  avgYear: number | null
  highestDailyIncrease: number | null
  highestDailyIncreaseDate: string | null
  highestDailyDecrease: number | null
  highestDailyDecreaseDate: string | null
  totalGrowth: number | null
  totalGrowthAbsolute: number | null
  sampleCount: number
}

export function assetAnalytics(
  rates: MarketRate[],
  asset: AssetType,
  method: ValuationMethod,
): AssetAnalytics {
  const values = rates
    .map((r) => ({ date: r.date, v: rateValue(r, asset, method) }))
    .filter((x): x is { date: string; v: number } => x.v !== null)

  if (!values.length) {
    return {
      current: null, highest: null, highestDate: null, lowest: null, lowestDate: null,
      avgAll: null, avg7: null, avg30: null, avg90: null, avgYear: null,
      highestDailyIncrease: null, highestDailyIncreaseDate: null,
      highestDailyDecrease: null, highestDailyDecreaseDate: null,
      totalGrowth: null, totalGrowthAbsolute: null, sampleCount: 0,
    }
  }

  let highest = values[0].v
  let highestDate = values[0].date
  let lowest = values[0].v
  let lowestDate = values[0].date
  for (const v of values) {
    if (v.v > highest) { highest = v.v; highestDate = v.date }
    if (v.v < lowest) { lowest = v.v; lowestDate = v.date }
  }

  let inc = 0
  let incDate: string | null = null
  let dec = 0
  let decDate: string | null = null
  for (let i = 1; i < values.length; i++) {
    const diff = values[i].v - values[i - 1].v
    if (diff > inc) { inc = diff; incDate = values[i].date }
    if (diff < dec) { dec = diff; decDate = values[i].date }
  }

  const first = values[0].v
  const lastValue = values[values.length - 1].v
  const totalGrowthAbsolute = lastValue - first
  const totalGrowth = first !== 0 ? (totalGrowthAbsolute / first) * 100 : null

  return {
    current: lastValue,
    highest,
    highestDate,
    lowest,
    lowestDate,
    avgAll: averageRate(rates, asset, method),
    avg7: averageRate(trailingWindow(rates, 7), asset, method),
    avg30: averageRate(trailingWindow(rates, 30), asset, method),
    avg90: averageRate(trailingWindow(rates, 90), asset, method),
    avgYear: averageRate(trailingWindow(rates, 365), asset, method),
    highestDailyIncrease: inc > 0 ? inc : null,
    highestDailyIncreaseDate: inc > 0 ? incDate : null,
    highestDailyDecrease: dec < 0 ? dec : null,
    highestDailyDecreaseDate: dec < 0 ? decDate : null,
    totalGrowth,
    totalGrowthAbsolute,
    sampleCount: values.length,
  }
}

/* --------------------------------------------------------------------------
 * Returns over multiple windows
 * ------------------------------------------------------------------------ */

export interface AssetReturns {
  current: number | null
  d7: PctInfo
  d30: PctInfo
  d90: PctInfo
  d365: PctInfo
  allTime: PctInfo
}

export function assetReturns(rates: MarketRate[], asset: AssetType, method: ValuationMethod): AssetReturns {
  const current = latestAssetRate(rates, asset, method)
  let allTime: PctInfo = NO_DATA
  if (rates.length >= 2 && current !== null) {
    const first = rates.find((r) => rateValue(r, asset, method) !== null)
    if (first) {
      const fv = rateValue(first, asset, method)
      if (fv !== null && first.date !== latestRate(rates)!.date) {
        allTime = changeBetween(current, fv)
      }
    }
  }
  return {
    current,
    d7: periodChange(rates, asset, method, 7),
    d30: periodChange(rates, asset, method, 30),
    d90: periodChange(rates, asset, method, 90),
    d365: periodChange(rates, asset, method, 365),
    allTime,
  }
}

/** Standard deviation of daily % returns over the full history (annualized not needed). */
export function volatility(rates: MarketRate[], asset: AssetType, method: ValuationMethod): number | null {
  const values = rates
    .map((r) => rateValue(r, asset, method))
    .filter((v): v is number => v !== null && v > 0)
  if (values.length < 3) return null
  const returns: number[] = []
  for (let i = 1; i < values.length; i++) {
    returns.push((values[i] - values[i - 1]) / values[i - 1])
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance) * 100
}

/* --------------------------------------------------------------------------
 * Investments & portfolio
 * ------------------------------------------------------------------------ */

export interface InvestmentValuation {
  investment: Investment
  original: number
  currentRate: number | null
  currentRateUnit: string
  usedMethod: ValuationMethod
  usedRateLabel: string
  currentValue: number | null
  profit: number | null
  profitPct: number | null
  holdingDays: number
}

export function rateLabel(method: ValuationMethod): string {
  if (method === 'buy') return 'Buy rate'
  if (method === 'sell') return 'Sell rate'
  return 'Buy/sell average'
}

export function valueInvestment(
  inv: Investment,
  rates: MarketRate[],
  method: ValuationMethod,
): InvestmentValuation {
  const original = inv.total_amount
  const currentRateUnit = rateUnitFor(rates, inv.asset_type)
  const currentRate = latestAssetRate(rates, inv.asset_type, method)
  const holdingDays = daysBetween(inv.investment_date, todayISO())
  // The rate is quoted per `currentRateUnit`; bring the holdings into that same unit first.
  const qtyInRateUnit = convertUnit(inv.quantity, inv.unit, currentRateUnit)
  let currentValue: number | null = null
  let profit: number | null = null
  let profitPct: number | null = null
  if (currentRate !== null) {
    currentValue = qtyInRateUnit * currentRate
    profit = currentValue - original
    profitPct = original > 0 ? (profit / original) * 100 : null
  }
  return {
    investment: inv,
    original,
    currentRate,
    currentRateUnit,
    usedMethod: method,
    usedRateLabel: rateLabel(method),
    currentValue,
    profit,
    profitPct,
    holdingDays,
  }
}

export interface AssetHolding {
  invested: number
  value: number
  quantity: number
  units: string
}

export interface PortfolioSummary {
  invested: number
  currentValue: number
  profit: number
  profitPct: number | null
  gold: AssetHolding
  silver: AssetHolding
  valuations: InvestmentValuation[]
  best: InvestmentValuation | null
  worst: InvestmentValuation | null
  count: number
  avgInvestment: number
}

export function summarizePortfolio(
  investments: Investment[],
  rates: MarketRate[],
  method: ValuationMethod,
): PortfolioSummary {
  const valuations = investments.map((inv) => valueInvestment(inv, rates, method))

  const gold: AssetHolding = { invested: 0, value: 0, quantity: 0, units: rateUnitFor(rates, 'gold') }
  const silver: AssetHolding = { invested: 0, value: 0, quantity: 0, units: rateUnitFor(rates, 'silver') }
  let invested = 0
  let currentValue = 0

  for (const v of valuations) {
    const holding = v.investment.asset_type === 'gold' ? gold : silver
    holding.invested += v.original
    // Every holding is accumulated in the metal's current quote unit (e.g. tola).
    holding.quantity += convertUnit(v.investment.quantity, v.investment.unit, holding.units)
    invested += v.original
    if (v.currentValue !== null) {
      currentValue += v.currentValue
      holding.value += v.currentValue
    }
  }

  const known = valuations.filter((v) => v.currentValue !== null)

  const best = known.length
    ? known.reduce((a, b) => ((a.profit ?? -Infinity) >= (b.profit ?? -Infinity) ? a : b))
    : null
  const worst = known.length
    ? known.reduce((a, b) => ((a.profit ?? Infinity) <= (b.profit ?? Infinity) ? a : b))
    : null

  const profit = currentValue - invested
  const profitPct = invested > 0 ? (profit / invested) * 100 : null
  const count = investments.length
  const avgInvestment = count ? invested / count : 0

  return {
    invested,
    currentValue,
    profit,
    profitPct,
    gold,
    silver,
    valuations,
    best,
    worst,
    count,
    avgInvestment,
  }
}

export interface SeriesPoint {
  date: string
  value: number
}

/** Historical value of one investment using market rates at each date. */
export function investmentValueSeries(
  inv: Investment,
  rates: MarketRate[],
  method: ValuationMethod,
): { points: SeriesPoint[]; usedPurchaseFallback: boolean } {
  const points: SeriesPoint[] = []
  let usedFallback = false

  const bidDate = inv.investment_date
  points.push({ date: bidDate, value: inv.total_amount })

  const start = inv.investment_date
  const after = rates.filter((r) => r.date >= start)
  for (const r of after) {
    const v = rateValue(r, inv.asset_type, method)
    if (v === null || v <= 0) {
      points.push({ date: r.date, value: points[points.length - 1].value })
      usedFallback = true
      continue
    }
    const qty = convertUnit(inv.quantity, inv.unit, rateUnitOf(r, inv.asset_type))
    points.push({ date: r.date, value: qty * v })
  }

  // de-duplicate same-date and keep ascending
  const seen = new Set<string>()
  const deduped = points.filter((p) => {
    if (seen.has(p.date)) return false
    seen.add(p.date)
    return true
  })
  return { points: deduped, usedPurchaseFallback: usedFallback }
}

/** Portfolio value across all historical rate dates, with invested-cost line. */
export function portfolioValueSeries(
  investments: Investment[],
  rates: MarketRate[],
  method: ValuationMethod,
): { points: SeriesPoint[]; investedPoints: SeriesPoint[]; usedPurchaseFallback: boolean } {
  if (!investments.length || !rates.length) return { points: [], investedPoints: [], usedPurchaseFallback: false }

  const startDate = investments.reduce((a, b) => (a.investment_date < b.investment_date ? a : b)).investment_date
  const activeInvestments = investments.filter((i) => i.investment_date <= latestRate(rates)!.date)

  const points: SeriesPoint[] = []
  const investedPoints: SeriesPoint[] = []
  let usedFallback = false

  const pushAt = (date: string) => {
    let value = 0
    let invested = 0
    for (const inv of activeInvestments) {
      if (inv.investment_date > date) continue
      invested += inv.total_amount
      const entry = rateOnOrBefore(rates, date)
      const v = entry ? rateValue(entry, inv.asset_type, method) : null
      if (v !== null && v > 0 && entry) {
        const qty = convertUnit(inv.quantity, inv.unit, rateUnitOf(entry, inv.asset_type))
        value += qty * v
      } else if (v === null) {
        value += inv.total_amount
        usedFallback = true
      }
    }
    points.push({ date, value })
    investedPoints.push({ date, value: invested })
  }

  const allDates = [
    startDate,
    ...rates.filter((r) => r.date >= startDate).map((r) => r.date),
  ]
  const unique = [...new Set(allDates)].sort()
  for (const d of unique) pushAt(d)

  return { points, investedPoints, usedPurchaseFallback: usedFallback }
}

export interface AllocationSlice {
  asset: AssetType
  label: string
  value: number
  pct: number
  color: string
}

export function goldSilverAllocation(summary: PortfolioSummary): AllocationSlice[] {
  const total = summary.gold.value + summary.silver.value
  const mk = (asset: 'gold' | 'silver', value: number, color: string): AllocationSlice => ({
    asset,
    label: asset === 'gold' ? 'Gold' : 'Silver',
    value,
    pct: total > 0 ? (value / total) * 100 : 0,
    color,
  })
  return [mk('gold', summary.gold.value, '#C9A227'), mk('silver', summary.silver.value, '#9AA0A8')]
}

export function formatHoldingPeriod(days: number): string {
  if (days < 1) return 'Today'
  if (days < 30) return `${days} days`
  if (days < 365) {
    const m = Math.floor(days / 30)
    const d = days % 30
    return d > 0 ? `${m}m ${d}d` : `${m} months`
  }
  const y = Math.floor(days / 365)
  const rem = days % 365
  const m = Math.floor(rem / 30)
  return m > 0 ? `${y}y ${m}m` : `${y} year${y > 1 ? 's' : ''}`
}