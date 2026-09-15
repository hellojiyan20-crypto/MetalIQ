import { useMemo, useState } from 'react'
import { Bell, BellOff, Plus, Trash2, Zap } from 'lucide-react'
import { useAlerts, useMarketRates } from '../hooks/useData'
import { useSettings } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAssetScope, scopedByAsset } from '../context/AssetScopeContext'
import { latestAssetRate } from '../services/calculations'
import type { AlertCondition, AssetType, PriceAlert, PriceAlertInput } from '../types'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Field, Input, Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState, ErrorState } from '../components/ui/State'
import { AssetIcon } from '../components/market/AssetIcon'
import { formatCurrency } from '../lib/utils'
import { formatDateShort } from '../lib/dates'
import { cn } from '../lib/utils'

function evalAlert(a: PriceAlert, value: number | null): boolean {
  if (value === null) return false
  if (a.condition === 'above') return a.target_price !== null && value >= a.target_price
  if (a.condition === 'below') return a.target_price !== null && value <= a.target_price
  return false
}

function describe(a: PriceAlert, currency: string): string {
  const asset = a.asset_type === 'gold' ? 'Gold' : 'Silver'
  switch (a.condition) {
    case 'above':
      return `${asset} reaches ${formatCurrency(a.target_price, currency)} or above`
    case 'below':
      return `${asset} falls to ${formatCurrency(a.target_price, currency)} or below`
    case 'increase_pct':
      return `${asset} rises by ${a.target_pct}% (7-day baseline)`
    case 'decrease_pct':
      return `${asset} falls by ${a.target_pct}% (7-day baseline)`
  }
}

export default function AlertsPage() {
  const { alerts, loading, error, refresh, addAlert, updateAlert, removeAlert } = useAlerts()
  const { rates } = useMarketRates()
  const { settings } = useSettings()
  const { toast } = useToast()
  const { scope } = useAssetScope()
  const currency = settings.currency
  const scopeBoth = scope === 'both'

  const [asset, setAsset] = useState<AssetType>(scopeBoth ? 'gold' : scope)
  const [condition, setCondition] = useState<AlertCondition>('above')
  const [targetPrice, setTargetPrice] = useState('')
  const [targetPct, setTargetPct] = useState('')
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PriceAlert | null>(null)
  const [busy, setBusy] = useState(false)

  const latest = {
    gold: latestAssetRate(rates, 'gold', 'sell'),
    silver: latestAssetRate(rates, 'silver', 'sell'),
  }

  const withTrigger = useMemo(
    () =>
      alerts
        .filter((a) => scopedByAsset(scope, a.asset_type))
        .map((a) => ({ alert: a, triggered: evalAlert(a, latest[a.asset_type]) })),
    [alerts, latest, scope],
  )

  const activeCount = alerts.filter((a) => a.is_active && scopedByAsset(scope, a.asset_type)).length

  const handleAdd = async () => {
    setFormError('')
    const isPriceBased = condition === 'above' || condition === 'below'
    const price = targetPrice.trim() === '' ? null : Number(targetPrice)
    const pct = targetPct.trim() === '' ? null : Number(targetPct)

    if (isPriceBased) {
      if (price === null || price <= 0) {
        setFormError('Enter a valid target price.')
        return
      }
    } else {
      if (pct === null || pct <= 0) {
        setFormError('Enter a valid positive percentage.')
        return
      }
    }

    const input: PriceAlertInput = {
      asset_type: asset,
      condition,
      target_price: isPriceBased ? price : null,
      target_pct: isPriceBased ? null : pct,
      is_active: true,
    }

    setBusy(true)
    try {
      await addAlert(input)
      toast('Alert created. It will surface here when conditions are met.', 'success')
      setTargetPrice('')
      setTargetPct('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create alert.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (a: PriceAlert) => {
    try {
      await updateAlert(a.id, { is_active: !a.is_active })
      toast(a.is_active ? 'Alert paused.' : 'Alert activated.', 'info')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await removeAlert(deleteTarget.id)
      toast('Alert removed.', 'success')
      setDeleteTarget(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error')
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title={scopeBoth ? 'Price alerts' : `${scope === 'gold' ? 'Gold' : 'Silver'} alerts`}
        subtitle="Conditions that surface inside the dashboard when the market reaches them."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 self-start">
          <CardHeader title="New alert" icon={<Zap className="h-4 w-4" />} />
          <CardBody className="space-y-3">
            <Field label="Asset">
              {scopeBoth ? (
                <div className="grid grid-cols-2 gap-2">
                  {(['gold', 'silver'] as AssetType[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAsset(a)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                        asset === a ? (a === 'gold' ? 'border-gold/50 bg-gold-bg text-gold' : 'border-silver/50 bg-silver-bg text-silver') : 'border-edge bg-surface text-muted hover:bg-surface2',
                      )}
                    >
                      <AssetIcon asset={a} size="sm" /> {a === 'gold' ? 'Gold' : 'Silver'}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="input flex h-[42px] items-center gap-2 text-sm font-semibold text-ink">
                  <AssetIcon asset={scope} size="sm" />
                  {scope === 'gold' ? 'Gold' : 'Silver'}
                  <span className="text-[11px] font-normal text-muted">pinned by scope</span>
                </div>
              )}
            </Field>
            <Field label="Condition">
              <Select value={condition} onChange={(e) => setCondition(e.target.value as AlertCondition)}>
                <option value="above">Price reaches or exceeds</option>
                <option value="below">Price falls to or below</option>
                <option value="increase_pct">Price increases by %</option>
                <option value="decrease_pct">Price decreases by %</option>
              </Select>
            </Field>
            {(condition === 'above' || condition === 'below') ? (
              <Field label="Target price (PKR)">
                <Input type="number" inputMode="decimal" min={0} value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder={asset === 'gold' ? '325000' : '3300'} />
              </Field>
            ) : (
              <Field label="Target change (%)">
                <Input type="number" inputMode="decimal" min={0} step="0.1" value={targetPct} onChange={(e) => setTargetPct(e.target.value)} placeholder="5" />
              </Field>
            )}
            {formError && <p className="text-xs font-medium text-negative">{formError}</p>}
            <Button variant="primary" className="w-full" onClick={handleAdd} loading={busy}>
              <Plus className="h-4 w-4" /> Create alert
            </Button>
            <p className="text-[11px] text-muted">
              Percent alerts compare the current price with the 7-day baseline. Email or browser
              notifications can be connected to the same system later — for now alerts appear in-app.
            </p>
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          {!loading && withTrigger.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Bell className="h-6 w-6" />}
                title={scopeBoth ? 'No alerts yet' : `No ${scope === 'gold' ? 'gold' : 'silver'} alerts yet`}
                description="Create your first alert to get a heads-up when the market reaches a level you care about."
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardHeader title="Your alerts" subtitle={`${activeCount} active`} icon={<Bell className="h-4 w-4" />} />
              <CardBody className="space-y-3">
                {withTrigger.map(({ alert: a, triggered }) => (
                  <div
                    key={a.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between',
                      triggered ? 'border-positive/30 bg-positive-bg' : 'border-edge bg-surface2/40',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AssetIcon asset={a.asset_type} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{describe(a, currency)}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          Current {pretty(a.asset_type, latest[a.asset_type])} · created {formatDateShort(a.created_at.slice(0, 10))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {triggered ? <Badge tone="positive">triggered now</Badge> : !a.is_active ? <Badge tone="neutral"><BellOff className="h-3 w-3" /> paused</Badge> : null}
                      <button
                        onClick={() => void toggleActive(a)}
                        className="btn-secondary btn-sm"
                        aria-label={a.is_active ? 'Pause alert' : 'Activate alert'}
                      >
                        {a.is_active ? 'Pause' : 'Activate'}
                      </button>
                      <button onClick={() => setDeleteTarget(a)} className="btn-icon h-8 w-8 text-negative hover:bg-negative-bg" aria-label="Delete alert">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove alert?"
        message="This alert will be deleted permanently."
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function pretty(a: AssetType, v: number | null): string {
  if (v === null) return 'no rate data'
  return `${a === 'gold' ? 'Gold' : 'Silver'} sell ${formatCurrency(v)}`
}