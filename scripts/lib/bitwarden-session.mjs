/**
 * bitwarden-session.mjs — shared Bitwarden CLI session bootstrapping
 *
 * Used by all bitwarden-* scripts to remove the "BW_SESSION not set" friction.
 * Detects vault state; unlocks interactively if locked; sets process.env.BW_SESSION
 * so subsequent `bw` calls in the same Node process work.
 *
 * The interactive prompt for master password uses stdin: 'inherit' (user types
 * into their terminal) + stderr: 'inherit' (bw's "? Master password:" prompt
 * shows on terminal), and stdout: 'pipe' so we capture only the session token.
 */
import { execSync } from 'node:child_process'

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

/**
 * Make sure Bitwarden CLI is logged in + unlocked; populate BW_SESSION.
 * If already unlocked (BW_SESSION valid OR external desktop client unlocked),
 * uses that. Otherwise prompts for master password interactively.
 */
export function ensureUnlocked() {
  ensureBwInstalled()

  // Fast path — if BW_SESSION is already set and works, do nothing
  if (process.env.BW_SESSION) {
    const s = vaultStatus()
    if (s && s.status === 'unlocked') return s
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
    console.error('[bitwarden] vault locked — unlocking interactively...')
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
      console.error('[bitwarden] vault unlocked.')
      return vaultStatus()
    } catch (err) {
      console.error('[bitwarden] unlock failed:', err.message?.slice(0, 200))
      process.exit(4)
    }
  }

  return status
}
