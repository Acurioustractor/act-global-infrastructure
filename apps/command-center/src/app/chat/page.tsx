'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, Zap, Mic, Camera, Trash2, ArrowLeft, MicOff, CheckCircle2, XCircle, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ─── Types ──────────────────────────────────────────────────────

interface Usage {
  model: string
  input_tokens: number
  output_tokens: number
  cost: number
  tool_calls: number
  latency_ms: number
}

interface PendingAction {
  description: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  usage?: Usage
  type?: 'text' | 'voice' | 'photo'
  transcription?: string
  imageData?: string // base64 thumbnail
  pendingAction?: PendingAction
}

// ─── Helpers ────────────────────────────────────────────────────

function formatCost(cost: number): string {
  if (cost < 0.001) return '<$0.001'
  return `$${cost.toFixed(3)}`
}

function modelLabel(model: string): string {
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('opus')) return 'Opus'
  return model
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

const SUGGESTIONS = [
  "What's on my calendar today?",
  'Who needs follow-up?',
  'How is our cash flow?',
  'Give me a daily briefing',
]

// ─── Main Page ──────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionCost, setSessionCost] = useState(0)
  const [recording, setRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Send text message ──────────────────────────────────────

  const sendMessage = useCallback(async (text?: string) => {
    const content = text || input.trim()
    if (!content || loading) return

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
      type: 'text',
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      })
      const data = await res.json()
      addAssistantMessage(data)
    } catch {
      addErrorMessage()
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  // ─── Voice recording ────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Prefer webm/opus (Chrome/Android), fall back to mp4 (Safari/iOS)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        setRecordingDuration(0)

        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const buffer = await blob.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )

        // Show user message as voice
        const userMsg: Message = {
          id: generateId(),
          role: 'user',
          content: 'Voice message...',
          timestamp: new Date(),
          type: 'voice',
        }
        setMessages((prev) => [...prev, userMsg])
        setLoading(true)

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64 }),
          })
          const data = await res.json()

          // Update user message with transcription
          if (data.transcription) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === userMsg.id
                  ? { ...m, content: data.transcription, transcription: data.transcription }
                  : m
              )
            )
          }
          addAssistantMessage(data)
        } catch {
          addErrorMessage()
        } finally {
          setLoading(false)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)

      // Duration counter
      let duration = 0
      recordingTimerRef.current = setInterval(() => {
        duration++
        setRecordingDuration(duration)
      }, 1000)
    } catch (err) {
      console.error('Microphone access error:', err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [])

  // ─── Photo capture ──────────────────────────────────────────

  const handlePhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so same file can be re-selected
    e.target.value = ''

    // Compress via canvas
    const base64 = await compressImage(file, 1024, 0.8)

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: 'Receipt photo',
      timestamp: new Date(),
      type: 'photo',
      imageData: base64,
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      addAssistantMessage(data)
    } catch {
      addErrorMessage()
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Pending action handlers ────────────────────────────────

  const handleConfirmAction = useCallback(async (action: 'yes' | 'no' | 'edit') => {
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: action }),
      })
      const data = await res.json()

      const msg: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.response || 'Done.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, msg])
    } catch {
      addErrorMessage()
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Shared helpers ─────────────────────────────────────────

  function addAssistantMessage(data: {
    response?: string
    error?: string
    usage?: Usage
    pendingAction?: PendingAction
  }) {
    const msg: Message = {
      id: generateId(),
      role: 'assistant',
      content: data.response || data.error || 'Something went wrong.',
      timestamp: new Date(),
      usage: data.usage,
      pendingAction: data.pendingAction,
    }
    setMessages((prev) => [...prev, msg])
    if (data.usage?.cost) {
      setSessionCost((prev) => prev + data.usage!.cost)
    }
  }

  function addErrorMessage() {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again.',
        timestamp: new Date(),
      },
    ])
  }

  const clearChat = () => {
    setMessages([])
    setSessionCost(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const showSuggestions = messages.length === 0 && !loading

  // ─── Render ─────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#0a0f1a]/90 backdrop-blur-xl">
        <a
          href="/today"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </a>
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white">ACT Agent</h1>
          {sessionCost > 0 && (
            <p className="text-[10px] text-white/30">Session: {formatCost(sessionCost)}</p>
          )}
        </div>
        <button
          onClick={clearChat}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Welcome state */}
          {showSuggestions && (
            <div className="flex flex-col items-center pt-12 pb-8">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1">ACT Business Agent</h2>
              <p className="text-sm text-white/40 text-center mb-6">
                Ask about projects, contacts, calendar, financials — or send a voice message or receipt photo.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white/80"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  msg.role === 'user'
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'bg-purple-500/20 text-purple-400'
                )}
              >
                {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>

              {/* Bubble */}
              <div className={cn('max-w-[85%] space-y-2')}>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3',
                    msg.role === 'user'
                      ? 'bg-indigo-500/20 text-white'
                      : 'bg-white/5 text-white/90'
                  )}
                >
                  {/* Photo thumbnail */}
                  {msg.type === 'photo' && msg.imageData && (
                    <div className="mb-2">
                      <img
                        src={`data:image/jpeg;base64,${msg.imageData}`}
                        alt="Receipt"
                        className="rounded-lg max-w-[200px] max-h-[200px] object-cover"
                      />
                    </div>
                  )}

                  {/* Voice indicator */}
                  {msg.type === 'voice' && msg.transcription && (
                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-300/60 mb-1">
                      <Mic className="h-3 w-3" />
                      <span>Voice transcription</span>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="prose prose-invert prose-sm max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&_a]:text-indigo-400 [&_a]:no-underline hover:[&_a]:underline">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>

                  {/* Metadata */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-white/25">
                      {msg.timestamp.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.usage && (
                      <span className="flex items-center gap-1 text-[10px] text-white/20">
                        <Zap className="h-2.5 w-2.5" />
                        {modelLabel(msg.usage.model)}
                        {msg.usage.tool_calls > 0 && (
                          <span>
                            {msg.usage.tool_calls} tool{msg.usage.tool_calls > 1 ? 's' : ''}
                          </span>
                        )}
                        <span>{formatCost(msg.usage.cost)}</span>
                        <span>{(msg.usage.latency_ms / 1000).toFixed(1)}s</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Pending action buttons */}
                {msg.pendingAction && (
                  <div className="flex gap-2 ml-1">
                    <button
                      onClick={() => handleConfirmAction('yes')}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Yes, send
                    </button>
                    <button
                      onClick={() => handleConfirmAction('edit')}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleConfirmAction('no')}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400/70 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 bg-[#0a0f1a]/90 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto max-w-2xl">
          {/* Recording state */}
          {recording && (
            <div className="flex items-center justify-center gap-3 mb-3 py-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-red-400 font-medium">
                Recording {recordingDuration}s
              </span>
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
              >
                <MicOff className="h-3.5 w-3.5" />
                Stop
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Message ACT Agent..."
              className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
              rows={1}
              disabled={loading || recording}
            />

            {/* Action buttons */}
            <div className="flex gap-1.5">
              {/* Mic button */}
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={loading}
                className={cn(
                  'flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl transition-all',
                  recording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10'
                )}
              >
                {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              {/* Camera button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || recording}
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all disabled:opacity-30"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />

              {/* Send button */}
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading || recording}
                className={cn(
                  'flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl transition-all',
                  input.trim() && !loading && !recording
                    ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Image compression ──────────────────────────────────────────

async function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      // Strip data URL prefix to get raw base64
      resolve(dataUrl.split(',')[1])
    }
    img.src = URL.createObjectURL(file)
  })
}
