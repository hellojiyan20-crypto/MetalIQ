import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Field, Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useSettings } from '../context/AuthContext'

export default function LoginPage() {
  const { user, loading, mode, signIn, signUp, signInDemo } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  void settings

  if (!loading && user) return <Navigate to="/gold/dashboard" replace />

  const next = () => navigate('/gold/dashboard', { replace: true })

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await signIn(email, password)
      toast('Welcome back.', 'success')
      next()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email || !password) {
      setError('Fill in all fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await signUp(name.trim(), email, password)
      toast('Account created. You can now sign in.', 'success')
      setTab('login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleDemo = async () => {
    setBusy(true)
    await signInDemo()
    toast('Exploring with demo data.', 'info')
    next()
  }

  const rightText =
    tab === 'login'
      ? 'Sign back in to pick up where you left off.'
      : 'Create a private account for your market history.'

  return (
    <div className="flex min-h-screen bg-bg">
      {/* brand panel */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden border-r border-edge bg-surface2 lg:flex">
        <div className="absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-silver/10 blur-3xl" />
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
              <div className="h-5 w-5 rounded-full bg-gold" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Precious Metals Intelligence</p>
              <p className="text-[11px] text-muted">Personal Gold & Silver investment desk</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-10 pb-16">
          <h1 className="max-w-md text-3xl font-bold leading-tight tracking-tight text-ink">
            Your private market & investment intelligence.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            Log the daily Gold and Silver rates in PKR, track your holdings, and understand
            exactly how the market — and your money — is moving. Historical analysis and
            decision support, not advice.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
            {[
              { label: 'Daily rates', sub: 'manual entry' },
              { label: 'Analytics', sub: 'trends & averages' },
              { label: 'Portfolio', sub: 'live P/L' },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-edge bg-surface p-3">
                <p className="text-xs font-semibold text-ink">{c.label}</p>
                <p className="text-[11px] text-muted">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10">
              <div className="h-4 w-4 rounded-full bg-gold" />
            </div>
            <p className="text-sm font-bold text-ink">Precious Metals Intelligence</p>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-ink">
            {tab === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1 text-sm text-muted">{rightText}</p>

          <div className="mt-6 flex rounded-xl border border-edge bg-surface p-1">
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  tab === t ? 'bg-gold text-[#151004]' : 'text-muted hover:text-ink'
                }`}
              >
                {t === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-negative/25 bg-negative-bg px-4 py-3 text-sm text-negative">
              {error}
            </div>
          )}

          <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="mt-4 space-y-4">
            {tab === 'signup' && (
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
              </Field>
            )}
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </Field>
            <Field label="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
            </Field>
            <Button type="submit" variant="primary" loading={busy} className="w-full">
              {tab === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          {mode === 'demo' && (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-edge" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">or</span>
                <span className="h-px flex-1 bg-edge" />
              </div>
              <Button variant="secondary" onClick={handleDemo} className="w-full" disabled={busy}>
                <Sparkles className="h-4 w-4 text-gold" />
                Explore demo mode
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted">
                No Supabase keys are set — the app runs locally with realistic sample history.
                Add your keys to `.env` to go live with real accounts.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}