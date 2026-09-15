import { useEffect, useState } from 'react'
import { Download, Database, Moon, RotateCcw, Settings as SettingsIcon, Sun, User } from 'lucide-react'
import { useAuth, useSettings } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useMarketRates, useInvestments, useNotes, useAlerts, useTransactions } from '../hooks/useData'
import { downloadCsv } from '../lib/csv'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { Field, Input, Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { VALUATION_METHODS } from '../types'
import type { ThemePreference, ValuationMethod, ChartPeriodKey } from '../types'
import { cn } from '../lib/utils'

const CURRENCY_OPTIONS = ['PKR', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'INR', 'CNY']

const PERIOD_OPTIONS: { key: ChartPeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '3m', label: '3 months' },
  { key: '6m', label: '6 months' },
  { key: '1y', label: '1 year' },
  { key: 'all', label: 'All time' },
]

const THEME_OPTIONS: { key: ThemePreference; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: SettingsIcon },
]

const sectionTitle = 'text-sm font-bold text-ink'
const hintText = 'text-[11px] leading-relaxed text-muted'

export default function SettingsPage() {
  const { user, mode } = useAuth()
  const { settings, profile, settingsLoading, updateSettings, setThemePreference, themeResolved } = useSettings()
  const { rates } = useMarketRates()
  const { investments } = useInvestments()
  const { transactions } = useTransactions()
  const { notes } = useNotes()
  const { alerts } = useAlerts()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [currency, setCurrency] = useState(settings.currency)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(profile?.name ?? user?.name ?? '')
  }, [profile, user])

  useEffect(() => {
    setCurrency(settings.currency)
  }, [settings.currency])

  const saveValuation = async (value: ValuationMethod) => {
    setSaving(true)
    try {
      await updateSettings({ default_valuation_method: value })
      toast('Valuation method saved.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const savePeriod = async (value: ChartPeriodKey) => {
    setSaving(true)
    try {
      await updateSettings({ default_chart_period: value })
      toast('Default chart period saved.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveName = async () => {
    setNameSaving(true)
    try {
      await updateSettings({ name: name.trim() })
      toast('Name updated.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save name.', 'error')
    } finally {
      setNameSaving(false)
    }
  }

  const exportRatesCsv = () => {
    const rows: (string | number | null)[][] = [
      ['date', 'gold_buy', 'gold_sell', 'silver_buy', 'silver_sell', 'gold_unit', 'silver_unit', 'source', 'notes'],
      ...rates.map((r) => [r.date, r.gold_buy_rate, r.gold_sell_rate, r.silver_buy_rate, r.silver_sell_rate, r.gold_unit, r.silver_unit, r.source, r.notes]),
    ]
    downloadCsv(`gold-silver-rates-${new Date().toISOString().slice(0, 10)}.csv`, rows)
    toast('Rates exported.', 'success')
  }

  const exportInvestmentsCsv = () => {
    const rows: (string | number | null)[][] = [
      ['date', 'asset', 'quantity', 'unit', 'purchase_rate', 'total_amount', 'notes'],
      ...investments.map((i) => [i.investment_date, i.asset_type, i.quantity, i.unit, i.purchase_rate, i.total_amount, i.notes]),
    ]
    downloadCsv(`investments-${new Date().toISOString().slice(0, 10)}.csv`, rows)
    toast('Investments exported.', 'success')
  }

  const exportJson = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      profile,
      settings,
      rates,
      investments,
      transactions,
      notes,
      alerts,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gold-silver-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast('Full JSON backup downloaded.', 'success')
  }

  const resetDemo = () => {
    try {
      localStorage.removeItem('pmi_local_db_v1')
    } catch {
      /* ignore */
    }
    window.location.reload()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Your profile, display preferences and data." />

      <Card>
        <CardHeader title="Profile" icon={<User className="h-4 w-4" />} />
        <CardBody className="space-y-4">
          <Field label="Name" hint="Shown in the header">
            <div className="flex gap-2">
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <Button variant="primary" onClick={saveName} loading={nameSaving} disabled={!name.trim()}>
                Save
              </Button>
            </div>
          </Field>
          <div className="flex items-center gap-2">
            <Badge tone={mode === 'demo' ? 'gold' : 'neutral'}>{mode === 'demo' ? 'demo session' : 'supabase'}</Badge>
            <span className="text-xs text-muted">{user?.email}</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Theme" icon={themeResolved === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} />
        <CardBody>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ key, label, icon: Icon }) => {
              const active = settings.theme === key
              return (
                <button
                  key={key}
                  onClick={() => {
                    setThemePreference(key)
                    toast(`Theme set to ${label.toLowerCase()}${key === 'system' ? ' (follows device)' : ''}.`, 'info')
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                    active ? 'border-gold/50 bg-gold-bg text-gold' : 'border-edge bg-surface text-muted hover:bg-surface2',
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              )
            })}
          </div>
          <p className={cn(hintText, 'mt-2')}>
            {settingsLoading ? 'Loading…' : `Currently rendering in ${themeResolved} mode.`}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Preferences" icon={<SettingsIcon className="h-4 w-4" />} />
        <CardBody className="space-y-4">
          <Field label="Currency" hint="Used for all monetary labels">
            <Input
              type="text"
              list="currency-options"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              onBlur={() => {
                if (currency && currency !== settings.currency) {
                  void updateSettings({ currency })
                  toast(`Currency set to ${currency}.`, 'info')
                }
              }}
            />
            <datalist id="currency-options">
              {CURRENCY_OPTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>

          <Field
            label="Default investment valuation"
            hint={settings.default_valuation_method && VALUATION_METHODS.find((v) => v.key === settings.default_valuation_method)?.hint}
          >
            <Select
              value={settings.default_valuation_method}
              onChange={(e) => void saveValuation(e.target.value as ValuationMethod)}
            >
              {VALUATION_METHODS.map((v) => (
                <option key={v.key} value={v.key}>{v.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Default chart period" hint="Opening period for charts that support ranges">
            <Select value={settings.default_chart_period} onChange={(e) => void savePeriod(e.target.value as ChartPeriodKey)}>
              {PERIOD_OPTIONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          </Field>

          {saving && <Badge tone="neutral">saving…</Badge>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Data" icon={<Database className="h-4 w-4" />} />
        <CardBody className="space-y-4">
          <div>
            <p className={sectionTitle}>Export</p>
            <p className={cn(hintText, 'mb-3')}>Download your data any time — it stays yours.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportRatesCsv}>
                <Download className="h-4 w-4" /> Rates CSV
              </Button>
              <Button variant="secondary" onClick={exportInvestmentsCsv}>
                <Download className="h-4 w-4" /> Investments CSV
              </Button>
              <Button variant="secondary" onClick={exportJson}>
                <Download className="h-4 w-4" /> Full JSON backup
              </Button>
            </div>
          </div>

          {mode === 'demo' && (
            <div>
              <p className={sectionTitle}>Demo data</p>
              <p className={cn(hintText, 'mb-3')}>
                Restore the original sample rates and investments. Adds to the current demo database.
              </p>
              <Button variant="danger" onClick={resetDemo}>
                <RotateCcw className="h-4 w-4" /> Reset demo data
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}