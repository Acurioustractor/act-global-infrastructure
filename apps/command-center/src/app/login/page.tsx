'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/'
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(d.error || 'Incorrect password')
        setBusy(false)
        return
      }
      // Full reload so the new cookie is sent on the next navigation.
      window.location.href = next.startsWith('/') ? next : '/'
    } catch {
      setError('Something went wrong — try again')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0f]">
      <form onSubmit={submit} className="w-full max-w-sm glass-card p-8 space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white">ACT Command Center</h1>
          <p className="text-sm text-white/40 mt-1">Enter the team password to continue</p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full py-2.5 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-40"
        >
          {busy ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
