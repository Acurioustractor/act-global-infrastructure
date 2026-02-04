import OpenAI from 'openai'

// Lazy-initialized — must not instantiate at module level or Next.js build fails
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type TTSProvider = 'openai' | 'google'

type OpenAIVoice = 'nova' | 'coral' | 'sage' | 'shimmer' | 'alloy' | 'ash' | 'ballad' | 'echo' | 'fable' | 'onyx' | 'verse'
type GoogleVoice = 'en-AU-Neural2-A' | 'en-AU-Neural2-B' | 'en-AU-Neural2-C' | 'en-AU-Neural2-D'

export interface VoicePreference {
  provider: TTSProvider
  voice: string
}

const OPENAI_VOICES: OpenAIVoice[] = ['nova', 'coral', 'sage', 'shimmer', 'alloy', 'ash', 'ballad', 'echo', 'fable', 'onyx', 'verse']
const GOOGLE_VOICES: GoogleVoice[] = ['en-AU-Neural2-A', 'en-AU-Neural2-B', 'en-AU-Neural2-C', 'en-AU-Neural2-D']
const GOOGLE_VOICE_LABELS: Record<string, string> = {
  'en-AU-Neural2-A': 'Australian Female 1',
  'en-AU-Neural2-B': 'Australian Male 1',
  'en-AU-Neural2-C': 'Australian Female 2',
  'en-AU-Neural2-D': 'Australian Male 2',
}

const DEFAULT_PREFERENCE: VoicePreference = { provider: 'openai', voice: 'nova' }

// In-memory voice preferences (per chat)
const voicePreferences = new Map<number, VoicePreference>()

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VOICE PREFERENCE MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getVoicePreference(chatId: number): VoicePreference {
  return voicePreferences.get(chatId) || { ...DEFAULT_PREFERENCE }
}

export function cycleVoice(chatId: number): { preference: VoicePreference; label: string } {
  const current = getVoicePreference(chatId)

  if (current.provider === 'openai') {
    const idx = OPENAI_VOICES.indexOf(current.voice as OpenAIVoice)
    if (idx < OPENAI_VOICES.length - 1) {
      // Next OpenAI voice
      const next: VoicePreference = { provider: 'openai', voice: OPENAI_VOICES[idx + 1] }
      voicePreferences.set(chatId, next)
      return { preference: next, label: `OpenAI: ${next.voice}` }
    }
    // Switch to Google
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const next: VoicePreference = { provider: 'google', voice: GOOGLE_VOICES[0] }
      voicePreferences.set(chatId, next)
      return { preference: next, label: `Google: ${GOOGLE_VOICE_LABELS[next.voice]}` }
    }
    // No Google credentials, wrap to first OpenAI
    const next: VoicePreference = { provider: 'openai', voice: OPENAI_VOICES[0] }
    voicePreferences.set(chatId, next)
    return { preference: next, label: `OpenAI: ${next.voice}` }
  }

  // Currently Google
  const idx = GOOGLE_VOICES.indexOf(current.voice as GoogleVoice)
  if (idx < GOOGLE_VOICES.length - 1) {
    const next: VoicePreference = { provider: 'google', voice: GOOGLE_VOICES[idx + 1] }
    voicePreferences.set(chatId, next)
    return { preference: next, label: `Google: ${GOOGLE_VOICE_LABELS[next.voice]}` }
  }
  // Wrap back to OpenAI
  const next: VoicePreference = { provider: 'openai', voice: OPENAI_VOICES[0] }
  voicePreferences.set(chatId, next)
  return { preference: next, label: `OpenAI: ${next.voice}` }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SPEECH-TO-TEXT (Telegram OGG/Opus → text)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function transcribeVoice(fileBuffer: Buffer): Promise<string> {
  // OpenAI accepts OGG natively — no conversion needed
  const file = new File([new Uint8Array(fileBuffer)], 'voice.ogg', { type: 'audio/ogg' })

  const response = await getOpenAI().audio.transcriptions.create({
    model: 'gpt-4o-transcribe',
    file,
    language: 'en',
  })

  const text = response.text?.trim()
  if (!text) {
    throw new Error('Empty transcription — could not understand audio')
  }

  return text
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEXT-TO-SPEECH (text → Opus buffer for Telegram)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function synthesizeSpeech(text: string, chatId?: number): Promise<Buffer> {
  const pref = chatId ? getVoicePreference(chatId) : DEFAULT_PREFERENCE

  if (pref.provider === 'google' && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return synthesizeWithGoogle(text, pref.voice)
  }

  return synthesizeWithOpenAI(text, pref.voice)
}

async function synthesizeWithOpenAI(text: string, voice: string): Promise<Buffer> {
  const voiceText = text.length > 2000 ? text.slice(0, 2000) + '...' : text

  const response = await getOpenAI().audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: voice as OpenAIVoice,
    input: voiceText,
    response_format: 'opus', // Telegram-native format
    speed: 1.0,
  })

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function synthesizeWithGoogle(text: string, voice: string): Promise<Buffer> {
  const voiceText = text.length > 2000 ? text.slice(0, 2000) + '...' : text

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  const token = await getGoogleAccessToken(credentials)

  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text: voiceText },
      voice: {
        languageCode: 'en-AU',
        name: voice,
      },
      audioConfig: {
        audioEncoding: 'OGG_OPUS',
        speakingRate: 1.0,
        pitch: 0,
      },
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Google TTS error: ${response.status} ${errBody}`)
  }

  const result = await response.json()
  // Google returns base64-encoded audio
  return Buffer.from(result.audioContent, 'base64')
}

// Google OAuth2 token from service account
async function getGoogleAccessToken(credentials: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url')

  const signInput = `${header}.${payload}`

  // Use Node.js crypto to sign with RSA
  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signInput)
  const signature = sign.sign(credentials.private_key, 'base64url')

  const jwt = `${signInput}.${signature}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenResponse.ok) {
    throw new Error(`Google auth error: ${tokenResponse.status}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}
