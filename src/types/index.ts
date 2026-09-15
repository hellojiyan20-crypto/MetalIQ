export type AssetType = 'gold' | 'silver'

export type ValuationMethod = 'sell' | 'buy' | 'average'

export type ChartPeriodKey = 'today' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all' | 'custom'

export type ThemePreference = 'light' | 'dark' | 'system'

export type TransactionType = 'buy' | 'sell'

export type AlertCondition = 'above' | 'below' | 'increase_pct' | 'decrease_pct'

export interface Profile {
  id: string
  name: string | null
  email: string | null
  currency: string
  default_valuation_method: ValuationMethod
  default_chart_period: ChartPeriodKey
  theme: ThemePreference
  created_at: string
  updated_at: string
}

export interface MarketRate {
  id: string
  date: string
  gold_buy_rate: number | null
  gold_sell_rate: number | null
  silver_buy_rate: number | null
  silver_sell_rate: number | null
  gold_unit: string | null
  silver_unit: string | null
  source: string | null
  notes: string | null
  usd_pkr: number | null
  intl_gold_oz: number | null
  created_at: string
  updated_at: string
}

export interface MarketRateInput {
  date: string
  gold_buy_rate: number | null
  gold_sell_rate: number | null
  silver_buy_rate: number | null
  silver_sell_rate: number | null
  gold_unit: string | null
  silver_unit: string | null
  source: string | null
  notes: string | null
  usd_pkr?: number | null
  intl_gold_oz?: number | null
}

export interface Investment {
  id: string
  asset_type: AssetType
  investment_date: string
  quantity: number
  unit: string
  purchase_rate: number
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvestmentInput {
  asset_type: AssetType
  investment_date: string
  quantity: number
  unit: string
  purchase_rate: number
  total_amount: number
  notes: string | null
}

export interface Transaction {
  id: string
  investment_id: string | null
  transaction_type: TransactionType
  asset_type: AssetType
  quantity: number
  rate: number
  total_amount: number
  transaction_date: string
  notes: string | null
  created_at: string
}

export interface MarketNote {
  id: string
  date: string
  asset_type: AssetType | null
  note: string
  rate_reference: number | null
  created_at: string
}

export interface MarketNoteInput {
  date: string
  asset_type: AssetType | null
  note: string
  rate_reference: number | null
}

export interface PriceAlert {
  id: string
  asset_type: AssetType
  condition: AlertCondition
  target_price: number | null
  target_pct: number | null
  is_active: boolean
  triggered_at: string | null
  created_at: string
}

export interface PriceAlertInput {
  asset_type: AssetType
  condition: AlertCondition
  target_price: number | null
  target_pct: number | null
  is_active: boolean
}

export interface UserSettings {
  currency: string
  default_valuation_method: ValuationMethod
  default_chart_period: ChartPeriodKey
  theme: ThemePreference
}

export type New<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>

export interface DateRange {
  key: ChartPeriodKey
  from: string | null
  to: string | null
}

export const ASSETS: { key: AssetType; label: string; symbol: string }[] = [
  { key: 'gold', label: 'Gold', symbol: 'Au' },
  { key: 'silver', label: 'Silver', symbol: 'Ag' },
]

export const UNITS = ['tola', 'gram', 'ounce'] as const
export type Unit = (typeof UNITS)[number]

export const VALUATION_METHODS: { key: ValuationMethod; label: string; hint: string }[] = [
  { key: 'sell', label: 'Sell rate (conservative)', hint: 'What you could receive when selling today.' },
  { key: 'buy', label: 'Buy rate (retail)', hint: 'The rate you would pay to buy today.' },
  { key: 'average', label: 'Average (buy + sell) / 2', hint: 'A neutral midpoint between buy and sell.' },
]