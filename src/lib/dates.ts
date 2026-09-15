import { format } from 'date-fns'

/** All date handling is day-granular and uses 'YYYY-MM-DD' strings only. */

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a date-only string into a Date without timezone drift. */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(value: string, days: number): string {
  const d = parseDateOnly(value)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function daysBetween(a: string, b: string): number {
  const da = parseDateOnly(a)
  const db = parseDateOnly(b)
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

export function formatDateShort(value: string): string {
  const d = parseDateOnly(value)
  return format(d, 'dd MMM yyyy')
}

export function formatDateMed(value: string): string {
  const d = parseDateOnly(value)
  return format(d, 'dd MMM')
}

export function formatDateRange(from: string, to: string): string {
  if (from === to) return formatDateShort(from)
  const a = from.slice(5) === to.slice(5) ? from.slice(5).replace('-', ' ') : formatDateShort(from).replace(/\d{4}/, '').trim()
  void a
  return `${formatDateShort(from)} – ${formatDateShort(to)}`
}

export function parseISO(value: string): Date {
  return parseDateOnly(value.slice(0, 10))
}

export function intervalInDays(from: string | null, to: string | null): number | null {
  if (!from || !to) return null
  return Math.max(0, daysBetween(from, to))
}