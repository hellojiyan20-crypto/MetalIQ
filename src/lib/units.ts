/** Unit system. All rates entered are per-unit in the chosen unit.
 *  Conversions let the system move between tola / gram / ounce without
 *  hard-coding any single unit anywhere in the codebase.
 */
export const GRAMS_PER_TOLA = 11.6638038
export const GRAMS_PER_TROY_OUNCE = 31.1034768
export const TOLA_PER_OUNCE = GRAMS_PER_TROY_OUNCE / GRAMS_PER_TOLA

export const UNIT_LABELS: Record<string, string> = {
  tola: 'Tola',
  gram: 'Gram',
  ounce: 'Ounce',
}

export const UNIT_TO_GRAMS: Record<string, number> = {
  tola: GRAMS_PER_TOLA,
  gram: 1,
  ounce: GRAMS_PER_TROY_OUNCE,
}

export function convertUnit(value: number, from: string, to: string): number {
  const fromG = UNIT_TO_GRAMS[from]
  const toG = UNIT_TO_GRAMS[to]
  if (!fromG || !toG) return value
  return (value * fromG) / toG
}

/** Whether two quantities share an equivalent unit. */
export function sameUnit(a: string, b: string): boolean {
  return (UNIT_TO_GRAMS[a] ?? 0) === (UNIT_TO_GRAMS[b] ?? 0) && a.length > 0 && b.length > 0
}

export function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return 'tola'
  const u = unit.toLowerCase()
  if (u.startsWith('tol')) return 'tola'
  if (u.startsWith('gr')) return 'gram'
  if (u.startsWith('oz') || u.startsWith('ounce') || u.startsWith('oncu')) return 'ounce'
  return u
}

export function unitLabel(unit: string | null | undefined): string {
  return UNIT_LABELS[normalizeUnit(unit)] ?? normalizeUnit(unit)
}