import type { AssetType } from '../../types'
import { Circle } from 'lucide-react'
import { cn } from '../../lib/utils'

export const ASSET_META: Record<
  AssetType,
  { label: string; symbol: string; text: string; chip: string; ring: string; icon: typeof Circle }
> = {
  gold: {
    label: 'Gold',
    symbol: 'Au',
    text: 'text-gold',
    chip: 'bg-gold-bg text-gold border-gold/20',
    ring: 'border-gold/25 bg-gold-bg',
    icon: Circle,
  },
  silver: {
    label: 'Silver',
    symbol: 'Ag',
    text: 'text-silver',
    chip: 'bg-silver-bg text-silver border-silver/25',
    ring: 'border-silver/25 bg-silver-bg',
    icon: Circle,
  },
}

export function AssetIcon({
  asset,
  size = 'md',
  className,
}: {
  asset: AssetType
  size?: 'sm' | 'md'
  className?: string
}) {
  const meta = ASSET_META[asset]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-xl border',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        meta.ring,
        className,
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', meta.text)} fill="currentColor" strokeWidth={1} />
    </span>
  )
}