import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { AssetType } from '../types'

export type AssetScope = AssetType | 'both'

interface AssetScopeContextValue {
  scope: AssetScope
  setScope: (s: AssetScope) => void
}

const AssetScopeContext = createContext<AssetScopeContextValue>({
  scope: 'both',
  setScope: () => {},
})

/**
 * The active workspace is derived from the route:
 *   /gold/*  -> 'gold'
 *   /silver/* -> 'silver'
 *   everything else (compare, settings, other) -> 'both'
 */
function scopeFromPath(pathname: string): AssetScope {
  if (pathname.startsWith('/gold')) return 'gold'
  if (pathname.startsWith('/silver')) return 'silver'
  return 'both'
}

export function AssetScopeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  const value = useMemo<AssetScopeContextValue>(() => {
    const scope = scopeFromPath(pathname)
    return { scope, setScope: () => {} }
  }, [pathname])

  return <AssetScopeContext.Provider value={value}>{children}</AssetScopeContext.Provider>
}

export function useAssetScope(): AssetScopeContextValue {
  return useContext(AssetScopeContext)
}

/** True when the given asset is visible under the current scope. */
export function scopedByAsset(scope: AssetScope, asset: AssetType): boolean {
  return scope === 'both' || scope === asset
}

/** The list of assets visible under the current scope. */
export function scopeAssets(scope: AssetScope): AssetType[] {
  if (scope === 'gold') return ['gold']
  if (scope === 'silver') return ['silver']
  return ['gold', 'silver']
}