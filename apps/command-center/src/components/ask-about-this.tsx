'use client'

import { useState, useRef } from 'react'
import { Sparkles, Send, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AskAboutThisProps {
  /** Page title for AI context */
  pageTitle: string
  /** Function that returns current page data as a string for AI context */
  getContext: () => string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function AskAboutThis({ pageTitle, getContext }: AskAboutThisProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const question = input.trim()
    if (!question || isLoading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setIsLoading(true)

    try {
      const context = getContext()
      const res = await fetch('/api/finance/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context, pageTitle }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || data.error || 'No response' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get a response. Try again.' }])
    }

    setIsLoading(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
        className="fixed bottom-6 right-6 z-40 glass-card px-4 py-2.5 flex items-center gap-2 hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20 group"
      >
        <Sparkles className="h-4 w-4 text-indigo-400 group-hover:text-indigo-300" />
        <span className="text-sm text-white/60 group-hover:text-white/80">Ask about this</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 glass-card border border-white/10 shadow-2xl shadow-black/40 flex flex-col max-h-[50vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-medium text-white">Ask about {pageTitle}</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={cn('text-sm', msg.role === 'user' ? 'text-right' : '')}>
              {msg.role === 'user' ? (
                <span className="inline-block px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 max-w-[80%] text-left">
                  {msg.content}
                </span>
              ) : (
                <div className="text-white/70 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-white/40">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">Thinking...</span>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {messages.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-white/30">
            Ask anything about the data on this page
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            {['What stands out?', 'Any concerns?', 'Summarise this'].map(q => (
              <button
                key={q}
                onClick={() => {
                  setInput(q)
                  inputRef.current?.focus()
                }}
                className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-3 py-2.5 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-30 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
