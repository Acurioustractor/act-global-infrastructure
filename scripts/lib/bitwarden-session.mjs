/**
 * bitwarden-session.mjs — shared Bitwarden CLI session bootstrapping
 *
 * Used by all bitwarden-* scripts to remove the "BW_SESSION not set" friction.
 * Detects vault state; unlocks interactively if locked; sets process.env.BW_SESSION.
 *
 * Persists the session token to ~/.cache/act-bw-session with mode 0600 + 1-hour
 * TTL so subsequent script runs (separate Node processes) reuse the same
 * unlocked state instead of re-prompting for master password every time.
 *
 * Security trade-off: the cached file IS sufficient to read the vault if an
 * attacker has read access to that file. Mitigations: 0600 perms (owner-only),
 * standard XDG cache location, 1-hour TTL, file-mode verification on read.
 * For ACT scale (single user, dev machine, locked laptop), this is acceptable.
 * Higher-security alternative: keep TTL short (15 min) or set CACHE_TTL_MS=0
 * to disable cache entirely.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync, chmodSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const CACHE_PATH = join(homedir(), '.cache', 'act-bw-session')
const CACHE_TTL_MS = Number(process.env.BW_SESSION_TTL_MS ?? 60 * 60 * 1000) // 1h default

export function ensureBwInstalled() {
  try {
    execSync('which bw', { stdio: 'pipe' })
  } catch {
    console.error('bw (Bitwarden CLI) not installed.')
    console.error('Install: npm install -g @bitwarden/cli')
    process.exit(2)
  }
}

function vaultStatus() {
  try {
    const out = execSync('bw status', { encoding: 'utf8', env: process.env, stdio: ['pipe', 'pipe', 'pipe'] })
    return JSON.parse(out)
  } catch {
    return null
  }
}

function readCachedSession() {
  if (CACHE_TTL_MS === 0) return null
  if (!existsSync(CACHE_PATH)) return null
  try {
    const stat = statSync(CACHE_PATH)
    // Mode check — must be owner-only-readable
    const mode = stat.mode & 0o777
    if (mode !== 0o600) {
      console.error(`[bitwarden] cache file has unsafe mode ${mode.toString(8)}; deleting and re-unlocking`)
      try { unlinkSync(CACHE_PATH) } catch {}
      return null
    }
    // TTL check
    const ageMs = Date.now() - stat.mtimeMs
    if (ageMs > CACHE_TTL_MS) {
      try { unlinkSync(CACHE_PATH) } catch {}
      return null
    }
    const token = readFileSync(CACHE_PATH, 'utf8').trim()
    return token || null
  } catch {
    return null
  }
}

function writeCachedSession(token) {
  if (CACHE_TTL_MS === 0) return
  try {
    const dir = dirname(CACHE_PATH)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 })
    writeFileSync(CACHE_PATH, token, { mode: 0o600 })
    // Belt-and-braces: re-chmod in case umask interfered
    chmodSync(CACHE_PATH, 0o600)
  } catch (err) {
    console.error(`[bitwarden] could not cache session (continuing): ${err.message}`)
  }
}

function clearCache() {
  try { unlinkSync(CACHE_PATH) } catch {}
}

/**
 * Make sure Bitwarden CLI is logged in + unlocked; populate BW_SESSION.
 *
 * Resolution order:
 *   1. BW_SESSION already set in env + valid → use as-is
 *   2. Cached session at ~/.cache/act-bw-session (mode 0600, TTL 1h) + valid → use
 *   3. Vault locked → prompt for master password interactively, cache result
 */
export function ensureUnlocked() {
  ensureBwInstalled()

  // Fast path 1 — BW_SESSION already set in process env
  if (process.env.BW_SESSION) {
    const s = vaultStatus()
    if (s && s.status === 'unlocked') return s
  }

  // Fast path 2 — cached session from previous run
  const cachedToken = readCachedSession()
  if (cachedToken) {
    process.env.BW_SESSION = cachedToken
    const s = vaultStatus()
    if (s && s.status === 'unlocked') {
      return s
    }
    // Cache stale (vault re-locked underneath us) — clear and continue
    delete process.env.BW_SESSION
    clearCache()
  }

  const status = vaultStatus()
  if (!status) {
    console.error('bw status failed — is Bitwarden CLI installed and logged in?')
    console.error('Try: bw login your@email.com')
    process.exit(3)
  }

  if (status.status === 'unauthenticated') {
    console.error('Not logged in to Bitwarden CLI.')
    console.error('Run: bw login your@email.com')
    process.exit(3)
  }

  if (status.status === 'locked') {
    console.error('[bitwarden] vault locked — unlocking interactively (will be cached for 1h)...')
    try {
      const token = execSync('bw unlock --raw', {
        stdio: ['inherit', 'pipe', 'inherit'],
        encoding: 'utf8',
      }).trim()
      if (!token) {
        console.error('[bitwarden] unlock returned empty token. Wrong master password?')
        process.exit(4)
      }
      process.env.BW_SESSION = token
      writeCachedSession(token)
      console.error('[bitwarden] vault unlocked + session cached.')
      return vaultStatus()
    } catch (err) {
      console.error('[bitwarden] unlock failed:', err.message?.slice(0, 200))
      process.exit(4)
    }
  }

  return status
}

/**
 * Force-clear the cached session. Use when ending work for the day or
 * rotating credentials.
 */
export function lockSession() {
  clearCache()
  delete process.env.BW_SESSION
  try {
    execSync('bw lock', { stdio: 'pipe', env: process.env })
  } catch {}
}
