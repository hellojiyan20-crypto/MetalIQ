import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ChartPeriodKey, DateRange } from '../types'
import { addDays, todayISO } from '../lib/dates'

export const PERIODS: { key: ChartPeriodKey; label: string; days: number | null }[] = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '3m', label: '3 Months', days: 90 },
  { key: '6m', label: '6 Months', days: 180 },
  { key: '1y', label: '1 Year', days: 365 },
  { key: 'all', label: 'All Time', days: null },
]

const PERIOD_DAYS: Record<string, number | null> = {
  today: 0,
  '7d': 7,
  '30d': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  all: null,
}

export function computeRange(key: ChartPeriodKey, custom?: { from: string; to: string }): DateRange {
  const today = todayISO()
  if (key === 'custom' && custom) {
    return { key, from: custom.from, to: custom.to }
  }
  const days = PERIOD_DAYS[key]
  if (key === 'all' || days === null) return { key, from: null, to: null }
  return { key, from: addDays(today, -days), to: today }
}

interface DateRangeContextValue {
  range: DateRange
  setPreset: (key: ChartPeriodKey) => void
  setCustom: (from: string, to: string) => void
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null)

export function DateRangeProvider({ initial = '30d', children }: { initial?: ChartPeriodKey; children: ReactNode }) {
  const [key, setKey] = useState<ChartPeriodKey>(initial)
  const [custom, setCustomState] = useState<{ from: string; to: string }>(() => ({
    from: addDays(todayISO(), -30),
    to: todayISO(),
  }))

  const setPreset = useCallback((k: ChartPeriodKey) => setKey(k), [])
  const setCustom = useCallback((from: string, to: string) => {
    setCustomState({ from, to })
    setKey('custom')
  }, [])

  const range = useMemo(() => computeRange(key, custom), [key, custom])

  const value = useMemo(() => ({ range, setPreset, setCustom }), [range, setPreset, setCustom])

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext)
  if (!ctx) throw new Error('useDateRange must be used within DateRangeProvider')
  return ctx
}

export function filterRatesByRange<T extends { date: string }>(items: T[], range: DateRange): T[] {
  return items.filter((r) => {
    if (range.from && r.date < range.from) return false
    if (range.to && r.date > range.to) return false
    return true
  })
}