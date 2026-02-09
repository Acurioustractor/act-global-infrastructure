'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Apple,
  DollarSign,
  TrendingUp,
  Users,
  Mail,
  GitBranch,
  Trophy,
  Calendar,
  Loader2,
  BarChart3,
  Receipt,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabId = 'overview' | 'financials' | 'pipeline' | 'grants' | 'team'

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'financials', label: 'Financials' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'grants', label: 'Grants' },
  { id: 'team', label: 'Team' },
]

export default function HarvestPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const { data, isLoading } = useQuery({
    queryKey: ['harvest'],
    queryFn: () => fetch('/api/harvest').then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  const overview = data?.overview || {}
  const monthlyTrend = data?.monthlyTrend || []

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <Apple className="h-6 w-6 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">The Harvest</h1>
          <p className="text-sm text-zinc-400">Community hub &middot; Witta, Gubbi Gubbi Country</p>
        </div>
        {overview.healthScore != null && (
          <div className={cn(
            'ml-auto px-3 py-1 rounded-full text-sm font-medium',
            overview.healthScore >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
            overview.healthScore >= 30 ? 'bg-amber-500/20 text-amber-400' :
            'bg-red-500/20 text-red-400'
          )}>
            Health: {overview.healthScore}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab data={data} />}
      {activeTab === 'financials' && <FinancialsTab data={data} />}
      {activeTab === 'pipeline' && <PipelineTab data={data} />}
      {activeTab === 'grants' && <GrantsTab data={data} />}
      {activeTab === 'team' && <TeamTab data={data} />}
    </div>
  )
}

function OverviewTab({ data }: { data: any }) {
  const o = data?.overview || {}
  const monthlyTrend = data?.monthlyTrend || []
  const recentTx = (data?.transactions || []).slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={DollarSign} label="Total Spent" value={`$${(o.totalExpenses || 0).toLocaleString()}`} color="text-red-400" />
        <MetricCard icon={TrendingUp} label="Pipeline Value" value={`$${(o.pipelineValue || 0).toLocaleString()}`} color="text-purple-400" />
        <MetricCard icon={Trophy} label="Grant Funding" value={`$${(o.grantFunding || 0).toLocaleString()}`} color="text-amber-400" />
        <MetricCard icon={Users} label="Stakeholders" value={String(o.stakeholderCount || 0)} color="text-blue-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={DollarSign} label="Income" value={`$${(o.totalIncome || 0).toLocaleString()}`} color="text-emerald-400" />
        <MetricCard icon={CreditCard} label="Receivable" value={`$${(o.receivable || 0).toLocaleString()}`} color="text-blue-400" />
        <MetricCard icon={Mail} label="Emails" value={String(o.emailCount || 0)} color="text-pink-400" />
        <MetricCard icon={Receipt} label="Monthly Subs" value={`$${(o.subscriptionMonthly || 0).toLocaleString()}`} color="text-orange-400" />
      </div>

      {/* Monthly trend bars */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Monthly Activity (12 months)</h3>
        <div className="flex items-end gap-1 h-32">
          {monthlyTrend.map((m: any) => {
            const maxVal = Math.max(...monthlyTrend.map((t: any) => Math.max(t.income, t.expenses)), 1)
            const incH = (m.income / maxVal) * 100
            const expH = (m.expenses / maxVal) * 100
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '100px' }}>
                  <div className="w-[45%] bg-emerald-500/60 rounded-t" style={{ height: `${incH}%`, minHeight: m.income > 0 ? '2px' : 0 }} />
                  <div className="w-[45%] bg-red-500/60 rounded-t" style={{ height: `${expH}%`, minHeight: m.expenses > 0 ? '2px' : 0 }} />
                </div>
                <span className="text-[10px] text-zinc-600">{m.month.slice(5)}</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500/60 rounded" /> Income</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/60 rounded" /> Expenses</span>
        </div>
      </div>

      {/* Recent transactions */}
      {recentTx.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {recentTx.map((tx: any) => (
              <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-200">{tx.contactName || tx.description}</div>
                  <div className="text-xs text-zinc-500">{tx.date}</div>
                </div>
                <div className={cn('text-sm font-medium', tx.type === 'RECEIVE' ? 'text-emerald-400' : 'text-red-400')}>
                  {tx.type === 'RECEIVE' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FinancialsTab({ data }: { data: any }) {
  const transactions = data?.transactions || []
  const invoices = data?.invoices || []
  const topVendors = data?.topVendors || []
  const subscriptions = data?.subscriptions || []

  return (
    <div className="space-y-6">
      {/* Top vendors */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300">Top Vendors by Spend</h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {topVendors.map((v: any, i: number) => (
            <div key={v.name} className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                <span className="text-sm text-zinc-200">{v.name}</span>
              </div>
              <span className="text-sm font-medium text-zinc-300">${v.total.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions */}
      {subscriptions.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Active Subscriptions</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {subscriptions.map((s: any) => (
              <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-200">{s.vendor}</div>
                  <div className="text-xs text-zinc-500">{s.category} &middot; {s.cycle}</div>
                </div>
                <span className="text-sm font-medium text-zinc-300">${Math.abs(s.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Invoices</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-200">{inv.contact} {inv.number && `(${inv.number})`}</div>
                  <div className="text-xs text-zinc-500">{inv.type === 'ACCREC' ? 'Receivable' : 'Payable'} &middot; {inv.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-zinc-300">${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  {inv.due > 0 && <div className="text-xs text-amber-400">Due: ${inv.due.toFixed(2)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All transactions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300">All Transactions ({transactions.length})</h3>
        </div>
        <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
          {transactions.map((tx: any) => (
            <div key={tx.id} className="px-4 py-2 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm text-zinc-200 truncate">{tx.contactName || tx.description}</div>
                <div className="text-xs text-zinc-500">{tx.date}</div>
              </div>
              <div className={cn('text-sm font-medium flex-shrink-0', tx.type === 'RECEIVE' ? 'text-emerald-400' : 'text-red-400')}>
                {tx.type === 'RECEIVE' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PipelineTab({ data }: { data: any }) {
  const opportunities = data?.opportunities || []

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-purple-400" />
            GHL Opportunities ({opportunities.length})
          </h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {opportunities.map((opp: any) => (
            <div key={opp.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-200">{opp.name}</div>
                  <div className="text-xs text-zinc-500">{opp.pipeline} &middot; {opp.stage || opp.status}</div>
                </div>
                <div className="text-right">
                  {opp.value > 0 && (
                    <div className="text-sm font-medium text-zinc-300">${opp.value.toLocaleString()}</div>
                  )}
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    opp.status === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                    opp.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  )}>
                    {opp.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {opportunities.length === 0 && (
            <div className="p-6 text-center text-zinc-500 text-sm">No opportunities tagged for The Harvest yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

function GrantsTab({ data }: { data: any }) {
  const grants = data?.grants || []

  const statusColor: Record<string, string> = {
    approved: 'bg-emerald-500/20 text-emerald-400',
    submitted: 'bg-blue-500/20 text-blue-400',
    draft: 'bg-zinc-700 text-zinc-300',
    declined: 'bg-red-500/20 text-red-400',
    acquitted: 'bg-purple-500/20 text-purple-400',
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Grant Applications ({grants.length})
          </h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {grants.map((g: any) => (
            <div key={g.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-200">{g.name}</div>
                  <div className="text-xs text-zinc-500">
                    {g.provider && `${g.provider} · `}
                    {g.submitted && `Submitted ${g.submitted.slice(0, 10)}`}
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-300">
                      ${(g.outcome || g.requested || 0).toLocaleString()}
                    </div>
                    {g.outcome && g.outcome !== g.requested && (
                      <div className="text-xs text-zinc-500">Requested: ${g.requested.toLocaleString()}</div>
                    )}
                  </div>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded', statusColor[g.status] || 'bg-zinc-700 text-zinc-300')}>
                    {g.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {grants.length === 0 && (
            <div className="p-6 text-center text-zinc-500 text-sm">No grant applications for The Harvest yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamTab({ data }: { data: any }) {
  const team = data?.team || []
  const stakeholders = data?.stakeholders || []

  return (
    <div className="space-y-6">
      {/* Team / Resources */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            Team & Resources ({team.length})
          </h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {team.map((t: any) => (
            <div key={t.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-200">{t.name}</div>
                <div className="text-xs text-zinc-500">{t.role} &middot; {t.allocation}% allocation</div>
              </div>
              {t.annualCost > 0 && (
                <span className="text-sm text-zinc-400">${t.annualCost.toLocaleString()}/yr</span>
              )}
            </div>
          ))}
          {team.length === 0 && (
            <div className="p-6 text-center text-zinc-500 text-sm">No resource allocations recorded</div>
          )}
        </div>
      </div>

      {/* Stakeholders from GHL */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            Stakeholders ({stakeholders.length})
          </h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {stakeholders.map((s: any) => (
            <div key={s.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-200">{s.name}</div>
                  {s.company && <div className="text-xs text-zinc-500">{s.company}</div>}
                </div>
                {s.email && <span className="text-xs text-zinc-500">{s.email}</span>}
              </div>
              {s.tags?.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {s.tags.slice(0, 5).map((tag: string) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {stakeholders.length === 0 && (
            <div className="p-6 text-center text-zinc-500 text-sm">No stakeholders tagged with Harvest in GHL</div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, color }: {
  icon: typeof DollarSign
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <div className="text-xl font-semibold text-zinc-100">{value}</div>
    </div>
  )
}
