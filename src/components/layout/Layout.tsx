import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Coins,
  PieChart,
  Calculator,
  BookOpen,
  Bell,
  GitCompareArrows,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth, useSettings } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useAssetScope, type AssetScope } from '../../context/AssetScopeContext'

/* -------------------------------------------------------------------------
 * Metal workspace config
 * ---------------------------------------------------------------------- */

type Metal = 'gold' | 'silver'

const METAL_PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'rates', label: 'Market Rates', icon: TrendingUp },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'investments', label: 'Investments', icon: Coins },
  { id: 'portfolio', label: 'Portfolio', icon: PieChart },
  { id: 'calculator', label: 'Calculator', icon: Calculator },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'alerts', label: 'Alerts', icon: Bell },
] as const

const METALS: { id: Metal; label: string; code: string }[] = [
  { id: 'gold', label: 'Gold', code: 'Au' },
  { id: 'silver', label: 'Silver', code: 'Ag' },
]

function MetalDot({ metal, className }: { metal: Metal; className?: string }) {
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-black uppercase tracking-wide text-[#151004] shadow-sm',
        metal === 'gold'
          ? 'bg-gradient-to-br from-gold-2 to-[#8a6a10]'
          : 'bg-gradient-to-br from-[#d6dae2] to-[#6e7682] text-[#14161a]',
        className,
      )}
    >
      {metal === 'gold' ? 'Au' : 'Ag'}
    </span>
  )
}

/* -------------------------------------------------------------------------
 * Mobile detection
 * ---------------------------------------------------------------------- */

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const fn = () => setMobile(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return mobile
}

/* -------------------------------------------------------------------------
 * Sidebar
 * ---------------------------------------------------------------------- */

function Sidebar({ collapsed, onClose }: { collapsed: boolean; onClose: () => void }) {
  const { scope } = useAssetScope()
  const activeMetal: Metal | null = scope === 'gold' || scope === 'silver' ? scope : null

  const [open, setOpen] = useState<Record<Metal, boolean>>(() => {
    try {
      const raw = localStorage.getItem('pmi_nav_open')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<Metal, boolean>>
        return { gold: parsed.gold ?? true, silver: parsed.silver ?? false }
      }
    } catch {
      /* ignore */
    }
    return { gold: true, silver: false }
  })

  useEffect(() => {
    if (activeMetal && !open[activeMetal]) {
      setOpen((o) => ({ ...o, [activeMetal]: true }))
    }
  }, [activeMetal, open])

  const toggle = (m: Metal) => {
    setOpen((o) => {
      const next = { ...o, [m]: !o[m] }
      try {
        localStorage.setItem('pmi_nav_open', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const activeItemCls =
    'bg-gold-bg font-semibold text-gold'
  const itemCls =
    'mx-2 mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink'

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* brand */}
      <div className={cn('flex h-16 items-center gap-2.5 border-b border-edge', collapsed ? 'justify-center px-2' : 'px-5')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-2 to-[#8a6a10] shadow-sm">
          <div className="h-2.5 w-2.5 rounded-full bg-[#151004]" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-ink">Precious Metals</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-faint">Gold &amp; Silver</p>
          </div>
        )}
      </div>

      {/* workspace nav */}
      <nav className="sidebar-scroller flex-1 space-y-2 overflow-y-auto py-3">
        {METALS.map((m) =>
          collapsed ? (
            <NavLink
              key={m.id}
              to={`/${m.id}/dashboard`}
              onClick={onClose}
              title={`${m.label} workspace`}
              className={({ isActive }) =>
                cn(
                  'mx-1 mb-0.5 flex items-center justify-center rounded-xl p-2.5 transition-colors',
                  isActive ? 'bg-gold-bg' : 'hover:bg-surface2',
                )
              }
            >
              <MetalDot metal={m.id} />
            </NavLink>
          ) : (
            <div key={m.id}>
              <button
                onClick={() => toggle(m.id)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface2"
                aria-expanded={open[m.id]}
              >
                <MetalDot metal={m.id} />
                <span className="flex-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  {m.label} workspace
                </span>
                <ChevronDown
                  className={cn('h-4 w-4 text-faint transition-transform duration-200', open[m.id] && 'rotate-180')}
                />
              </button>
              {open[m.id] && (
                <div className="ml-5 mt-1 space-y-0.5 border-l border-edge pl-1.5">
                  {METAL_PAGES.map((p) => {
                    const Icon = p.icon
                    const to = `/${m.id}/${p.id}`
                    return (
                      <NavLink
                        key={p.id}
                        to={to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors',
                            isActive
                              ? cn('bg-gold-bg font-semibold text-gold')
                              : 'text-muted hover:bg-surface2/70 hover:text-ink',
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{p.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          ),
        )}

        <div className="mx-3 border-t border-edge" />

        <NavLink
          to="/comparison"
          onClick={onClose}
          className={({ isActive }) =>
            cn('flex items-center gap-3', collapsed ? 'mx-1 justify-center p-2.5' : 'mx-2 px-3 py-2.5', isActive ? activeItemCls : itemCls)
          }
        >
          <GitCompareArrows className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="truncate">Gold vs Silver</span>}
        </NavLink>
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            cn('flex items-center gap-3', collapsed ? 'mx-1 justify-center p-2.5' : 'mx-2 px-3 py-2.5', isActive ? activeItemCls : itemCls)
          }
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="truncate">Settings</span>}
        </NavLink>
      </nav>

      {/* footer */}
      {!collapsed && (
        <div className="border-t border-edge px-3 py-2 text-center text-[10px] text-faint select-none">
          Built for personal use
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Header
 * ---------------------------------------------------------------------- */

function WorkspaceChip() {
  const { scope } = useAssetScope()
  if (scope !== 'gold' && scope !== 'silver') return null
  const metal = scope as Metal
  return (
    <span
      className={cn(
        'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex',
        metal === 'gold' ? 'border-gold/25 bg-gold-bg text-gold' : 'border-silver/30 bg-silver-bg text-silver',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', metal === 'gold' ? 'bg-gold' : 'bg-silver')} />
      {metal === 'gold' ? 'Gold' : 'Silver'} workspace
    </span>
  )
}

function Header({
  onMenuClick,
  collapsed,
  onToggleCollapse,
}: {
  onMenuClick: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const { user, mode, signOut } = useAuth()
  const { themeResolved, setThemePreference } = useSettings()
  const { toast } = useToast()
  const [showSignOut, setShowSignOut] = useState(false)

  const cycleTheme = () => {
    const next = themeResolved === 'dark' ? 'light' : 'dark'
    setThemePreference(next)
  }

  const handleSignOut = async () => {
    setShowSignOut(false)
    await signOut()
    toast('Signed out.', 'info')
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-edge bg-bg/80 px-4 backdrop-blur-lg sm:px-6">
      {/* mobile menu */}
      <button onClick={onMenuClick} className="btn-icon text-muted hover:text-ink md:hidden" aria-label="Menu">
        <Menu className="h-5 w-5" />
      </button>

      {/* desktop collapse */}
      <button onClick={onToggleCollapse} className="btn-icon text-muted hover:text-ink hidden md:flex" aria-label="Toggle sidebar">
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="flex-1" />

      <WorkspaceChip />

      {mode === 'demo' && (
        <span className="rounded-full border border-gold/20 bg-gold-bg px-2.5 py-0.5 text-[11px] font-semibold text-gold">
          Demo Mode
        </span>
      )}

      {/* theme toggle */}
      <button onClick={cycleTheme} className="btn-icon text-muted hover:text-ink" aria-label="Toggle theme">
        {themeResolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {/* avatar / signout */}
      {user && (
        <div className="relative">
          <button
            onClick={() => setShowSignOut((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-full border border-edge bg-surface pl-1 pr-3 transition-colors hover:bg-surface2"
            aria-label="Account"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold uppercase">
              {(user.name?.[0] ?? 'U').slice(0, 2)}
            </div>
            <span className="text-xs font-medium text-ink hidden sm:block truncate max-w-[120px]">{user.name}</span>
          </button>
          {showSignOut && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSignOut(false)} />
              <div className="absolute right-0 top-12 z-50 min-w-[160px] rounded-xl border border-edge bg-surface p-1 shadow-pop animate-slide-down">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-negative hover:bg-negative-bg"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  )
}

/* -------------------------------------------------------------------------
 * AppLayout (only exported)
 * ---------------------------------------------------------------------- */

export default function AppLayout() {
  const isMobile = useIsMobile()
  const { scope } = useAssetScope()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pmi_sidebar') === '1'
    } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('pmi_sidebar', next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }, [])

  const sidebarWidth = collapsed ? 68 : 220

  return (
    <div className="min-h-screen bg-bg">
      {/* mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 transition-opacity" onClick={() => setMobileOpen(false)} />
      )}

      {/* sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-edge transition-transform duration-200',
          isMobile ? 'w-64' : '',
          isMobile && !mobileOpen ? '-translate-x-full' : '',
        )}
        style={!isMobile ? { width: sidebarWidth } : undefined}
      >
        <Sidebar collapsed={collapsed} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* main content */}
      <div
        className={cn('flex min-h-screen flex-col transition-[margin] duration-200')}
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        <Header
          onMenuClick={() => setMobileOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
        {/* data-metal drives per-workspace accent theming of the content area */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8" data-metal={scope === 'both' ? undefined : scope}>
          <div className="mx-auto max-w-[1500px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Protected Route
 * ---------------------------------------------------------------------- */

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-muted">
          <svg className="h-8 w-8 animate-spin text-gold" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
          </svg>
          <p className="text-sm">Checking session…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children ?? <Outlet />
}

export type { AssetScope }