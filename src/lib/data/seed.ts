import type { MarketRate, Investment, MarketNote, PriceAlert } from '../../types'
import { todayISO, addDays } from '../dates'

/** Deterministic PRNG so demo data is stable between reloads. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeId(n = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

const DAYS = 400

export function generateDemoRates(): MarketRate[] {
  const rand = mulberry32(20260914)
  const today = todayISO()
  const goldStart = 238_500
  const silverStart = 2_050
  const goldEnd = 317_400
  const silverEnd = 3_140

  const rates: MarketRate[] = []
  // Walk backwards from today; include roughly 85% of days so the history
  // has realistic gaps.
  for (let i = DAYS; i >= 0; i--) {
    if (i !== 0 && i % 7 === 0 && rand() < 0.55) continue
    const t = i / DAYS // 0 = oldest, 1 = today
    const progress = 1 - t

    const trendGold = goldStart + (goldEnd - goldStart) * progress
    const waveGold = Math.sin(t * 9.4) * 6_500 + Math.sin(t * 25.7) * 1_900
    const goldSell = Math.round(trendGold + waveGold + (rand() - 0.5) * 1_600)

    const trendSilver = silverStart + (silverEnd - silverStart) * progress
    const waveSilver = Math.sin(t * 8.1) * 95 + Math.sin(t * 30.3) * 26
    const silverSell = Math.round(trendSilver + waveSilver + (rand() - 0.5) * 40)

    rates.push({
      id: `demo-rate-${i}`,
      date: addDays(today, -i),
      gold_buy_rate: Math.round(goldSell * 1.008),
      gold_sell_rate: goldSell,
      silver_buy_rate: Math.round(silverSell * 1.014),
      silver_sell_rate: silverSell,
      gold_unit: 'tola',
      silver_unit: 'tola',
      source: 'Demo data source',
      notes: i % 37 === 0 ? 'Strong weekly range in local market.' : null,
      usd_pkr: i % 9 === 0 ? Math.round(278 + t * 4) : null,
      intl_gold_oz: i % 11 === 0 ? Math.round(2_540 + progress * 310) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }
  return rates
}

export function generateDemoInvestments(): Investment[] {
  const today = todayISO()
  const mk = (
    daysAgo: number,
    asset_type: 'gold' | 'silver',
    quantity: number,
    unit: string,
    purchase_rate: number,
    notes: string,
  ): Investment => ({
    id: `demo-inv-${makeId(6)}`,
    asset_type,
    investment_date: addDays(today, -daysAgo),
    quantity,
    unit,
    purchase_rate,
    total_amount: Math.round(quantity * purchase_rate),
    notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return [
    mk(240, 'gold', 1.0, 'tola', 262_800, 'First tola — bought on a measured pullback.'),
    mk(170, 'gold', 1.5, 'tola', 274_400, 'Added at the March consolidation.'),
    mk(55, 'gold', 0.5, 'tola', 302_900, 'Small tactical add after the August dip.'),
    mk(210, 'silver', 20, 'tola', 2_410, 'Silver accumulation start.'),
    mk(76, 'silver', 30, 'tola', 2_690, 'Silver position on industrial-demand support.'),
  ]
}

export function generateDemoNotes(): MarketNote[] {
  const today = todayISO()
  return [
    {
      id: 'demo-note-1',
      date: addDays(today, -4),
      asset_type: 'gold',
      note: 'Gold gained strongly on a weaker US dollar — buyers came back at the open.',
      rate_reference: 311_200,
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-note-2',
      date: addDays(today, -12),
      asset_type: 'silver',
      note: 'Silver feels expensive here relative to its 30-day range.',
      rate_reference: 3_020,
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-note-3',
      date: addDays(today, -27),
      asset_type: null,
      note: 'Broad market correction across both metals this week.',
      rate_reference: null,
      created_at: new Date().toISOString(),
    },
  ]
}

export function generateDemoAlerts(): PriceAlert[] {
  return [
    {
      id: 'demo-alert-1',
      asset_type: 'gold',
      condition: 'above',
      target_price: 325_000,
      target_pct: null,
      is_active: true,
      triggered_at: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-alert-2',
      asset_type: 'silver',
      condition: 'below',
      target_price: 2_900,
      target_pct: null,
      is_active: true,
      triggered_at: null,
      created_at: new Date().toISOString(),
    },
  ]
}