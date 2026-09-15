import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Coins, Plus, Wallet } from 'lucide-react'
import { useInvestments, useMarketRates } from '../hooks/useData'
import { useSettings } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAssetScope, scopedByAsset } from '../context/AssetScopeContext'
import { summarizePortfolio, valueInvestment, rateLabel, type InvestmentValuation } from '../services/calculations'
import type { Investment, InvestmentInput } from '../types'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { InvestmentsTable } from '../components/investments/InvestmentsTable'
import { InvestmentForm } from '../components/investments/InvestmentForm'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Card } from '../components/ui/Card'
import { EmptyState, LoadingState, ErrorState } from '../components/ui/State'
import { Button } from '../components/ui/Button'
import { formatCurrency, formatPct } from '../lib/utils'
import { cn } from '../lib/utils'

export default function InvestmentsPage() {
  const { investments, loading, error, refresh, saveInvestment, removeInvestment } = useInvestments()
  const { rates } = useMarketRates()
  const { settings } = useSettings()
  const { toast } = useToast()
  const { scope } = useAssetScope()
  const navigate = useNavigate()

  const currency = settings.currency
  const method = settings.default_valuation_method

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Investment | null>(null)

  const scopeLabel = scope === 'both' ? 'Investments' : `${scope === 'gold' ? 'Gold' : 'Silver'} investments`
  const scopedInvestments = useMemo(
    () => investments.filter((i) => scopedByAsset(scope, i.asset_type)),
    [investments, scope],
  )

  const valuations = useMemo(() => {
    const map = new Map<string, InvestmentValuation>()
    for (const inv of scopedInvestments) {
      map.set(inv.id, valueInvestment(inv, rates, method))
    }
    return map
  }, [scopedInvestments, rates, method])

  const hasValuationData = useMemo(
    () => scopedInvestments.some((i) => valuations.get(i.id)?.currentValue !== null),
    [scopedInvestments, valuations],
  )

  const summary = useMemo(
    () => summarizePortfolio(scopedInvestments, rates, method),
    [scopedInvestments, rates, method],
  )

  const handleSave = async (input: InvestmentInput, existing?: Investment) => {
    try {
      await saveInvestment(input, existing)
      toast(existing ? 'Investment updated.' : 'Investment added.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save investment.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await removeInvestment(deleteTarget.id)
      toast('Investment removed.', 'success')
      setDeleteTarget(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed.', 'error')
    }
  }

  if (loading) return <LoadingState label="Loading your investments" />
  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />

  if (scopedInvestments.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title={scopeLabel} subtitle={scope === 'both' ? 'Track every gold and silver purchase you make.' : `Track every ${scope === 'gold' ? 'gold' : 'silver'} purchase you make.`} />
        <Card>
          <EmptyState
            icon={<Coins className="h-6 w-6" />}
            title={scope === 'both' ? "You haven't added any investments yet" : `You haven't added any ${scope === 'gold' ? 'gold' : 'silver'} investments yet`}
            description="Add your first investment to start tracking portfolio performance automatically."
            action={
              <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="h-4 w-4" /> Add first investment
              </button>
            }
          />
        </Card>
        <InvestmentForm open={formOpen} onClose={() => setFormOpen(false)} existing={null} onSave={handleSave} />
      </div>
    )
  }

  const positive = summary.profit >= 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={scopeLabel}
        subtitle={`${scopedInvestments.length} position${scopedInvestments.length !== 1 ? 's' : ''} · valued at ${rateLabel(method).toLowerCase()}`}
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> Add investment
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total invested" value={formatCurrency(summary.invested, currency)} icon={<Wallet className="h-4 w-4" />} />
        <StatCard
          label="Current value"
          value={hasValuationData ? formatCurrency(summary.currentValue, currency) : '—'}
          sub={hasValuationData ? undefined : 'No market data yet'}
          icon={<Coins className="h-4 w-4" />}
        />
        <StatCard
          label="Profit / loss"
          value={
            hasValuationData ? (
              <span className={positive ? 'text-positive' : 'text-negative'}>
                {positive ? '+' : ''}
                {formatCurrency(summary.profit, currency)}
              </span>
            ) : (
              '—'
            )
          }
          sub={hasValuationData ? undefined : 'No market data yet'}
          icon={<Coins className="h-4 w-4" />}
          tone={positive ? 'positive' : 'negative'}
        />
        <StatCard
          label="Return"
          value={
            hasValuationData ? (
              <span className={positive ? 'text-positive' : 'text-negative'}>
                {formatPct(summary.profitPct, { sign: true })}
              </span>
            ) : (
              '—'
            )
          }
          sub={hasValuationData ? undefined : 'No market data yet'}
          icon={<Coins className="h-4 w-4" />}
          tone={positive ? 'positive' : 'negative'}
        />
      </div>

      <InvestmentsTable
        investments={scopedInvestments}
        valuations={valuations}
        currency={currency}
        hideAsset={scope !== 'both'}
        onView={(inv) => navigate(`/${scope === 'silver' ? 'silver' : 'gold'}/investments/${inv.id}`)}
        onEdit={(inv) => {
          setEditing(inv)
          setFormOpen(true)
        }}
        onDelete={(inv) => setDeleteTarget(inv)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {summary.best && <MiniPnl title="Best performer" v={summary.best} currency={currency} />}
        {summary.worst && <MiniPnl title="Worst performer" v={summary.worst} currency={currency} />}
      </div>

      <InvestmentForm open={formOpen} onClose={() => setFormOpen(false)} existing={editing} onSave={handleSave} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove this investment?"
        message="This removes the purchase record. Historical market rates are untouched."
        confirmLabel="Remove"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function MiniPnl({ title, v, currency }: { title: string; v: InvestmentValuation; currency: string }) {
  const positive = (v.profit ?? 0) >= 0
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink capitalize">
            {v.investment.asset_type} · {v.investment.quantity} {v.investment.unit}
          </p>
          <p className="text-xs text-muted">Invested {formatCurrency(v.original, currency)}</p>
        </div>
        <p className="text-right">
          <span className={cn('num block text-sm font-bold', positive ? 'text-positive' : 'text-negative')}>
            {formatCurrency(v.profit, currency)}
          </span>
          <span className={cn('num text-xs', positive ? 'text-positive' : 'text-negative')}>
            {formatPct(v.profitPct, { sign: true })}
          </span>
        </p>
      </div>
    </Card>
  )
}