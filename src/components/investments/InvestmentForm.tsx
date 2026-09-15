import { useEffect, useState } from 'react'
import type { AssetType, Investment, InvestmentInput } from '../../types'
import { UNITS } from '../../types'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatCurrency, cn } from '../../lib/utils'
import { todayISO } from '../../lib/dates'
import { useAssetScope } from '../../context/AssetScopeContext'
import { useSettings } from '../../context/AuthContext'

interface InvestmentFormProps {
  open: boolean
  onClose: () => void
  existing: Investment | null
  onSave: (input: InvestmentInput, existing?: Investment) => Promise<void>
}

function toNum(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function InvestmentForm({ open, onClose, existing, onSave }: InvestmentFormProps) {
  const { scope } = useAssetScope()
  const { settings } = useSettings()
  const currency = settings.currency
  const pinnedAsset = scope === 'gold' || scope === 'silver' ? scope : null
  const assetLabel = pinnedAsset ? (pinnedAsset === 'gold' ? 'Gold' : 'Silver') : 'gold or silver'
  const [asset, setAsset] = useState<AssetType>('gold')
  const [date, setDate] = useState(todayISO())
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('tola')
  const [purchaseRate, setPurchaseRate] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [autoTotal, setAutoTotal] = useState(true)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const q = existing ? String(existing.quantity) : ''
      const rate = existing ? String(existing.purchase_rate) : ''
      setAsset(existing?.asset_type ?? pinnedAsset ?? 'gold')
      setDate(existing?.investment_date ?? todayISO())
      setQuantity(q)
      setUnit(existing?.unit ?? 'tola')
      setPurchaseRate(rate)
      setTotalAmount(existing ? String(existing.total_amount) : '')
      setAutoTotal(!existing)
      setNotes(existing?.notes ?? '')
      setErrors({})
      setSaving(false)
    }
  }, [open, existing])

  const qty = toNum(quantity)
  const rate = toNum(purchaseRate)

  // auto-fill total when quantity & rate change (unless user overrode)
  useEffect(() => {
    if (autoTotal && qty !== null && rate !== null) {
      setTotalAmount(String(qty * rate))
    }
  }, [quantity, purchaseRate, autoTotal, qty, rate])

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!date) next.date = 'Date is required.'
    const q = toNum(quantity)
    if (q === null || q <= 0) next.quantity = 'Quantity must be greater than zero.'
    if (rate === null || rate <= 0) next.purchaseRate = 'Purchase price must be greater than zero.'
    const total = toNum(totalAmount)
    if (total === null || total <= 0) next.total = 'Investment amount must be greater than zero.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const input: InvestmentInput = {
      asset_type: asset,
      investment_date: date,
      quantity: toNum(quantity)!,
      unit,
      purchase_rate: toNum(purchaseRate)!,
      total_amount: toNum(totalAmount)!,
      notes: notes.trim() || null,
    }
    try {
      await onSave(input, existing ?? undefined)
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit investment' : 'Add investment'}
      subtitle={
        existing
          ? 'Update the purchase record'
          : `Record a purchase of ${assetLabel}. The total auto-calculates from quantity × price.`
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {existing ? 'Save changes' : 'Add investment'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Asset type" required>
          {pinnedAsset ? (
            <div className="input flex h-[52px] items-center gap-2 px-4 text-sm font-semibold text-ink">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-black uppercase',
                  pinnedAsset === 'gold' ? 'bg-gold-bg text-gold' : 'bg-silver-bg text-silver',
                )}
              >
                {pinnedAsset === 'gold' ? 'Au' : 'Ag'}
              </span>
              {pinnedAsset === 'gold' ? 'Gold' : 'Silver'}
              <span className="text-[11px] font-normal text-muted">pinned by workspace</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(['gold', 'silver'] as AssetType[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAsset(a)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    asset === a
                      ? a === 'gold'
                        ? 'border-gold/50 bg-gold-bg'
                        : 'border-silver/50 bg-silver-bg'
                      : 'border-edge bg-surface hover:bg-surface2'
                  }`}
                >
                  <p className={`text-sm font-semibold ${asset === a ? (a === 'gold' ? 'text-gold' : 'text-silver') : 'text-ink'}`}>
                    {a === 'gold' ? 'Gold' : 'Silver'}
                  </p>
                  <p className="text-[11px] text-muted">{a === 'gold' ? 'Au' : 'Ag'}</p>
                </button>
              ))}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Date" required error={errors.date}>
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} invalid={Boolean(errors.date)} />
          </Field>
          <Field label="Quantity" required error={errors.quantity} hint={`How much you hold, in ${unit}`}>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="e.g. 2.5"
              value={quantity}
              invalid={Boolean(errors.quantity)}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Unit" required>
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Purchase price per unit (market rate)"
            required
            error={errors.purchaseRate}
            hint="The rate you actually paid per unit"
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder={asset === 'gold' ? '315000' : '3100'}
              value={purchaseRate}
              invalid={Boolean(errors.purchaseRate)}
              onChange={(e) => setPurchaseRate(e.target.value)}
            />
          </Field>
          <Field
            label={`Total investment amount (${currency})`}
            required
            error={errors.total}
            hint={
              autoTotal
                ? 'Auto-calculated from quantity × price'
                : 'Manually set — check this box to re-sync with quantity × price'
            }
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={totalAmount}
              invalid={Boolean(errors.total)}
              onChange={(e) => {
                setTotalAmount(e.target.value)
                setAutoTotal(false)
              }}
            />
          </Field>
        </div>

        {qty !== null && rate !== null && (
          <div className="rounded-xl border border-edge bg-surface2/60 px-4 py-3 text-xs text-muted">
            Quantity × price = <span className="num font-bold text-ink">{formatCurrency(qty * rate, currency)}</span>
            {autoTotal ? ' — this is your total investment.' : ' — your manual total differs from this.'}
          </div>
        )}

        <Field label="Notes">
          <Textarea
            rows={2}
            placeholder="e.g. Bought on a price correction…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}