'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTIONS = [
  'What projects need attention?',
  'Who should I follow up with?',
  'How is our cash flow looking?',
  'What are our top priorities this week?',
]

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "G'day! I'm your ACT Business Agent. I can help you think through operations, projects, contacts, and finances. What can I help with?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = input.trim()
    setInput('')
    setLoading(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      // Build history from existing messages (exclude the welcome message)
      const history = messages
        .filter((_, i) => i > 0) // skip welcome
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          history,
        }),
      })

      const data = await res.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.error || 'Sorry, something went wrong.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Agent chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry, I had trouble connecting. Check that the server is running and ANTHROPIC_API_KEY is set.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion)
    textareaRef.current?.focus()
  }

  const showSuggestions = messages.length <= 1 && !loading

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  msg.role === 'user'
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'bg-purple-500/20 text-purple-400'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              {/* Message bubble */}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-indigo-500/20 text-white'
                    : 'bg-white/5 text-white/90'
                )}
              >
                <div className="prose prose-invert prose-sm max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                <p className="mt-2 text-[10px] text-white/30">
                  {msg.timestamp.toLocaleTimeString('en-AU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                <Bot className="h-4 w-4" />
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

      {/* Suggestions */}
      {showSuggestions && (
        <div className="border-t border-white/5 px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <p className="mb-2 text-xs text-white/30">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestion(suggestion)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white/80"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-white/10 bg-[#0a0f1a]/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask the ACT Business Agent..."
            className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className={cn(
              'flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl transition-all',
              input.trim() && !loading
                ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
