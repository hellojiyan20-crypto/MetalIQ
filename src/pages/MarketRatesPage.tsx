import { useMemo, useState } from 'react'
import { Download, Pencil, Plus, Search, Trash2, TrendingUp, Eye } from 'lucide-react'
import { useMarketRates } from '../hooks/useData'
import { useSettings } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAssetScope, scopeAssets } from '../context/AssetScopeContext'
import { changeBetween } from '../services/calculations'
import type { MarketRate, AssetType } from '../types'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Modal } from '../components/ui/Modal'
import { RateForm } from '../components/rates/RateForm'
import { LoadingState, ErrorState, EmptyState } from '../components/ui/State'
import { ArrowPct } from '../components/market/ChangeIndicator'
import { Pagination } from '../components/ui/Pagination'
import { formatCurrency } from '../lib/utils'
import { formatDateShort } from '../lib/dates'
import { todayISO } from '../lib/dates'
import { downloadCsv } from '../lib/csv'
import { unitLabel } from '../lib/units'
import { cn } from '../lib/utils'

type SortKey = 'date' | 'gold' | 'silver' | 'goldPct' | 'silverPct' | 'none'

interface Row {
  rate: MarketRate
  goldChange: ReturnType<typeof changeBetween>
  silverChange: ReturnType<typeof changeBetween>
}

export default function MarketRatesPage() {
  const { rates, loading, error, refresh, saveRate, removeRate } = useMarketRates()
  const { settings } = useSettings()
  const { toast } = useToast()
  const { scope } = useAssetScope()
  const currency = settings.currency
  const assets = scopeAssets(scope)

  // In a single-metal workspace only show dates that actually carry that metal,
  // so a gold-only entry never appears as an empty silver row (and vice versa).
  const metalRates = useMemo(() => {
    if (scope === 'gold') return rates.filter((r) => r.gold_buy_rate !== null || r.gold_sell_rate !== null)
    if (scope === 'silver') return rates.filter((r) => r.silver_buy_rate !== null || r.silver_sell_rate !== null)
    return rates
  }, [rates, scope])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MarketRate | null>(null)
  const [details, setDetails] = useState<MarketRate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MarketRate | null>(null)

  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const rows = useMemo<Row[]>(() => {
    const changeMap = new Map<string, { gold: ReturnType<typeof changeBetween>; silver: ReturnType<typeof changeBetween> }>()
    const asc = metalRates
    for (let i = 1; i < asc.length; i++) {
      const d = asc[i].date
      changeMap.set(d, {
        gold: changeBetween(asc[i].gold_sell_rate, asc[i - 1].gold_sell_rate),
        silver: changeBetween(asc[i].silver_sell_rate, asc[i - 1].silver_sell_rate),
      })
    }
    return asc.map((r) => {
      const c = changeMap.get(r.date)
      return {
        rate: r,
        goldChange: c?.gold ?? changeBetween(null, null),
        silverChange: c?.silver ?? changeBetween(null, null),
      }
    })
  }, [metalRates])

  const filtered = useMemo(() => {
    let out = rows
    const q = search.toLowerCase()
    if (q) out = out.filter(({ rate }) => (rate.notes ?? '').toLowerCase().includes(q) || (rate.source ?? '').toLowerCase().includes(q))
    if (from) out = out.filter(({ rate }) => rate.date >= from)
    if (to) out = out.filter(({ rate }) => rate.date <= to)

    const dir = sortDir === 'asc' ? 1 : -1
    return [...out].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = a.rate.date.localeCompare(b.rate.date)
      else if (sortKey === 'gold') cmp = (a.rate.gold_sell_rate ?? 0) - (b.rate.gold_sell_rate ?? 0)
      else if (sortKey === 'silver') cmp = (a.rate.silver_sell_rate ?? 0) - (b.rate.silver_sell_rate ?? 0)
      else if (sortKey === 'goldPct') cmp = (a.goldChange.pct ?? 0) - (b.goldChange.pct ?? 0)
      else if (sortKey === 'silverPct') cmp = (a.silverChange.pct ?? 0) - (b.silverChange.pct ?? 0)
      return cmp * dir
    })
  }, [rows, search, from, to, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(k)
      setSortDir('desc')
    }
  }

  const SortTh = ({ label, k, align = 'left' }: { label: string; k: SortKey; align?: 'left' | 'right' }) => (
    <th className="th" style={{ textAlign: align }}>
      <button
        onClick={() => toggleSort(k)}
        className={cn('inline-flex items-center gap-1 transition-colors hover:text-ink', align === 'right' && 'flex-row-reverse')}
      >
        {label}
        <span className={cn('text-faint', sortKey === k ? 'opacity-100' : 'opacity-0')}>{sortDir === 'asc' ? '↑' : '↓'}</span>
      </button>
    </th>
  )

  const handleSave = async (input: Parameters<typeof saveRate>[0], existing?: MarketRate) => {
    try {
      await saveRate(input, existing)
      toast(existing ? 'Rate updated.' : 'Rate saved.', 'success')
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_DATE') {
        toast('A rate already exists for that date — edit the existing entry instead.', 'error')
      } else {
        toast(err instanceof Error ? err.message : 'Failed to save.', 'error')
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await removeRate(deleteTarget.id)
      toast(`Rate for ${formatDateShort(deleteTarget.date)} deleted.`, 'success')
      setDeleteTarget(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error')
    }
  }

  const handleExport = () => {
    const header = ['Date', 'Gold Buy', 'Gold Sell', 'Silver Buy', 'Silver Sell', 'Gold Unit', 'Silver Unit', 'Source', 'Notes']
    const data = rates.map((r) => [
      r.date,
      r.gold_buy_rate ?? '',
      r.gold_sell_rate ?? '',
      r.silver_buy_rate ?? '',
      r.silver_sell_rate ?? '',
      r.gold_unit ?? '',
      r.silver_unit ?? '',
      r.source ?? '',
      r.notes ?? '',
    ])
    downloadCsv(`market-rates-${todayISO()}.csv`, [header, ...data])
    toast('Market rates exported as CSV.', 'success')
  }

  if (loading) return <LoadingState label="Loading rate history" />
  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          void refresh()
        }}
      />
    )

  if (metalRates.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title={scope === 'both' ? 'Market rates' : `${scope === 'gold' ? 'Gold' : 'Silver'} rates`} subtitle={`No ${scope === 'both' ? '' : scope} entries yet in your history.`} />
        <Card>
          <EmptyState
            icon={<TrendingUp className="h-6 w-6" />}
            title={scope === 'both' ? 'No market data yet' : `No ${scope === 'gold' ? 'gold' : 'silver'} data yet`}
            description={scope === 'both' ? "Add today's Gold & Silver rates to start building your market history." : `Add today's ${scope === 'gold' ? 'gold' : 'silver'} rates to start building your market history.`}
            action={
              <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Add first rate
              </button>
            }
          />
        </Card>
        <RateForm open={formOpen} onClose={() => setFormOpen(false)} existing={null} rates={rates} onSave={handleSave} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={scope === 'both' ? 'Market rates' : `${scope === 'gold' ? 'Gold' : 'Silver'} rates`}
        subtitle={`${metalRates.length} daily entr${metalRates.length === 1 ? 'y' : 'ies'} in your history.`}
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Add rate
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-edge px-4 py-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search source or notes…"
              className="input pl-9 py-2 text-sm"
              aria-label="Search"
            />
          </div>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} className="input w-auto py-2 text-sm" aria-label="From date" />
          <span className="text-xs text-faint">to</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} className="input w-auto py-2 text-sm" aria-label="To date" />
          <span className="ml-auto text-xs text-muted hidden sm:block">{filtered.length} of {rates.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className={cn('w-full', scope === 'both' ? 'min-w-[1000px]' : 'min-w-[600px]')}>
            <thead className="bg-surface2/60">
              <tr>
                <SortTh label="Date" k="date" />
                {assets.includes('gold') && (
                  <>
                    <SortTh label="Gold Buy" k="gold" align="right" />
                    <SortTh label="Gold Sell" k="gold" align="right" />
                    <SortTh label="Gold Δ" k="goldPct" align="right" />
                  </>
                )}
                {assets.includes('silver') && (
                  <>
                    <SortTh label="Silver Buy" k="silver" align="right" />
                    <SortTh label="Silver Sell" k="silver" align="right" />
                    <SortTh label="Silver Δ" k="silverPct" align="right" />
                  </>
                )}
                <th className="th">Unit</th>
                <th className="th">Notes</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ rate, goldChange, silverChange }) => (
                <tr key={rate.id} className="table-row">
                  <td className="td font-medium">{formatDateShort(rate.date)}</td>
                  {assets.includes('gold') && (
                    <>
                      <td className="td text-right num">{formatCurrency(rate.gold_buy_rate, currency)}</td>
                      <td className="td text-right num font-semibold">{formatCurrency(rate.gold_sell_rate, currency)}</td>
                      <td className="td text-right"><ArrowPct value={rate.gold_sell_rate !== null ? goldChange.pct : null} /></td>
                    </>
                  )}
                  {assets.includes('silver') && (
                    <>
                      <td className="td text-right num">{formatCurrency(rate.silver_buy_rate, currency)}</td>
                      <td className="td text-right num font-semibold">{formatCurrency(rate.silver_sell_rate, currency)}</td>
                      <td className="td text-right"><ArrowPct value={rate.silver_sell_rate !== null ? silverChange.pct : null} /></td>
                    </>
                  )}
                  <td className="td text-xs text-muted">
                    {scope === 'gold'
                      ? unitLabel(rate.gold_unit)
                      : scope === 'silver'
                        ? unitLabel(rate.silver_unit)
                        : unitLabel(rate.gold_unit ?? rate.silver_unit)}
                  </td>
                  <td className="td max-w-[180px] truncate text-xs text-muted">{rate.notes ?? '—'}</td>
                  <td className="td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setDetails(rate)} className="btn-icon h-8 w-8" aria-label="View details"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => { setEditing(rate); setFormOpen(true) }} className="btn-icon h-8 w-8" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(rate)} className="btn-icon h-8 w-8 text-negative hover:bg-negative-bg" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pageRows.length && (
            <div className="px-4 py-10 text-center text-sm text-muted">No entries match this filter.</div>
          )}
        </div>

        <Pagination className="px-4 py-3" page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} />
      </Card>

      <RateForm open={formOpen} onClose={() => setFormOpen(false)} existing={editing} rates={rates} onSave={handleSave} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this rate entry?"
        message={`${deleteTarget ? formatDateShort(deleteTarget.date) : ''} will be removed from your history permanently. This cannot be undone.`}
        confirmLabel="Delete entry"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <RateDetailsModal rate={details} currency={currency} assets={assets} onClose={() => setDetails(null)} />
    </div>
  )
}

function RateDetailsModal({
  rate,
  currency,
  assets,
  onClose,
}: {
  rate: MarketRate | null
  currency: string
  assets: AssetType[]
  onClose: () => void
}) {
  if (!rate) return null
  const cell = (label: string, value: number | null, unit: string | null) => (
    <div className="rounded-xl border border-edge bg-surface2/50 px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="num mt-0.5 text-sm font-bold text-ink">
        {formatCurrency(value, currency)} <span className="text-[11px] font-normal text-muted">/ {unit ?? ''}</span>
      </p>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={`Rate details · ${formatDateShort(rate.date)}`} size="md">
      <div className="space-y-4">
        <div className={cn('grid grid-cols-1 gap-3', assets.length > 1 ? 'sm:grid-cols-2' : '')}>
          {assets.includes('gold') && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gold">Gold</p>
              {cell('Buy', rate.gold_buy_rate, rate.gold_unit)}
              {cell('Sell', rate.gold_sell_rate, rate.gold_unit)}
            </div>
          )}
          {assets.includes('silver') && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-silver">Silver</p>
              {cell('Buy', rate.silver_buy_rate, rate.silver_unit)}
              {cell('Sell', rate.silver_sell_rate, rate.silver_unit)}
            </div>
          )}
        </div>
        {rate.source && (
          <div className="rounded-xl border border-edge px-4 py-3 text-xs">
            <p className="font-semibold text-ink">Source</p>
            <p className="mt-0.5 text-muted">{rate.source}</p>
          </div>
        )}
        {rate.notes && (
          <div className="rounded-xl border border-edge px-4 py-3 text-xs">
            <p className="font-semibold text-ink">Notes</p>
            <p className="mt-0.5 text-muted">{rate.notes}</p>
          </div>
        )}
        {!rate.notes && !rate.source && (
          <p className="text-xs text-muted">No notes or source recorded for this entry.</p>
        )}
        <p className="text-[11px] text-faint">
          Entered {formatDateShort(rate.created_at.slice(0, 10))}
          {rate.updated_at !== rate.created_at ? ` · updated ${formatDateShort(rate.updated_at.slice(0, 10))}` : ''}
        </p>
      </div>
    </Modal>
  )
}