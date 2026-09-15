import { useMemo, useState } from 'react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import type { Investment, AssetType } from '../../types'
import type { InvestmentValuation } from '../../services/calculations'
import { formatCurrency, formatQuantity, formatPct } from '../../lib/utils'
import { formatDateShort } from '../../lib/dates'
import { formatHoldingPeriod } from '../../services/calculations'
import { Card } from '../ui/Card'
import { Badge, DeltaBadge } from '../ui/Badge'
import { AssetIcon, ASSET_META } from '../market/AssetIcon'
import { Pagination } from '../ui/Pagination'
import { cn } from '../../lib/utils'

interface InvestmentsTableProps {
  investments: Investment[]
  valuations: Map<string, InvestmentValuation>
  currency: string
  hideAsset?: boolean
  onView: (inv: Investment) => void
  onEdit: (inv: Investment) => void
  onDelete: (inv: Investment) => void
}

type SortKey = 'date' | 'invested' | 'value' | 'profitPct'

export function InvestmentsTable({ investments, valuations, currency, hideAsset = false, onView, onEdit, onDelete }: InvestmentsTableProps) {
  const [filterAsset, setFilterAsset] = useState<'all' | AssetType>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<'all' | 'profit' | 'loss'>('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => {
    let rows = investments
    if (filterAsset !== 'all') rows = rows.filter((i) => i.asset_type === filterAsset)
    if (from) rows = rows.filter((i) => i.investment_date >= from)
    if (to) rows = rows.filter((i) => i.investment_date <= to)
    if (status !== 'all') {
      rows = rows.filter((i) => {
        const v = valuations.get(i.id)
        const p = v?.profit
        if (p === null || p === undefined || !Number.isFinite(p)) return false
        return status === 'profit' ? p >= 0 : p < 0
      })
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter((i) => (i.notes ?? '').toLowerCase().includes(q) || i.unit.toLowerCase().includes(q))
    }

    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = valuations.get(a.id)
      const vb = valuations.get(b.id)
      let cmp = 0
      if (sortKey === 'date') cmp = a.investment_date.localeCompare(b.investment_date)
      else if (sortKey === 'invested') cmp = a.total_amount - b.total_amount
      else if (sortKey === 'value') cmp = (va?.currentValue ?? 0) - (vb?.currentValue ?? 0)
      else cmp = (va?.profitPct ?? 0) - (vb?.profitPct ?? 0)
      return cmp * dir
    })
  }, [investments, valuations, filterAsset, from, to, status, query, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 hover:text-ink transition-colors"
    >
      {label}
      <span className={cn('text-faint', sortKey === k ? 'opacity-100' : 'opacity-0')}>
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    </button>
  )

  return (
    <Card className="overflow-hidden">
      {/* filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge px-4 py-3">
        {!hideAsset && (
          <select className="select w-auto py-1.5 text-xs" value={filterAsset} onChange={(e) => { setFilterAsset(e.target.value as 'all' | AssetType); setPage(1) }} aria-label="Asset filter">
            <option value="all">All assets</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
          </select>
        )}
        <input
          type="date"
          value={from}
          min="2000-01-01"
          onChange={(e) => { setFrom(e.target.value); setPage(1) }}
          className="input w-auto py-1.5 text-xs"
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1) }}
          className="input w-auto py-1.5 text-xs"
          aria-label="To date"
        />
        <select className="select w-auto py-1.5 text-xs" value={status} onChange={(e) => { setStatus(e.target.value as 'all' | 'profit' | 'loss'); setPage(1) }} aria-label="Status filter">
          <option value="all">All statuses</option>
          <option value="profit">Profitable</option>
          <option value="loss">Loss-making</option>
        </select>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          placeholder="Search notes…"
          className="input w-full sm:w-44 py-1.5 text-xs"
          aria-label="Search"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="bg-surface2/60">
            <tr>
              <th className="th"><SortHeader label="Date" k="date" /></th>
              {!hideAsset && <th className="th">Asset</th>}
              <th className="th">Quantity</th>
              <th className="th">Buy Price</th>
              <th className="th"><SortHeader label="Invested" k="invested" /></th>
              <th className="th"><SortHeader label="Current Value" k="value" /></th>
              <th className="th"><SortHeader label="P/L" k="profitPct" /></th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => {
              const v = valuations.get(inv.id)
              const profit = v?.profit ?? null
              const profitPct = v?.profitPct ?? null
              return (
                <tr key={inv.id} className="table-row">
                  <td className="td font-medium">{formatDateShort(inv.investment_date)}</td>
                  {!hideAsset && (
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <AssetIcon asset={inv.asset_type} size="sm" />
                        <span className={cn('font-semibold', ASSET_META[inv.asset_type].text)}>{ASSET_META[inv.asset_type].label}</span>
                      </div>
                    </td>
                  )}
                  <td className="td num">{formatQuantity(inv.quantity)} {inv.unit}</td>
                  <td className="td num">{formatCurrency(inv.purchase_rate, currency)}</td>
                  <td className="td num">{formatCurrency(inv.total_amount, currency)}</td>
                  <td className="td num font-semibold">{formatCurrency(v?.currentValue, currency)}</td>
                  <td className="td">
                    <DeltaBadge value={profitPct} />
                  </td>
                  <td className="td">
                    {profit === null || !Number.isFinite(profit) ? (
                      <Badge tone="neutral">Insufficient</Badge>
                    ) : profit >= 0 ? (
                      <Badge tone="positive">Profitable</Badge>
                    ) : (
                      <Badge tone="negative">Loss-making</Badge>
                    )}
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onView(inv)} className="btn-icon h-8 w-8" aria-label="View detail"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => onEdit(inv)} className="btn-icon h-8 w-8" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => onDelete(inv)} className="btn-icon h-8 w-8 text-negative hover:bg-negative-bg" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!rows.length && (
          <div className="px-4 py-10 text-center text-sm text-muted">
            No investments match these filters.
          </div>
        )}
      </div>

      <Pagination
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        className="px-4 py-3"
      />
    </Card>
  )
}

export function InvestmentMiniRow({ v, currency }: { v: InvestmentValuation; currency: string }) {
  const inv = v.investment
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-surface2/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <AssetIcon asset={inv.asset_type} size="sm" />
        <div>
          <p className="text-sm font-semibold text-ink">
            {formatQuantity(inv.quantity)} {inv.unit} {ASSET_META[inv.asset_type].label}
          </p>
          <p className="text-xs text-muted">
            Bought {formatDateShort(inv.investment_date)} · {formatHoldingPeriod(v.holdingDays)} ago
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="num text-sm font-bold text-ink">{formatCurrency(v.currentValue, currency)}</p>
        <p className={cn('text-xs font-semibold', (v.profitPct ?? 0) >= 0 ? 'text-positive' : 'text-negative')}>
          {formatPct(v.profitPct, { sign: true })}
        </p>
      </div>
    </div>
  )
}