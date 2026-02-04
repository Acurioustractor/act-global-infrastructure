'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterDropdownProps {
  label: string
  options: FilterOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  searchable?: boolean
}

export function FilterDropdown({ label, options, selected, onChange, searchable }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          selected.length > 0
            ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/30'
            : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-indigo-500/50 text-white text-[10px] px-1.5 rounded-full">
            {selected.length}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-[220px] max-h-[320px] rounded-xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto max-h-[260px] p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-white/30 p-3 text-center">No matches</p>
            ) : (
              filtered.map((option, idx) => {
                const isSelected = selected.includes(option.value)
                return (
                  <button
                    key={`${option.value}-${idx}`}
                    onClick={() => toggle(option.value)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                      isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'
                    }`}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate flex-1 text-left">{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-white/30 text-[10px]">{option.count}</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-white/5">
              <button
                onClick={() => onChange([])}
                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60"
              >
                <X className="h-2.5 w-2.5" />
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
