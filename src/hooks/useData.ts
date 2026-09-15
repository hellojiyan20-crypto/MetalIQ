import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  MarketRate,
  MarketRateInput,
  Investment,
  InvestmentInput,
  MarketNote,
  MarketNoteInput,
  PriceAlert,
  PriceAlertInput,
  Transaction,
} from '../types'
import { useAuth } from '../context/AuthContext'
import { marketRatesRepo, investmentsRepo, notesRepo, alertsRepo, transactionsRepo } from '../lib/data/repos'

interface UseData<T> {
  data: T[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

function useLoadedData<T>(loader: () => Promise<T[]>): UseData<T> {
  const { user } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await loader()
      setData(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user, loader])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

/* -------------------------------------------------------------------------
 * Market rates
 * ---------------------------------------------------------------------- */

export function useMarketRates() {
  const { data: rates, loading, error, refresh } = useLoadedData<MarketRate>(
    useCallback(() => marketRatesRepo.list(), []),
  )

  const sortedAsc = useMemo(() => [...rates].sort((a, b) => a.date.localeCompare(b.date)), [rates])
  const sortedDesc = useMemo(() => [...rates].sort((a, b) => b.date.localeCompare(a.date)), [rates])

  const saveRate = useCallback(
    async (input: MarketRateInput, existing?: MarketRate): Promise<MarketRate> => {
      if (existing) {
        const updated = await marketRatesRepo.update(existing.id, input)
        await refresh()
        return updated
      }
      const dup = await marketRatesRepo.getByDate(input.date)
      if (dup && dup.id) {
        throw new Error('DUPLICATE_DATE')
      }
      const created = await marketRatesRepo.create(input)
      await refresh()
      return created
    },
    [refresh],
  )

  const removeRate = useCallback(
    async (id: string) => {
      await marketRatesRepo.remove(id)
      await refresh()
    },
    [refresh],
  )

  return { rates: sortedAsc, ratesDesc: sortedDesc, loading, error, refresh, saveRate, removeRate }
}

/* -------------------------------------------------------------------------
 * Investments
 * ---------------------------------------------------------------------- */

export function useInvestments() {
  const { data: raw, loading, error, refresh } = useLoadedData<Investment>(
    useCallback(() => investmentsRepo.list(), []),
  )

  const investments = useMemo(
    () => [...raw].sort((a, b) => a.investment_date.localeCompare(b.investment_date)),
    [raw],
  )

  const saveInvestment = useCallback(
    async (input: InvestmentInput, existing?: Investment): Promise<Investment> => {
      const saved = existing
        ? await investmentsRepo.update(existing.id, input)
        : await investmentsRepo.create(input)
      await refresh()
      return saved
    },
    [refresh],
  )

  const removeInvestment = useCallback(
    async (id: string) => {
      await investmentsRepo.remove(id)
      await refresh()
    },
    [refresh],
  )

  return { investments, loading, error, refresh, saveInvestment, removeInvestment }
}

/* -------------------------------------------------------------------------
 * Journal notes
 * ---------------------------------------------------------------------- */

export function useNotes() {
  const { data: notes, loading, error, refresh } = useLoadedData<MarketNote>(
    useCallback(() => notesRepo.list(), []),
  )

  const addNote = useCallback(
    async (input: MarketNoteInput): Promise<MarketNote> => {
      const created = await notesRepo.create(input)
      await refresh()
      return created
    },
    [refresh],
  )

  const removeNote = useCallback(
    async (id: string) => {
      await notesRepo.remove(id)
      await refresh()
    },
    [refresh],
  )

  return { notes, loading, error, refresh, addNote, removeNote }
}

/* -------------------------------------------------------------------------
 * Price alerts
 * ---------------------------------------------------------------------- */

export function useAlerts() {
  const { data: alerts, loading, error, refresh } = useLoadedData<PriceAlert>(
    useCallback(() => alertsRepo.list(), []),
  )

  const addAlert = useCallback(
    async (input: PriceAlertInput): Promise<PriceAlert> => {
      const created = await alertsRepo.create(input)
      await refresh()
      return created
    },
    [refresh],
  )

  const updateAlert = useCallback(
    async (id: string, patch: Partial<PriceAlertInput>): Promise<PriceAlert> => {
      const updated = await alertsRepo.update(id, patch)
      await refresh()
      return updated
    },
    [refresh],
  )

  const removeAlert = useCallback(
    async (id: string) => {
      await alertsRepo.remove(id)
      await refresh()
    },
    [refresh],
  )

  return { alerts, loading, error, refresh, addAlert, updateAlert, removeAlert }
}

/* -------------------------------------------------------------------------
 * Transactions (buy/sell ledger)
 * ---------------------------------------------------------------------- */

export function useTransactions() {
  const { data: transactions, loading, error, refresh } = useLoadedData<Transaction>(
    useCallback(() => transactionsRepo.list(), []),
  )

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date)),
    [transactions],
  )

  return { transactions: sorted, loading, error, refresh }
}