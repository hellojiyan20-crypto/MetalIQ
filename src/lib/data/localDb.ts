import type { MarketRate, Investment, Transaction, MarketNote, PriceAlert } from '../../types'
import { DEMO_USER_ID } from '../config'
import { generateDemoAlerts, generateDemoInvestments, generateDemoNotes, generateDemoRates } from './seed'

export interface LocalDB {
  rates: MarketRate[]
  investments: Investment[]
  transactions: Transaction[]
  notes: MarketNote[]
  alerts: PriceAlert[]
  seeded: boolean
}

const DB_KEY = 'pmi_local_db_v1'

function withUser<T extends object>(row: T): T & { user_id: string } {
  return { ...row, user_id: DEMO_USER_ID }
}

export function emptyDB(): LocalDB {
  return { rates: [], investments: [], transactions: [], notes: [], alerts: [], seeded: true }
}

export function nextId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function seed(): LocalDB {
  const rates = generateDemoRates().map(withUser)
  const investments = generateDemoInvestments().map(withUser)
  const notes = generateDemoNotes().map(withUser)
  const alerts = generateDemoAlerts().map(withUser)
  return { rates, investments, transactions: [], notes, alerts, seeded: true }
}

export function loadDB(): LocalDB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDB
      if (parsed && Array.isArray(parsed.rates) && parsed.seeded) return parsed
    }
  } catch {
    /* ignore corrupt storage */
  }
  const db = seed()
  saveDB(db)
  return db
}

export function saveDB(db: LocalDB): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* storage may be unavailable (private mode) — demo continues in memory */
  }
}