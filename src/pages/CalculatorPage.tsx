import { useEffect, useMemo, useState } from 'react'
import { Calculator, Coins, Target, TrendingUp } from 'lucide-react'
import { useMarketRates } from '../hooks/useData'
import { useSettings } from '../context/AuthContext'
import { useAssetScope } from '../context/AssetScopeContext'
import { latestAssetRate, latestRate } from '../services/calculations'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Field, Input, Select } from '../components/ui/Input'
import { AssetIcon } from '../components/market/AssetIcon'
import { formatCurrency, formatPct, cn } from '../lib/utils'
import { convertUnit, unitLabel } from '../lib/units'
import type { AssetType } from '../types'
import { UNITS } from '../types'

function toNum(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function ResultRow({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'positive' | 'negative' }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-edge/60 py-2 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={cn('num text-sm font-bold', tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : 'text-ink')}>
        {value}
      </span>
    </div>
  )
}

export default function CalculatorPage() {
  const { rates } = useMarketRates()
  const { settings } = useSettings()
  const { scope } = useAssetScope()
  const currency = settings.currency

  const pinned = scope !== 'both'
  const [metal, setMetal] = useState<AssetType>(pinned ? scope : 'gold')

  useEffect(() => {
    if (pinned) setMetal(scope)
  }, [pinned, scope])

  const last = useMemo(() => (rates.length ? latestRate(rates) : null), [rates])
  const rateUnit = metal === 'gold' ? (last?.gold_unit ?? 'tola') : (last?.silver_unit ?? 'tola')
  const buyRate = useMemo(() => latestAssetRate(rates, metal, 'buy'), [rates, metal])
  const sellRate = useMemo(() => latestAssetRate(rates, metal, 'sell'), [rates, metal])

  // 1) Amount you have -> how much metal you can buy (today's buy rate, auto)
  const [amount, setAmount] = useState('100000')
  const [outUnit, setOutUnit] = useState('tola')
  const amountNum = toNum(amount)
  const quantityBase = amountNum !== null && buyRate !== null && buyRate > 0 ? amountNum / buyRate : null
  const quantity = quantityBase !== null ? convertUnit(quantityBase, rateUnit, outUnit) : null

  // 2) Quantity you want -> how much it would cost today
  const [qtyIn, setQtyIn] = useState('')
  const [qtyUnit, setQtyUnit] = useState('tola')
  const qtyNum = toNum(qtyIn)
  const qtyBase = qtyNum !== null ? convertUnit(qtyNum, qtyUnit, rateUnit) : null
  const costNow = qtyBase !== null && buyRate !== null ? qtyBase * buyRate : null
  const resaleNow = qtyBase !== null && sellRate !== null ? qtyBase * sellRate : null

  // 3) Price target what-if
  const [projQty, setProjQty] = useState('')
  const [projUnit, setProjUnit] = useState('tola')
  const [projTarget, setProjTarget] = useState('')
  const projQtyNum = toNum(projQty)
  const projTargetNum = toNum(projTarget)
  const projBase = projQtyNum !== null ? convertUnit(projQtyNum, projUnit, rateUnit) : null
  const projCost = projBase !== null && buyRate !== null ? projBase * buyRate : null
  const projValue = projBase !== null && projTargetNum !== null ? projBase * projTargetNum : null
  const projProfit = projCost !== null && projValue !== null ? projValue - projCost : null
  const projPct = projCost !== null && projCost > 0 && projProfit !== null ? (projProfit / projCost) * 100 : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investment calculator"
        subtitle="Enter how much you want to spend — the current rates are filled in automatically from your latest entry."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Primary: amount -> quantity */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="How much can I buy?"
            subtitle="Based on today's current rate — no manual rate entry needed"
            icon={<Coins className="h-4 w-4" />}
          />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {pinned ? (
                <span className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-2 text-sm font-semibold capitalize text-ink">
                  <AssetIcon asset={scope} size="sm" /> {scope === 'gold' ? 'Gold' : 'Silver'}
                  <span className="text-[11px] font-normal text-muted">pinned by scope</span>
                </span>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {(['gold', 'silver'] as AssetType[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setMetal(a)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                        metal === a
                          ? a === 'gold'
                            ? 'border-gold/50 bg-gold-bg text-gold'
                            : 'border-silver/50 bg-silver-bg text-silver'
                          : 'border-edge bg-surface text-muted hover:bg-surface2',
                      )}
                    >
                      <AssetIcon asset={a} size="sm" /> {a === 'gold' ? 'Gold' : 'Silver'}
                    </button>
                  ))}
                </div>
              )}

              <div className="ml-auto flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface2/60 px-3 py-1.5 text-xs text-muted">
                  <TrendingUp className="h-3.5 w-3.5 text-gold" />
                  Today's buy rate{' '}
                  <span className="num font-semibold text-ink">
                    {buyRate === null ? '—' : formatCurrency(buyRate, currency)}
                  </span>{' '}
                  / {unitLabel(rateUnit)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-surface2/60 px-3 py-1.5 text-xs text-muted">
                  Sell rate{' '}
                  <span className="num font-semibold text-ink">
                    {sellRate === null ? '—' : formatCurrency(sellRate, currency)}
                  </span>{' '}
                  / {unitLabel(rateUnit)}
                </span>
              </div>
            </div>

            {buyRate === null && (
              <p className="rounded-xl border border-gold/30 bg-gold-bg px-4 py-3 text-xs text-ink">
                No rate recorded yet for {metal === 'gold' ? 'Gold' : 'Silver'}. Add today's rates on the
                Market Rates page and this calculator will use them automatically.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Amount to invest (PKR)">
                <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Show quantity in">
                <Select value={outUnit} onChange={(e) => setOutUnit(e.target.value)}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="rounded-xl border border-edge bg-surface2/60 px-4 py-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">You could buy</p>
                <p className="num mt-1 text-xl font-bold text-ink sm:text-2xl">
                  {quantity === null ? '—' : quantity.toFixed(quantity < 1 ? 4 : 2)}
                </p>
                <p className="text-xs text-muted">
                  {unitLabel(outUnit)} of {metal === 'gold' ? 'Gold' : 'Silver'}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-muted">
              Buy rate is used because that is what you pay when purchasing. The rate shown is taken
              automatically from your latest recorded entry — it updates as you add new rates.
            </p>
          </CardBody>
        </Card>

        {/* Reverse: quantity -> value */}
        <Card>
          <CardHeader title="What would it cost?" subtitle='"I want to buy X quantity today"' icon={<Calculator className="h-4 w-4" />} />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Quantity">
                <Input type="number" inputMode="decimal" value={qtyIn} onChange={(e) => setQtyIn(e.target.value)} placeholder="2.5" />
              </Field>
              <Field label="Unit">
                <Select value={qtyUnit} onChange={(e) => setQtyUnit(e.target.value)}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="rounded-xl border border-edge bg-surface2/60 px-4 py-3">
              <ResultRow label={`Cost at today's buy rate`} value={formatCurrency(costNow, currency)} />
              <ResultRow label={`Value at today's sell rate`} value={formatCurrency(resaleNow, currency)} />
              <ResultRow
                label="Today's spread"
                value={costNow !== null && resaleNow !== null ? formatCurrency(costNow - resaleNow, currency) : '—'}
              />
            </div>
            <p className="text-[11px] text-muted">
              The spread is the difference between what a buyer pays and what a seller receives on the same day.
            </p>
          </CardBody>
        </Card>

        {/* Price target */}
        <Card>
          <CardHeader title="Price target" subtitle='"If the rate reaches…"' icon={<Target className="h-4 w-4" />} />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Field label="Quantity">
                <Input type="number" inputMode="decimal" value={projQty} onChange={(e) => setProjQty(e.target.value)} placeholder="2.5" />
              </Field>
              <Field label="Unit">
                <Select value={projUnit} onChange={(e) => setProjUnit(e.target.value)}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Target rate">
                <Input type="number" inputMode="decimal" value={projTarget} onChange={(e) => setProjTarget(e.target.value)} placeholder="340000" />
              </Field>
            </div>

            <div className="rounded-xl border border-edge bg-surface2/60 px-4 py-3">
              <ResultRow label={`Cost at today's buy rate`} value={formatCurrency(projCost, currency)} />
              <ResultRow label="At target rate" value={formatCurrency(projValue, currency)} />
              <ResultRow
                label="Projected profit"
                tone={projProfit !== null && projProfit >= 0 ? 'positive' : projProfit !== null ? 'negative' : undefined}
                value={projProfit === null ? '—' : `${projProfit >= 0 ? '+' : ''}${formatCurrency(projProfit, currency)}`}
              />
              <ResultRow
                label="Projected return"
                tone={projPct !== null && projPct >= 0 ? 'positive' : projPct !== null ? 'negative' : undefined}
                value={formatPct(projPct, { sign: true })}
              />
            </div>
            <p className="text-[11px] text-muted">
              A what-if calculation only — not a forecast of prices. The baseline uses today's current buy rate.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted">
        <TrendingUp className="h-4 w-4 text-gold" />
        Rates are read automatically from your latest market entry and converted between tola, gram and ounce.
      </div>
    </div>
  )
}