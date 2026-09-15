import type {
  MarketRate,
  MarketRateInput,
  Investment,
  InvestmentInput,
  Transaction,
  MarketNote,
  MarketNoteInput,
  PriceAlert,
  PriceAlertInput,
  Profile,
  UserSettings,
} from '../../types'
import { supabase, isRemote } from '../supabase'
import { DEMO_USER_ID, DEMO_USER_EMAIL, USE_DEMO_DATA } from '../config'
import { emptyDB, loadDB, nextId, saveDB } from './localDb'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function nowIso(): string {
  return new Date().toISOString()
}

function touch<R extends { updated_at: string }>(row: R): R {
  return { ...row, updated_at: nowIso() }
}

/* ---------------------------------------------------------------------------
 * Market rates
 * ------------------------------------------------------------------------- */

export interface MarketRatesRepo {
  list(): Promise<MarketRate[]>
  listDesc(): Promise<MarketRate[]>
  getByDate(date: string): Promise<MarketRate | null>
  create(input: MarketRateInput): Promise<MarketRate>
  update(id: string, input: Partial<MarketRateInput>): Promise<MarketRate>
  remove(id: string): Promise<void>
}

const mapRate = (r: Record<string, unknown>): MarketRate => ({
  id: String(r.id),
  date: String(r.date).slice(0, 10),
  gold_buy_rate: num(r.gold_buy_rate),
  gold_sell_rate: num(r.gold_sell_rate),
  silver_buy_rate: num(r.silver_buy_rate),
  silver_sell_rate: num(r.silver_sell_rate),
  gold_unit: r.gold_unit ? String(r.gold_unit) : null,
  silver_unit: r.silver_unit ? String(r.silver_unit) : null,
  source: r.source ? String(r.source) : null,
  notes: r.notes ? String(r.notes) : null,
  usd_pkr: num(r.usd_pkr),
  intl_gold_oz: num(r.intl_gold_oz),
  created_at: String(r.created_at ?? nowIso()),
  updated_at: String(r.updated_at ?? nowIso()),
})

const remoteMarketRates: MarketRatesRepo = {
  async list() {
    const { data, error } = await supabase!.from('market_rates').select('*').order('date', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapRate)
  },
  async listDesc() {
    const { data, error } = await supabase!.from('market_rates').select('*').order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapRate)
  },
  async getByDate(date) {
    const { data, error } = await supabase!
      .from('market_rates')
      .select('*')
      .eq('date', date)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapRate(data) : null
  },
  async create(input) {
    // One row per (user, date). If the date already exists (e.g. the other metal
    // was entered earlier from its own workspace) merge only the fields sent.
    const { data, error } = await supabase!
      .from('market_rates')
      .upsert(input, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapRate(data)
  },
  async update(id, input) {
    const { data, error } = await supabase!.from('market_rates').update(input).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return mapRate(data)
  },
  async remove(id) {
    const { error } = await supabase!.from('market_rates').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

const localMarketRates: MarketRatesRepo = {
  async list() {
    await sleep(140)
    return [...loadDB().rates].sort((a, b) => a.date.localeCompare(b.date))
  },
  async listDesc() {
    await sleep(140)
    return [...loadDB().rates].sort((a, b) => b.date.localeCompare(a.date))
  },
  async getByDate(date) {
    const db = loadDB()
    return db.rates.find((r) => r.date === date) ?? null
  },
  async create(input) {
    const db = loadDB()
    const existing = db.rates.find((r) => r.date === input.date)
    // Same date already has data (likely the other metal from its workspace) — merge.
    if (existing) {
      const row = touch({ ...existing, ...input })
      db.rates[db.rates.indexOf(existing)] = row
      saveDB(db)
      return row
    }
    const row: MarketRate = {
      id: nextId('rate'),
      ...input,
      date: input.date,
      usd_pkr: input.usd_pkr ?? null,
      intl_gold_oz: input.intl_gold_oz ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    db.rates.push(row)
    saveDB(db)
    return row
  },
  async update(id, input) {
    const db = loadDB()
    const idx = db.rates.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Not found')
    const row = touch({ ...db.rates[idx], ...input })
    db.rates[idx] = row
    saveDB(db)
    return row
  },
  async remove(id) {
    const db = loadDB()
    db.rates = db.rates.filter((r) => r.id !== id)
    saveDB(db)
  },
}

/* ---------------------------------------------------------------------------
 * Investments
 * ------------------------------------------------------------------------- */

export interface InvestmentsRepo {
  list(): Promise<Investment[]>
  create(input: InvestmentInput): Promise<Investment>
  update(id: string, input: Partial<InvestmentInput>): Promise<Investment>
  remove(id: string): Promise<void>
}

const mapInvestment = (r: Record<string, unknown>): Investment => ({
  id: String(r.id),
  asset_type: r.asset_type === 'silver' ? 'silver' : 'gold',
  investment_date: String(r.investment_date).slice(0, 10),
  quantity: Number(r.quantity),
  unit: String(r.unit),
  purchase_rate: Number(r.purchase_rate),
  total_amount: Number(r.total_amount),
  notes: r.notes ? String(r.notes) : null,
  created_at: String(r.created_at ?? nowIso()),
  updated_at: String(r.updated_at ?? nowIso()),
})

const remoteInvestments: InvestmentsRepo = {
  async list() {
    const { data, error } = await supabase!.from('investments').select('*').order('investment_date', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapInvestment)
  },
  async create(input) {
    const { data, error } = await supabase!.from('investments').insert(input).select().single()
    if (error) throw new Error(error.message)
    return mapInvestment(data)
  },
  async update(id, input) {
    const { data, error } = await supabase!.from('investments').update(input).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return mapInvestment(data)
  },
  async remove(id) {
    const { error } = await supabase!.from('investments').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

const localInvestments: InvestmentsRepo = {
  async list() {
    await sleep(140)
    return [...loadDB().investments].sort((a, b) => a.investment_date.localeCompare(b.investment_date))
  },
  async create(input) {
    const db = loadDB()
    const row: Investment = {
      id: nextId('inv'),
      ...input,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    db.investments.push(row)
    saveDB(db)
    return row
  },
  async update(id, input) {
    const db = loadDB()
    const idx = db.investments.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Not found')
    const row = touch({ ...db.investments[idx], ...input })
    db.investments[idx] = row
    saveDB(db)
    return row
  },
  async remove(id) {
    const db = loadDB()
    db.investments = db.investments.filter((r) => r.id !== id)
    saveDB(db)
  },
}

/* ---------------------------------------------------------------------------
 * Transactions (future Buy/Sell ledger)
 * ------------------------------------------------------------------------- */

export interface TransactionsRepo {
  list(): Promise<Transaction[]>
  create(input: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction>
}

const mapTransaction = (r: Record<string, unknown>): Transaction => ({
  id: String(r.id),
  investment_id: r.investment_id ? String(r.investment_id) : null,
  transaction_type: r.transaction_type === 'sell' ? 'sell' : 'buy',
  asset_type: r.asset_type === 'silver' ? 'silver' : 'gold',
  quantity: Number(r.quantity),
  rate: Number(r.rate),
  total_amount: Number(r.total_amount),
  transaction_date: String(r.transaction_date).slice(0, 10),
  notes: r.notes ? String(r.notes) : null,
  created_at: String(r.created_at ?? nowIso()),
})

const remoteTransactions: TransactionsRepo = {
  async list() {
    const { data, error } = await supabase!.from('transactions').select('*').order('transaction_date', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapTransaction)
  },
  async create(input) {
    const { data, error } = await supabase!.from('transactions').insert(input).select().single()
    if (error) throw new Error(error.message)
    return mapTransaction(data)
  },
}

const localTransactions: TransactionsRepo = {
  async list() {
    await sleep(120)
    return [...loadDB().transactions].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
  },
  async create(input) {
    const db = loadDB()
    const row: Transaction = {
      id: nextId('txn'),
      ...input,
      created_at: nowIso(),
    }
    db.transactions.push(row)
    saveDB(db)
    return row
  },
}

/* ---------------------------------------------------------------------------
 * Market notes (journal)
 * ------------------------------------------------------------------------- */

export interface NotesRepo {
  list(): Promise<MarketNote[]>
  create(input: MarketNoteInput): Promise<MarketNote>
  remove(id: string): Promise<void>
}

const mapNote = (r: Record<string, unknown>): MarketNote => ({
  id: String(r.id),
  date: String(r.date).slice(0, 10),
  asset_type: r.asset_type === 'gold' || r.asset_type === 'silver' ? r.asset_type : null,
  note: String(r.note),
  rate_reference: num(r.rate_reference),
  created_at: String(r.created_at ?? nowIso()),
})

const remoteNotes: NotesRepo = {
  async list() {
    const { data, error } = await supabase!.from('market_notes').select('*').order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapNote)
  },
  async create(input) {
    const { data, error } = await supabase!.from('market_notes').insert(input).select().single()
    if (error) throw new Error(error.message)
    return mapNote(data)
  },
  async remove(id) {
    const { error } = await supabase!.from('market_notes').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

const localNotes: NotesRepo = {
  async list() {
    await sleep(120)
    return [...loadDB().notes].sort((a, b) => b.date.localeCompare(a.date))
  },
  async create(input) {
    const db = loadDB()
    const row: MarketNote = { id: nextId('note'), ...input, created_at: nowIso() }
    db.notes.push(row)
    saveDB(db)
    return row
  },
  async remove(id) {
    const db = loadDB()
    db.notes = db.notes.filter((r) => r.id !== id)
    saveDB(db)
  },
}

/* ---------------------------------------------------------------------------
 * Price alerts
 * ------------------------------------------------------------------------- */

export interface AlertsRepo {
  list(): Promise<PriceAlert[]>
  create(input: PriceAlertInput): Promise<PriceAlert>
  update(id: string, input: Partial<PriceAlertInput>): Promise<PriceAlert>
  remove(id: string): Promise<void>
}

const mapAlert = (r: Record<string, unknown>): PriceAlert => ({
  id: String(r.id),
  asset_type: r.asset_type === 'silver' ? 'silver' : 'gold',
  condition: r.condition as PriceAlert['condition'],
  target_price: num(r.target_price),
  target_pct: num(r.target_pct),
  is_active: Boolean(r.is_active),
  triggered_at: r.triggered_at ? String(r.triggered_at) : null,
  created_at: String(r.created_at ?? nowIso()),
})

const remoteAlerts: AlertsRepo = {
  async list() {
    const { data, error } = await supabase!.from('price_alerts').select('*').order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapAlert)
  },
  async create(input) {
    const { data, error } = await supabase!.from('price_alerts').insert(input).select().single()
    if (error) throw new Error(error.message)
    return mapAlert(data)
  },
  async update(id, input) {
    const { data, error } = await supabase!.from('price_alerts').update(input).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return mapAlert(data)
  },
  async remove(id) {
    const { error } = await supabase!.from('price_alerts').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

const localAlerts: AlertsRepo = {
  async list() {
    await sleep(120)
    return [...loadDB().alerts].sort((a, b) => b.created_at.localeCompare(a.created_at))
  },
  async create(input) {
    const db = loadDB()
    const row: PriceAlert = { id: nextId('alert'), ...input, triggered_at: null, created_at: nowIso() }
    db.alerts.push(row)
    saveDB(db)
    return row
  },
  async update(id, input) {
    const db = loadDB()
    const idx = db.alerts.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Not found')
    const row = { ...db.alerts[idx], ...input, updated_last: undefined }
    db.alerts[idx] = row
    saveDB(db)
    return row
  },
  async remove(id) {
    const db = loadDB()
    db.alerts = db.alerts.filter((r) => r.id !== id)
    saveDB(db)
  },
}

/* ---------------------------------------------------------------------------
 * Profile / settings
 * ------------------------------------------------------------------------- */

export interface ProfileRepo {
  getOrCreate(defaults: Partial<Profile>): Promise<Profile>
  update(id: string, patch: Partial<UserSettings & { name?: string }>): Promise<Profile>
}

const mapProfile = (r: Record<string, unknown>): Profile => ({
  id: String(r.id),
  name: r.name ? String(r.name) : null,
  email: r.email ? String(r.email) : null,
  currency: String(r.currency ?? 'PKR'),
  default_valuation_method: (r.default_valuation_method as Profile['default_valuation_method']) ?? 'sell',
  default_chart_period: (r.default_chart_period as Profile['default_chart_period']) ?? '30d',
  theme: (r.theme as Profile['theme']) ?? 'system',
  created_at: String(r.created_at ?? nowIso()),
  updated_at: String(r.updated_at ?? nowIso()),
})

const remoteProfile: ProfileRepo = {
  async getOrCreate(defaults) {
    const { data, error } = await supabase!.auth.getUser()
    if (error || !data.user) throw new Error('Not authenticated')
    const uid = data.user.id
    const { data: existing, error: selErr } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (selErr) throw new Error(selErr.message)
    if (existing) return mapProfile(existing)
    const { data: created, error: upsErr } = await supabase!
      .from('profiles')
      .upsert({ id: uid, email: data.user.email, ...defaults })
      .select()
      .single()
    if (upsErr) throw new Error(upsErr.message)
    return mapProfile(created)
  },
  async update(id, patch) {
    const { data, error } = await supabase!.from('profiles').update(patch).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return mapProfile(data)
  },
}

const SETTINGS_KEY = 'pmi_local_settings_v1'

function loadLocalSettings(): Profile {
  const base: Profile = {
    id: DEMO_USER_ID,
    name: 'Demo Trader',
    email: DEMO_USER_EMAIL,
    currency: 'PKR',
    default_valuation_method: 'sell',
    default_chart_period: '30d',
    theme: 'system',
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<Profile>) }
  } catch {
    /* ignore */
  }
  return base
}

const localProfile: ProfileRepo = {
  async getOrCreate(defaults) {
    await sleep(100)
    return { ...loadLocalSettings(), ...defaults }
  },
  async update(_id, patch) {
    const next = { ...loadLocalSettings(), ...patch, updated_at: nowIso() }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    return next
  },
}

/* ---------------------------------------------------------------------------
 * Client
 * ------------------------------------------------------------------------- */

function resetDemoData(): string {
  const dbSeed = emptyDB()
  saveDB(dbSeed)
  return 'Demo data has been reset.'
}

export const accountStorage = {
  isDemo: USE_DEMO_DATA,
  resetDemoData,
}

export const marketRatesRepo: MarketRatesRepo = isRemote() ? remoteMarketRates : localMarketRates
export const investmentsRepo: InvestmentsRepo = isRemote() ? remoteInvestments : localInvestments
export const transactionsRepo: TransactionsRepo = isRemote() ? remoteTransactions : localTransactions
export const notesRepo: NotesRepo = isRemote() ? remoteNotes : localNotes
export const alertsRepo: AlertsRepo = isRemote() ? remoteAlerts : localAlerts
export const profileRepo: ProfileRepo = isRemote() ? remoteProfile : localProfile

export { loadDB as loadLocalDB, saveDB as saveLocalDB }

export function hydrateLocalScopes(): void {
  // no-op hook reserved so local data can embed user scoping later
  void DEMO_USER_ID
}