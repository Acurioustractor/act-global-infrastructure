'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRelationships, getRelationshipHealth, type Contact } from '@/lib/api'
import { ContactCard } from '@/components/relationship/contact-card'
import { TemperatureFilter } from '@/components/relationship/temperature-filter'
import { Search, Users, AlertCircle, Flame, Thermometer, Snowflake, TrendingUp } from 'lucide-react'
import { LoadingPage } from '@/components/ui/loading'
import { DonutChart, ProgressBar } from '@tremor/react'

export default function PeoplePage() {
  const [temperature, setTemperature] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data: health } = useQuery({
    queryKey: ['relationships', 'health'],
    queryFn: getRelationshipHealth,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['relationships', 'list', temperature, search],
    queryFn: () =>
      getRelationships({
        limit: 100,
        temperature: temperature || undefined,
        search: search || undefined,
      }),
  })

  const contacts = data?.relationships || []

  // Calculate percentages
  const total = health?.total || 1
  const hotPct = Math.round(((health?.hot || 0) / total) * 100)
  const warmPct = Math.round(((health?.warm || 0) / total) * 100)
  const coolPct = Math.round(((health?.cool || 0) / total) * 100)

  return (
    <div className="min-h-screen p-8">
      {/* Header with Stats */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="h-8 w-8 text-indigo-400" />
              People
            </h1>
            <p className="text-lg text-white/60 mt-1">
              {health?.total || 0} relationships in your network
            </p>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setTemperature(null)}
            className={`glass-card p-4 text-left transition-all ${!temperature ? 'ring-2 ring-indigo-500/50' : 'hover:border-white/20'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{health?.total || 0}</p>
                <p className="text-xs text-white/50">Total</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setTemperature('hot')}
            className={`glass-card p-4 text-left transition-all ${temperature === 'hot' ? 'ring-2 ring-red-500/50' : 'hover:border-white/20'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Flame className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{health?.hot || 0}</p>
                <p className="text-xs text-white/50">Hot ({hotPct}%)</p>
              </div>
            </div>
            <ProgressBar value={hotPct} color="red" className="mt-2" />
          </button>

          <button
            onClick={() => setTemperature('warm')}
            className={`glass-card p-4 text-left transition-all ${temperature === 'warm' ? 'ring-2 ring-orange-500/50' : 'hover:border-white/20'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Thermometer className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">{health?.warm || 0}</p>
                <p className="text-xs text-white/50">Warm ({warmPct}%)</p>
              </div>
            </div>
            <ProgressBar value={warmPct} color="orange" className="mt-2" />
          </button>

          <button
            onClick={() => setTemperature('cool')}
            className={`glass-card p-4 text-left transition-all ${temperature === 'cool' ? 'ring-2 ring-blue-500/50' : 'hover:border-white/20'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Snowflake className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{health?.cool || 0}</p>
                <p className="text-xs text-white/50">Cool ({coolPct}%)</p>
              </div>
            </div>
            <ProgressBar value={coolPct} color="blue" className="mt-2" />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="glass-card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
          />
        </div>
        {temperature && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-white/60">Filtered by:</span>
            <span className={`badge ${temperature === 'hot' ? 'badge-hot' : temperature === 'warm' ? 'badge-warm' : 'badge-cool'}`}>
              {temperature}
            </span>
            <button
              onClick={() => setTemperature(null)}
              className="text-xs text-white/40 hover:text-white/60"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Contact List */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {temperature ? `${temperature.charAt(0).toUpperCase() + temperature.slice(1)} Contacts` : 'All Contacts'}
          </h2>
          <span className="text-sm text-white/50">{contacts.length} shown</span>
        </div>

        {isLoading ? (
          <LoadingPage />
        ) : error ? (
          <div className="glass-card-sm p-4 border-red-500/30">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to load contacts. Is the API running?</span>
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-white/20" />
            <p className="mt-4 text-white/60">No contacts found</p>
            <p className="text-sm text-white/40">
              {search
                ? 'Try a different search term'
                : temperature
                  ? 'No contacts with this temperature'
                  : 'Start adding relationships'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
            {contacts.length >= 100 && (
              <p className="text-center text-sm text-white/40 py-4">
                Showing first 100 results. Use search to find more.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
