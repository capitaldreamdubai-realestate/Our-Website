import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '@/contexts/AdminAuthContext'

export function AdminLogin() {
  const { session, loading, signIn, configured } = useAdminAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!configured) {
    return (
      <div className="admin-portal flex min-h-svh items-center justify-center bg-[var(--admin-surface)] px-4">
        <p className="max-w-sm text-center text-sm text-ink/70">
          Sign-in is temporarily unavailable. Please contact your site administrator.
        </p>
      </div>
    )
  }

  if (!loading && session) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await signIn(email.trim(), password)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="admin-portal flex min-h-svh items-center justify-center bg-[var(--admin-surface)] px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-ink/10 bg-white p-6 shadow-xl shadow-ink/10 md:p-8">
        <h1 className="font-display text-xl font-semibold text-[var(--admin-primary)] md:text-2xl">
          Admin sign in
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-ink/60 md:text-sm">
          Sign in with your administrator email and password to manage listings, content, and site
          settings.
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className="text-xs font-medium text-ink/70">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-ink/15 px-3 py-2.5 text-sm text-ink"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-xs font-medium text-ink/70">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-ink/15 px-3 py-2.5 pr-11 text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 inline-flex items-center justify-center px-3 text-ink/55 transition hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-[var(--admin-primary)] py-3 text-sm font-semibold text-white shadow-md shadow-[var(--admin-primary)]/25 transition hover:brightness-90 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
