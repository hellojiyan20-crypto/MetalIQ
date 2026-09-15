/** Centralised colours for Recharts. CSS variables switch automatically with theme. */
export const CHART = {
  gold: 'var(--gold)',
  gold2: 'var(--gold-2)',
  silver: 'var(--silver)',
  silver2: 'var(--silver-2)',
  positive: 'var(--positive)',
  negative: 'var(--negative)',
  ink: 'var(--ink)',
  muted: 'var(--muted)',
  faint: 'var(--faint)',
  edge: 'var(--edge)',
}

export const axisTick = {
  fontSize: 11,
  fill: 'var(--faint)',
  fontFamily: 'inherit',
}

export const axisLine = { stroke: 'var(--edge)' }

export function tooltipStyle() {
  return {
    contentStyle: {
      background: 'var(--surface)',
      border: '1px solid var(--edge)',
      borderRadius: 12,
      boxShadow: '0 12px 32px -12px rgba(0,0,0,0.35)',
      fontSize: 12,
      color: 'var(--ink)',
    },
    labelStyle: { color: 'var(--muted)', fontWeight: 600, marginBottom: 6 },
    itemStyle: { padding: 0 },
  }
}