import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { DEMO_USER_EMAIL, DEMO_USER_ID, DEMO_USER_NAME } from '../lib/config'
import type { Profile, UserSettings } from '../types'
import { profileRepo } from '../lib/data/repos'
import type { ThemePreference } from '../types'

export interface AppUser {
  id: string
  email: string
  name: string
}

export type AuthMode = 'supabase' | 'demo'

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  mode: AuthMode
  signIn: (email: string, password: string) => Promise<AppUser>
  signUp: (name: string, email: string, password: string) => Promise<AppUser>
  signInDemo: () => Promise<AppUser>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEMO_SESSION_KEY = 'pmi_demo_session'

function readDemoUser(): AppUser | null {
  try {
    if (!localStorage.getItem(DEMO_SESSION_KEY)) return null
    return { id: DEMO_USER_ID, email: DEMO_USER_EMAIL, name: DEMO_USER_NAME }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const remote = supabase !== null
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function init() {
      if (remote) {
        const { data } = await supabase!.auth.getSession()
        if (!active) return
        if (data.session) {
          setUser({
            id: data.session.user.id,
            email: data.session.user.email ?? '',
            name: (data.session.user.user_metadata.name as string) || data.session.user.email || '',
          })
        }
        setLoading(false)
        const { data: sub } = supabase!.auth.onAuthStateChange((_event, session: Session | null) => {
          if (!active) return
          if (session) {
            setUser({
              id: session.user.id,
              email: session.user.email ?? '',
              name: (session.user.user_metadata.name as string) || session.user.email || '',
            })
          } else {
            setUser(null)
          }
          setLoading(false)
        })
        return () => {
          active = false
          sub.subscription.unsubscribe()
        }
      }
      setUser(readDemoUser())
      setLoading(false)
      return undefined
    }
    void init()
  }, [remote])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (remote) {
        const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
        const u = data.user
        return { id: u.id, email: u.email ?? email, name: (u.user_metadata.name as string) || u.email || email }
      }
      throw new Error('Supabase is not configured. Use demo login instead.')
    },
    [remote],
  )

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (!remote) throw new Error('Supabase is not configured. Use demo login instead.')
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) throw new Error(error.message)
      if (!data.user) throw new Error('Could not create account')
      return { id: data.user.id, email: data.user.email ?? email, name }
    },
    [remote],
  )

  const signInDemo = useCallback(async () => {
    try {
      localStorage.setItem(DEMO_SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
    const demoUser: AppUser = { id: DEMO_USER_ID, email: DEMO_USER_EMAIL, name: DEMO_USER_NAME }
    setUser(demoUser)
    return demoUser
  }, [])

  const signOut = useCallback(async () => {
    if (remote) {
      await supabase!.auth.signOut()
    }
    try {
      localStorage.removeItem(DEMO_SESSION_KEY)
    } catch {
      /* ignore */
    }
    setUser(null)
  }, [remote])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, mode: remote ? 'supabase' : 'demo', signIn, signUp, signInDemo, signOut }),
    [user, loading, remote, signIn, signUp, signInDemo, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/* --------------------------------------------------------------------------
 * Settings + theme
 * ------------------------------------------------------------------------ */

const SETTINGS_CACHE_KEY = 'pmi_settings_cache_v1'

interface SettingsContextValue {
  settings: UserSettings
  profile: Profile | null
  settingsLoading: boolean
  updateSettings: (patch: Partial<UserSettings & { name?: string }>) => Promise<void>
  themeResolved: 'light' | 'dark'
  setThemePreference: (theme: ThemePreference) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

const defaultSettings: UserSettings = {
  currency: 'PKR',
  default_valuation_method: 'sell',
  default_chart_period: '30d',
  theme: 'system',
}

function cachedSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY)
    if (raw) return { ...defaultSettings, ...(JSON.parse(raw) as Partial<UserSettings>) }
  } catch {
    /* ignore */
  }
  return defaultSettings
}

function applyThemeClass(theme: ThemePreference): 'light' | 'dark' {
  const root = document.documentElement
  let resolved: 'light' | 'dark'
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } else {
    resolved = theme
  }
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
  return resolved
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<UserSettings>(cachedSettings)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [themeResolved, setThemeResolved] = useState<'light' | 'dark'>(() =>
    applyThemeClass(cachedSettings().theme),
  )

  // react to system theme changes when preference is "system"
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const cached = cachedSettings()
      if (cached.theme === 'system') setThemeResolved(applyThemeClass('system'))
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    applyThemeClass(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    let active = true
    async function load() {
      if (!user) {
        setSettingsLoading(false)
        return
      }
      try {
        const prof = await profileRepo.getOrCreate({})
        if (!active) return
        setProfile(prof)
        const next: UserSettings = {
          currency: prof.currency || 'PKR',
          default_valuation_method: prof.default_valuation_method,
          default_chart_period: prof.default_chart_period,
          theme: prof.theme,
        }
        setSettings((prev) => ({ ...prev, ...next }))
        try {
          localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        setThemeResolved(applyThemeClass(next.theme))
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setSettingsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [user])

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings & { name?: string }>) => {
      if (!user) return
      setSettings((prev) => {
        const next = { ...prev, ...patch }
        try {
          localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })
      if (patch.theme) setThemeResolved(applyThemeClass(patch.theme))

      const nextToStore: Partial<UserSettings & { name?: string }> = {
        currency: settings.currency,
        default_valuation_method: settings.default_valuation_method,
        default_chart_period: settings.default_chart_period,
        theme: settings.theme,
        ...patch,
      }
      const prof = await profileRepo.update(user.id, nextToStore)
      setProfile(prof)
    },
    [user, settings],
  )

  const setThemePreference = useCallback(
    (theme: ThemePreference) => {
      void updateSettings({ theme })
    },
    [updateSettings],
  )

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, profile, settingsLoading, updateSettings, themeResolved, setThemePreference }),
    [settings, profile, settingsLoading, updateSettings, themeResolved, setThemePreference],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}