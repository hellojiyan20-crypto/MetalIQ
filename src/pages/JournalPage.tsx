import { useMemo, useState } from 'react'
import { BookOpen, NotebookPen, Trash2 } from 'lucide-react'
import { useNotes, useMarketRates } from '../hooks/useData'
import { useSettings } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAssetScope, scopedByAsset } from '../context/AssetScopeContext'
import type { AssetType, MarketNote } from '../types'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/State'
import { formatCurrency, cn } from '../lib/utils'
import { formatDateShort, todayISO } from '../lib/dates'

export default function JournalPage() {
  const { notes, addNote, removeNote } = useNotes()
  const { rates } = useMarketRates()
  const { settings } = useSettings()
  const { toast } = useToast()
  const { scope } = useAssetScope()
  const currency = settings.currency
  const scopeBoth = scope === 'both'

  const [date, setDate] = useState(todayISO())
  const [asset, setAsset] = useState<'all' | AssetType | ''>(scopeBoth ? '' : scope)
  const [note, setNote] = useState('')
  const [rateRef, setRateRef] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MarketNote | null>(null)

  const [filterAsset, setFilterAsset] = useState<'all' | AssetType>('all')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const effectiveFilterAsset = scopeBoth ? filterAsset : scope

  const noteAsset = scopeBoth ? asset : scope
  const showAssetSelect = scopeBoth

  const rateByDate = useMemo(() => {
    const map = new Map<string, { gold: number | null; silver: number | null }>()
    for (const r of rates) {
      map.set(r.date, { gold: r.gold_sell_rate, silver: r.silver_sell_rate })
    }
    return map
  }, [rates])

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (effectiveFilterAsset !== 'all' && n.asset_type !== effectiveFilterAsset) return false
      if (filterFrom && n.date < filterFrom) return false
      if (filterTo && n.date > filterTo) return false
      return true
    })
  }, [notes, effectiveFilterAsset, filterFrom, filterTo])

  const handleAdd = async () => {
    const next: Record<string, string> = {}
    if (!date) next.date = 'Date is required.'
    if (!note.trim()) next.note = 'Write something.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await addNote({
        date,
        asset_type: noteAsset === '' || noteAsset === 'all' ? null : noteAsset,
        note: note.trim(),
        rate_reference: rateRef.trim() === '' ? null : Number(rateRef),
      })
      toast('Journal entry added.', 'success')
      setNote('')
      setRateRef('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save note.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await removeNote(deleteTarget.id)
      toast('Entry removed.', 'success')
      setDeleteTarget(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Market journal" subtitle="Personal notes tied to dates — your own read of the market." />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* add entry */}
        <Card className="lg:col-span-1 self-start">
          <CardHeader title="Add entry" icon={<NotebookPen className="h-4 w-4" />} />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Date" required error={errors.date}>
                <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Asset">
                {showAssetSelect ? (
                  <Select value={asset} onChange={(e) => setAsset(e.target.value as 'all' | AssetType | '')}>
                    <option value="">Market (both)</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                  </Select>
                ) : (
                  <div className="input flex h-[42px] items-center gap-2 text-sm font-semibold text-ink">
                    <span className={cn(scope === 'gold' ? 'text-gold' : 'text-silver')}>
                      {scope === 'gold' ? 'Gold' : 'Silver'}
                    </span>
                    <span className="text-[11px] font-normal text-muted">pinned by scope</span>
                  </div>
                )}
              </Field>
            </div>
            <Field label="Note" required error={errors.note}>
              <Textarea
                rows={4}
                placeholder="e.g. Gold increased strongly today; buyers stepped in after the dip."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <Field label="Rate reference (optional)" hint="The rate you were referring to">
              <Input type="number" inputMode="decimal" value={rateRef} onChange={(e) => setRateRef(e.target.value)} placeholder="310000" />
            </Field>
            <Button variant="primary" className="w-full" onClick={handleAdd} loading={busy}>
              Add journal entry
            </Button>
          </CardBody>
        </Card>

        {/* entries */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {showAssetSelect && (
              <Select className="w-auto py-1.5 text-xs" value={filterAsset} onChange={(e) => setFilterAsset(e.target.value as 'all' | AssetType)} aria-label="Filter asset">
                <option value="all">All assets</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </Select>
            )}
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="input w-auto py-1.5 text-xs" aria-label="From" />
            <span className="text-xs text-faint">to</span>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="input w-auto py-1.5 text-xs" aria-label="To" />
          </div>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title={scopeBoth ? 'No journal entries yet' : `No ${scope === 'gold' ? 'gold' : 'silver'} entries yet`}
                description="Write your first note — market reads become part of your historical record."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((n) => {
                const market = rateByDate.get(n.date)
                return (
                  <Card key={n.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={n.asset_type === 'gold' ? 'gold' : n.asset_type === 'silver' ? 'silver' : 'neutral'}>
                            {n.asset_type ? (n.asset_type === 'gold' ? 'Gold' : 'Silver') : 'Market'}
                          </Badge>
                          <span className="text-xs font-semibold text-ink">{formatDateShort(n.date)}</span>
                          {n.rate_reference !== null && (
                            <span className="text-[11px] text-muted">ref. {formatCurrency(n.rate_reference, currency)}</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-ink">{n.note}</p>
                      </div>
                      <button onClick={() => setDeleteTarget(n)} className="btn-icon h-8 w-8 shrink-0 text-muted hover:text-negative hover:bg-negative-bg" aria-label="Delete entry">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {market && (market.gold !== null || market.silver !== null) && (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                        {scopedByAsset(scope, 'gold') && market.gold !== null && <span>Gold sell <span className="num font-semibold text-ink">{formatCurrency(market.gold, currency)}</span></span>}
                        {scopedByAsset(scope, 'silver') && market.silver !== null && <span>Silver sell <span className="num font-semibold text-ink">{formatCurrency(market.silver, currency)}</span></span>}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete journal entry?"
        message="This note will be removed permanently."
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}