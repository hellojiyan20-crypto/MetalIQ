const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const SUPABASE_URL = envUrl?.trim() || null
export const SUPABASE_ANON_KEY = envKey?.trim() || null

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const USE_DEMO_DATA = !isSupabaseConfigured

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
export const DEMO_USER_EMAIL = 'demo@local'
export const DEMO_USER_NAME = 'Demo Trader'