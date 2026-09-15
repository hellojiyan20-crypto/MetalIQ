import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Save } from 'lucide-react'
import type { MarketRate, MarketRateInput } from '../../types'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatCurrency, cn } from '../../lib/utils'
import { formatDateShort, todayISO } from '../../lib/dates'
import { UNITS, type Unit } from '../../types'
import { useAssetScope, scopeAssets } from '../../context/AssetScopeContext'

interface RateFormProps {
  open: boolean
  onClose: () => void
  existing: MarketRate | null
  rates: MarketRate[]
  onSave: (input: MarketRateInput, existing?: MarketRate) => Promise<void>
}

const emptyForm = (date: string): MarketRateInput => ({
  date,
  gold_buy_rate: null,
  gold_sell_rate: null,
  silver_buy_rate: null,
  silver_sell_rate: null,
  gold_unit: 'tola',
  silver_unit: 'tola',
  source: null,
  notes: null,
})

function toNum(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function numOrBlank(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

const RATE_FIELDS: { key: keyof MarketRateInput; label: string; asset: 'Gold' | 'Silver' }[] = [
  { key: 'gold_buy_rate', label: 'Gold Buy Rate', asset: 'Gold' },
  { key: 'gold_sell_rate', label: 'Gold Sell Rate', asset: 'Gold' },
  { key: 'silver_buy_rate', label: 'Silver Buy Rate', asset: 'Silver' },
  { key: 'silver_sell_rate', label: 'Silver Sell Rate', asset: 'Silver' },
]

export function RateForm({ open, onClose, existing, rates, onSave }: RateFormProps) {
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [form, setForm] = useState<MarketRateInput>(() => emptyForm(todayISO()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const { scope } = useAssetScope()
  const assets = scopeAssets(scope)

  const shownFields = useMemo(
    () =>
      RATE_FIELDS.filter((f) =>
        assets.includes(f.key.startsWith('gold') ? 'gold' : 'silver'),
      ),
    [assets],
  )

  useEffect(() => {
    if (open) {
      setForm(existing ? { ...existing, date: existing.date } : emptyForm(todayISO()))
      setStep('form')
      setErrors({})
      setSaving(false)
    }
  }, [open, existing])

  const duplicate = useMemo(() => {
    if (!form.date || existing) return null
    return rates.find((r) => r.date === form.date) ?? null
  }, [rates, form.date, existing])

  const prevRate = useMemo(() => {
    if (!form.date) return null
    const sorted = [...rates].sort((a, b) => a.date.localeCompare(b.date))
    let prev: MarketRate | null = null
    for (const r of sorted) {
      if (r.date < form.date) prev = r
      else break
    }
    return prev
  }, [rates, form.date])

  const set = (key: keyof MarketRateInput, value: string | number | null) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => {
      const next = { ...e }
      delete next[key]
      return next
    })
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.date) next.date = 'Date is required.'
    const hasAny = shownFields.some((f) => toNum(numOrBlank(form[f.key])) !== null)
    if (!hasAny) next.rates = 'Enter at least one rate for the visible asset.'
    for (const f of shownFields) {
      const n = toNum(numOrBlank(form[f.key]))
      if (n !== null && n < 0) next[f.key] = 'Cannot be negative.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const normalise = (): MarketRateInput => {
    const single = assets.length === 1
    const singleGold = single && assets[0] === 'gold'
    const singleSilver = single && assets[0] === 'silver'
    const out: Partial<MarketRateInput> = {
      date: form.date,
      gold_buy_rate: toNum(numOrBlank(form.gold_buy_rate)),
      gold_sell_rate: toNum(numOrBlank(form.gold_sell_rate)),
      silver_buy_rate: toNum(numOrBlank(form.silver_buy_rate)),
      silver_sell_rate: toNum(numOrBlank(form.silver_sell_rate)),
      gold_unit: form.gold_unit ?? 'tola',
      silver_unit: form.silver_unit ?? 'tola',
      source: form.source,
      notes: form.notes,
    }
    // In a single-metal workspace only ever touch that metal's columns, so the
    // other metal's data on the same date (from its own workspace) is preserved.
    if (singleGold) {
      delete out.silver_buy_rate
      delete out.silver_sell_rate
      delete out.silver_unit
    } else if (singleSilver) {
      delete out.gold_buy_rate
      delete out.gold_sell_rate
      delete out.gold_unit
    }
    return out as MarketRateInput
  }

  const gotoConfirm = () => {
    const nf = normalise()
    setForm(nf)
    if (!validate()) return
    setStep('confirm')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(normalise(), existing ?? duplicate ?? undefined)
      onClose()
    } catch {
      setSaving(false)
    }
  }

  const changeFor = (asset: 'gold' | 'silver') => {
    const current =
      asset === 'gold' ? toNum(numOrBlank(form.gold_sell_rate)) : toNum(numOrBlank(form.silver_sell_rate))
    const prevVal = prevRate ? (asset === 'gold' ? prevRate.gold_sell_rate : prevRate.silver_sell_rate) : null
    if (current === null || prevVal === null || prevVal === 0) return null
    return { abs: current - prevVal, pct: ((current - prevVal) / prevVal) * 100 }
  }

  const summaryCell = (label: string, value: number | null) => (
    <div className="rounded-xl border border-edge bg-surface2/60 px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="num mt-0.5 text-sm font-bold text-ink">{formatCurrency(value)}</p>
    </div>
  )

  const ConfirmationStep = () => {
    const g = changeFor('gold')
    const sVal = changeFor('silver')
    return (
      <div className="space-y-4">
        <div>
          <p className="eyebrow">Rate summary</p>
          <p className="mt-1 text-sm text-ink">
            {formatDateShort(form.date)}
            {assets.includes('gold') && ` · Gold per ${form.gold_unit ?? 'tola'}`}
            {assets.includes('silver') && ` · Silver per ${form.silver_unit ?? 'tola'}`}
          </p>
        </div>

        <div className={cn('grid gap-3', assets.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
          {assets.includes('gold') && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gold">Gold</p>
              {summaryCell('Buy', toNum(numOrBlank(form.gold_buy_rate)))}
              {summaryCell('Sell', toNum(numOrBlank(form.gold_sell_rate)))}
              {g && (
                <p className={`text-xs font-semibold ${g.abs >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {g.abs >= 0 ? '▲' : '▼'} {formatCurrency(g.abs)} · {g.pct >= 0 ? '+' : ''}
                  {g.pct.toFixed(2)}% vs previous day
                </p>
              )}
            </div>
          )}
          {assets.includes('silver') && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-silver">Silver</p>
              {summaryCell('Buy', toNum(numOrBlank(form.silver_buy_rate)))}
              {summaryCell('Sell', toNum(numOrBlank(form.silver_sell_rate)))}
              {sVal && (
                <p className={`text-xs font-semibold ${sVal.abs >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {sVal.abs >= 0 ? '▲' : '▼'} {formatCurrency(sVal.abs)} · {sVal.pct >= 0 ? '+' : ''}
                  {sVal.pct.toFixed(2)}% vs previous day
                </p>
              )}
            </div>
          )}
        </div>

        {(form.source || form.notes) && (
          <div className="rounded-xl border border-edge px-3 py-2.5 text-xs text-muted">
            {form.source && (
              <p>
                <span className="font-semibold text-ink">Source:</span> {form.source}
              </p>
            )}
            {form.notes && (
              <p className="mt-1">
                <span className="font-semibold text-ink">Note:</span> {form.notes}
              </p>
            )}
          </div>
        )}

        {duplicate && (
          <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold-bg px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <div>
              <p className="text-sm font-semibold text-ink">
                A rate for {formatDateShort(duplicate.date)} already exists.
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Saving will update that entry instead of creating a duplicate.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const footer = (
    <div className="flex items-center justify-between gap-2">
      {step === 'confirm' ? (
        <>
          <Button variant="ghost" onClick={() => setStep('form')} disabled={saving}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" />
            {duplicate ? 'Update existing entry' : existing ? 'Save changes' : 'Save rate'}
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={gotoConfirm}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit market rate' : 'Add daily market rate'}
      subtitle={step === 'confirm' ? 'Confirm before saving' : 'Enter the rates reported today'}
      footer={footer}
      size="lg"
    >
      {step === 'form' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date" required error={errors.date}>
              <Input
                type="date"
                value={form.date}
                max={todayISO()}
                onChange={(e) => set('date', e.target.value)}
              />
            </Field>
          </div>

          {errors.rates && (
            <p className="rounded-lg border border-negative/25 bg-negative-bg px-3 py-2 text-xs font-medium text-negative">
              {errors.rates}
            </p>
          )}

          {duplicate && (
            <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold-bg px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <p className="text-xs text-muted">
                A rate for <span className="font-semibold text-ink">{formatDateShort(duplicate.date)}</span> already
                exists. If you continue, you will be updating that entry — no duplicate is created.
              </p>
            </div>
          )}

          <div className={cn('grid gap-3', assets.length > 1 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
            {shownFields.map((f) => (
              <Field key={f.key} label={f.label} error={errors[f.key]}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={numOrBlank(form[f.key])}
                  invalid={Boolean(errors[f.key])}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </Field>
            ))}
          </div>

          {assets.length > 1 ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Gold unit">
                <Select value={String(form.gold_unit ?? 'tola')} onChange={(e) => set('gold_unit', e.target.value as Unit)}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Silver unit">
                <Select value={String(form.silver_unit ?? 'tola')} onChange={(e) => set('silver_unit', e.target.value as Unit)}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <Field label={assets[0] === 'gold' ? 'Gold unit' : 'Silver unit'}>
              <Select
                value={String(assets[0] === 'gold' ? form.gold_unit ?? 'tola' : form.silver_unit ?? 'tola')}
                onChange={(e) => set(assets[0] === 'gold' ? 'gold_unit' : 'silver_unit', e.target.value as Unit)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Source" hint="e.g. local jewellers' association">
            <Input
              placeholder="Where did you get these rates?"
              value={form.source ?? ''}
              onChange={(e) => set('source', e.target.value || null)}
            />
          </Field>

          <Field label="Market condition note">
            <Textarea
              rows={2}
              placeholder="e.g. Volatile day, strong buying pressure…"
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value || null)}
            />
          </Field>
        </div>
      ) : (
        <ConfirmationStep />
      )}
    </Modal>
  )
}