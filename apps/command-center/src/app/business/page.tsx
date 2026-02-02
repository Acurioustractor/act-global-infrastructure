'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Building2,
  Users,
  Briefcase,
  Shield,
  Landmark,
  Banknote,
  UserCheck,
  FlaskConical,
  ListChecks,
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CircleDot,
  DollarSign,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  ChevronDown,
  Lightbulb,
  Link2,
  ArrowRight,
  Tractor,
  type LucideIcon,
} from 'lucide-react'
import {
  getBusinessOverview,
  askBusinessAdvisor,
  type BusinessData,
  type AdvisorResponse,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import { LoadingPage } from '@/components/ui/loading'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SectionDef {
  id: string
  title: string
  icon: LucideIcon
  color: string
  description: string
}

const SECTIONS: SectionDef[] = [
  { id: 'overview', title: 'Overview', icon: Building2, color: 'blue', description: 'Entity structure, current status, and setup roadmap progress' },
  { id: 'pty-ltd', title: 'Pty Ltd Registration', icon: Briefcase, color: 'emerald', description: 'ASIC process, directors, constitution, shareholders' },
  { id: 'trusts', title: 'Family Trusts', icon: Users, color: 'indigo', description: "Ben's trust, Nic's trust, trustee options, distributions" },
  { id: 'accountant', title: 'Accountant & Costs', icon: DollarSign, color: 'teal', description: 'Standard Ledger breakdown, setup, monthly, and annual costs' },
  { id: 'insurance', title: 'Insurance', icon: Shield, color: 'amber', description: 'PL $20M, workers comp, PI, product liability, D&O' },
  { id: 'banking', title: 'Banking', icon: Landmark, color: 'sky', description: 'NAB accounts, tax reserves, grant segregation' },
  { id: 'employment', title: 'Employment & Payroll', icon: UserCheck, color: 'violet', description: 'STP, super, family member rules' },
  { id: 'rd-tax', title: 'R&D Tax Incentive', icon: FlaskConical, color: 'purple', description: '43.5%, eligible activities, AusIndustry registration' },
  { id: 'migration', title: 'Migration Checklist', icon: ListChecks, color: 'orange', description: 'Sole trader to Pty Ltd transfer steps' },
  { id: 'compliance', title: 'Compliance Calendar', icon: CalendarClock, color: 'rose', description: 'BAS, ASIC, ACNC, insurance renewals' },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase()
  let classes = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium '
  if (lower === 'active' || lower === 'done' || lower === 'complete') {
    classes += 'bg-green-500/20 text-green-400 border border-green-500/30'
  } else if (lower === 'in progress' || lower === 'setup in progress') {
    classes += 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  } else if (lower === 'upcoming' || lower === 'pending' || lower === 'to create') {
    classes += 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
  } else if (lower === 'overdue') {
    classes += 'bg-red-500/20 text-red-400 border border-red-500/30'
  } else if (lower === 'dormant') {
    classes += 'bg-white/10 text-white/40 border border-white/10'
  } else {
    classes += 'bg-white/10 text-white/60 border border-white/10'
  }
  return <span className={classes}>{status}</span>
}

function formatCurrency(amount: number) {
  return `$${Math.abs(amount).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(dateString: string) {
  if (!dateString) return 'TBD'
  return new Date(dateString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-white/50">{description}</p>
    </div>
  )
}

function InfoRow({ label, value, badge }: { label: string; value?: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/5">
      <span className="text-sm text-white/60">{label}</span>
      {badge ? <StatusBadge status={badge} /> : <span className="text-sm font-medium text-white">{value}</span>}
    </div>
  )
}

function CostTable({ title, items, totalLabel }: {
  title: string
  items: Array<{ item: string; cost?: number; low?: number; high?: number; notes: string }>
  totalLabel?: string
}) {
  const total = items.reduce((s, c) => s + (c.cost ?? c.low ?? 0), 0)
  const totalHigh = items.reduce((s, c) => s + (c.cost ?? c.high ?? 0), 0)
  const isRange = total !== totalHigh

  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-1">
        {items.map((c) => (
          <div key={c.item} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
            <div>
              <span className="text-sm text-white">{c.item}</span>
              <span className="text-xs text-white/30 ml-2">{c.notes}</span>
            </div>
            <span className="text-sm font-semibold text-white/80 tabular-nums">
              {c.cost != null
                ? formatCurrency(c.cost)
                : c.low === c.high
                  ? formatCurrency(c.low!)
                  : `${formatCurrency(c.low!)}-${formatCurrency(c.high!)}`}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/10 border border-white/10">
          <span className="text-sm font-semibold text-white">{totalLabel || 'Total'}</span>
          <span className="text-sm font-bold text-white tabular-nums">
            {isRange ? `${formatCurrency(total)}-${formatCurrency(totalHigh)}` : formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  )
}

function SuggestionsList({ items }: { items: string[] }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
        Key Points
      </p>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-white/60">
            <span className="text-purple-400 mt-0.5 shrink-0">-</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ActionLinks({ links }: { links: Array<{ label: string; url: string }> }) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25 hover:border-purple-500/40 transition-colors"
        >
          <Link2 className="h-3 w-3" />
          {link.label}
        </a>
      ))}
    </div>
  )
}

function BlockedBy({ dependency }: { dependency: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock className="h-3 w-3" />
      Needs: {dependency}
    </span>
  )
}

function AskAdvisorButton({ sectionId, question }: { sectionId: string; question: string }) {
  const [answer, setAnswer] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: askBusinessAdvisor,
    onSuccess: (data) => setAnswer(data.answer),
  })

  return (
    <div>
      {!answer ? (
        <button
          onClick={() => mutation.mutate(question)}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-teal-500/15 text-teal-300 border border-teal-500/20 hover:bg-teal-500/25 hover:border-teal-500/40 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <MessageSquare className="h-3 w-3" />
          )}
          Ask Advisor
        </button>
      ) : (
        <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/15">
          <p className="text-xs font-semibold text-teal-400 mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Advisor Response
          </p>
          <div className="text-sm text-white/60 whitespace-pre-wrap leading-relaxed">
            {answer}
          </div>
        </div>
      )}
      {mutation.isError && (
        <p className="text-xs text-red-400 mt-2">Failed to get response. Is the API running?</p>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cost Data (reused from finance/business)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SETUP_COSTS = [
  { item: 'Pty Ltd Registration (ASIC)', cost: 576, notes: 'One-off' },
  { item: 'Accountant Setup (Pty Ltd)', cost: 500, notes: 'Standard Ledger estimate' },
  { item: 'Family Trust Deed (x2)', cost: 1000, notes: '~$500 each' },
  { item: 'Xero Setup + Migration', cost: 300, notes: 'Data migration from sole trader' },
]

const MONTHLY_COSTS = [
  { item: 'Bookkeeping (Standard Ledger)', low: 410, high: 670, notes: 'Or $75/mo DIY via Xero HQ' },
  { item: 'ASIC Annual Review', low: 25, high: 25, notes: '$310/yr prorated' },
  { item: 'Xero Subscription', low: 35, high: 35, notes: 'Growing plan' },
  { item: 'Payroll (per employee)', low: 57, high: 95, notes: 'STP compliant' },
]

const ANNUAL_COSTS = [
  { item: 'Company Tax Return', low: 1500, high: 2500, notes: 'Pty Ltd annual' },
  { item: 'R&D Tax Claim (flat fee)', low: 3000, high: 5000, notes: 'No percentage cut' },
  { item: 'Trust Tax Returns (x2)', low: 800, high: 1500, notes: '~$400-750 each' },
  { item: 'AKT ACNC/ASIC Compliance', low: 300, high: 500, notes: 'Annual statement + review' },
  { item: 'BAS Lodgements (quarterly)', low: 600, high: 1200, notes: '~$150-300 x4' },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section Content Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OverviewSection({ data }: { data: BusinessData }) {
  const roadmapDone = data.setupRoadmap.filter(s => s.status === 'done').length
  const roadmapTotal = data.setupRoadmap.length

  return (
    <div className="space-y-6">
      <SectionHeader title="Overview" description="Entity structure, current status, and setup roadmap progress" />

      {/* Entity Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 border-blue-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{data.entities.pty.name}</h3>
              <StatusBadge status={data.entities.pty.status} />
            </div>
          </div>
          <p className="text-sm text-white/50">Main operating entity for all revenue, employment, leases, and R&D.</p>
          {data.entities.pty.abn && <p className="text-xs text-white/30 mt-2">ABN: {data.entities.pty.abn}</p>}
        </div>

        <div className="glass-card p-5 border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white/40" />
            </div>
            <div>
              <h3 className="font-semibold text-white">A Kind Tractor LTD</h3>
              <StatusBadge status="Dormant" />
            </div>
          </div>
          <p className="text-sm text-white/50">NFP charity (ACNC registered). Parked — DGR deferred.</p>
          <p className="text-xs text-white/30 mt-2">ABN: 73 669 029 341 | ACN: 669 029 341</p>
        </div>

        <div className="glass-card p-5 border-amber-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Tractor className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Sole Trader</h3>
              <StatusBadge status="Winding Down" />
            </div>
          </div>
          <p className="text-sm text-white/50">Current operating entity. Everything migrates to new Pty Ltd.</p>
          <p className="text-xs text-white/30 mt-2">ABN: 21 591 780 066 | GST registered</p>
        </div>

        <div className="glass-card p-5 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Family Trusts (x2)</h3>
              <StatusBadge status="To Create" />
            </div>
          </div>
          <p className="text-sm text-white/50">Tax-efficient distributions to Ben + Nic families.</p>
        </div>
      </div>

      {/* Setup Progress */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-purple-400" />
            Setup Progress
          </h3>
          <span className="text-sm text-white/40">{roadmapDone}/{roadmapTotal} complete</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-purple-500 transition-all"
            style={{ width: `${(roadmapDone / roadmapTotal) * 100}%` }}
          />
        </div>
        <div className="space-y-1">
          {data.setupRoadmap.map((item) => (
            <div key={item.step} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5">
              {item.status === 'done' ? (
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              ) : item.status === 'in progress' ? (
                <CircleDot className="h-4 w-4 text-blue-400 shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-white/30 shrink-0" />
              )}
              <span className={cn('text-sm', item.status === 'done' ? 'text-white/50 line-through' : 'text-white')}>
                {item.step}
              </span>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Money Flow */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          Money Flow
        </h3>
        <div className="flex items-center justify-center gap-3 py-4 flex-wrap mb-4">
          <div className="glass-card px-5 py-4 text-center border-emerald-500/20">
            <div className="font-bold text-emerald-400">Revenue</div>
            <div className="text-xs text-white/40 mt-1">Clients & grants</div>
          </div>
          <ArrowRight className="h-5 w-5 text-white/20" />
          <div className="glass-card px-6 py-5 text-center border-blue-500/30">
            <div className="font-bold text-blue-400">ACT Pty Ltd</div>
          </div>
          <ArrowRight className="h-5 w-5 text-white/20" />
          <div className="flex flex-col gap-2">
            <div className="glass-card px-4 py-2 text-center border-emerald-500/20">
              <div className="text-sm font-semibold text-emerald-400">BK Trust</div>
            </div>
            <div className="glass-card px-4 py-2 text-center border-emerald-500/20">
              <div className="text-sm font-semibold text-emerald-400">NM Trust</div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {data.moneyFlow.allocations.map((alloc) => (
            <div key={alloc.name} className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-white/5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  alloc.type === 'founder' ? 'bg-emerald-400' :
                  alloc.type === 'operations' ? 'bg-orange-400' :
                  alloc.type === 'projects' ? 'bg-purple-400' :
                  'bg-blue-400'
                )} />
                <span className="text-sm font-medium text-white">{alloc.name}</span>
              </div>
              <span className="text-sm text-white/50">{alloc.notes}</span>
            </div>
          ))}
        </div>
      </div>

      <AskAdvisorButton sectionId="overview" question="Give me a summary of where ACT's business setup stands right now. What are the most important next steps?" />
    </div>
  )
}

function PtyLtdSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Pty Ltd Registration" description="Register A Curious Tractor Pty Ltd with ASIC as the main operating entity." />

      <div className="glass-card p-6">
        <div className="space-y-2 mb-5">
          <InfoRow label="Company Name" value="A Curious Tractor Pty Ltd" />
          <InfoRow label="Entity Type" value="Proprietary Limited" />
          <InfoRow label="Directors" value="Ben Knight + Nic Marchesi" />
          <InfoRow label="Shareholders" value="Family Trusts (once created)" />
          <InfoRow label="Constitution" value="Replaceable rules (ASIC default) or custom" />
          <InfoRow label="Registered Office" value="TBD (accountant or home address)" />
          <InfoRow label="Status" badge="To Create" />
        </div>

        <SuggestionsList items={[
          'Let accountant handle registration — they submit Form 201 correctly first time',
          'Directors: Ben + Nic (minimum 1 required for Pty Ltd)',
          'Shareholders: Family trusts (once created) — accountant to advise on structure',
          'Company secretary: Optional but recommended — Ben or Nic',
          'Replaceable rules are free; custom constitution costs $500-1,500',
          'ASIC registration fee: $576 (one-off)',
        ]} />

        <ActionLinks links={[
          { label: 'ASIC — Register a Company', url: 'https://asic.gov.au/for-business/registering-a-company/' },
          { label: 'ASIC Name Check', url: 'https://connectonline.asic.gov.au/RegistrySearch/faces/landing/SearchRegisters.jspx' },
        ]} />

        <div className="flex items-center gap-3 mb-5">
          <BlockedBy dependency="Engage accountant" />
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="h-3 w-3" />
            $576 (ASIC fee)
          </span>
        </div>

        <AskAdvisorButton sectionId="pty-ltd" question="Walk me through the ASIC Pty Ltd registration process step by step. What decisions do we need to make before registering? Directors, shareholders, constitution, registered office." />
      </div>

      {/* Post-Registration Steps */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4">After Registration</h3>
        <div className="space-y-2">
          <InfoRow label="Get new ABN" value="Free — apply via ABR" />
          <InfoRow label="Register for GST" value="Voluntary from day one (recommended)" />
          <InfoRow label="Director IDs" value="Each director needs a Director Identification Number" />
          <InfoRow label="PAYG Withholding" value="Register when ready to pay wages" />
        </div>
        <ActionLinks links={[
          { label: 'ABR — Apply for ABN', url: 'https://www.abr.gov.au/business-super-funds-702charities/applying-abn' },
          { label: 'ATO — Register for GST', url: 'https://www.ato.gov.au/Business/GST/Registering-for-GST/' },
          { label: 'ABRS — Director ID', url: 'https://www.abrs.gov.au/director-identification-number' },
        ]} />
      </div>
    </div>
  )
}

function TrustsSection({ data }: { data: BusinessData }) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Family Trusts" description="Two discretionary family trusts for tax-efficient distributions from the Pty Ltd." />

      {data.trusts.map((trust) => (
        <div key={trust.name} className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              {trust.name}
            </h3>
            <StatusBadge status={trust.status} />
          </div>
          <div className="space-y-2 mb-4">
            <InfoRow label="Trustee" value={trust.trustee} />
            <InfoRow label="Shareholding" value={trust.shareholding} />
            <InfoRow label="Role" value={trust.role} />
            <InfoRow label="Beneficiaries" value={trust.beneficiaries.join(', ')} />
          </div>
        </div>
      ))}

      <div className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4">How Distributions Work</h3>
        <SuggestionsList items={[
          'Pty Ltd earns revenue and pays company tax (25% base rate for small business)',
          'After-tax profits distributed as dividends to trust shareholders',
          'Trusts distribute to beneficiaries (family members) at their marginal tax rates',
          'Franking credits from company tax reduce double taxation',
          'Individual vs corporate trustee — accountant to advise (corporate provides better liability protection)',
          'Each trust needs: TFN, ABN, bank account',
          'Trust deeds cost ~$500 each',
          'Beneficiaries must do legitimate work at market rates (ATO scrutiny)',
        ]} />

        <div className="flex items-center gap-3 mb-5">
          <BlockedBy dependency="Engage accountant" />
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="h-3 w-3" />
            ~$1,000 total ($500 each)
          </span>
        </div>

        <AskAdvisorButton sectionId="trusts" question="Explain the family trust setup process. Individual vs corporate trustee — pros and cons for our situation. How do trust distributions work with the Pty Ltd dividend?" />
      </div>
    </div>
  )
}

function AccountantSection() {
  const setupTotal = SETUP_COSTS.reduce((s, c) => s + c.cost, 0)
  const monthlyLow = MONTHLY_COSTS.reduce((s, c) => s + c.low, 0)
  const monthlyHigh = MONTHLY_COSTS.reduce((s, c) => s + c.high, 0)
  const annualLow = ANNUAL_COSTS.reduce((s, c) => s + c.low, 0)
  const annualHigh = ANNUAL_COSTS.reduce((s, c) => s + c.high, 0)
  const yearOneLow = setupTotal + (monthlyLow * 12) + annualLow
  const yearOneHigh = setupTotal + (monthlyHigh * 12) + annualHigh

  return (
    <div className="space-y-6">
      <SectionHeader title="Accountant & Costs" description="Standard Ledger — startup-native, cloud-first, R&D tax capable." />

      {/* Year 1 Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center">
          <p className="text-2xl font-bold text-teal-400 tabular-nums">{formatCurrency(setupTotal)}</p>
          <p className="text-xs text-white/40 mt-1">Setup (one-off)</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-2xl font-bold text-orange-400 tabular-nums">
            {formatCurrency(monthlyLow)}-{formatCurrency(monthlyHigh)}
          </p>
          <p className="text-xs text-white/40 mt-1">Monthly ongoing</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-2xl font-bold text-violet-400 tabular-nums">
            {formatCurrency(yearOneLow)}-{formatCurrency(yearOneHigh)}
          </p>
          <p className="text-xs text-white/40 mt-1">Year 1 total estimate</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <CostTable title="Setup Costs" items={SETUP_COSTS} totalLabel="Total Setup" />
        <CostTable title="Monthly Costs" items={MONTHLY_COSTS} totalLabel="Total Monthly" />
        <CostTable title="Annual Costs" items={ANNUAL_COSTS} totalLabel="Total Annual" />

        {/* Key Highlights */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-xs font-semibold text-green-400 mb-1">R&D Flat Fee</p>
            <p className="text-xs text-white/50">No percentage cut on R&D claims — fixed price</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs font-semibold text-blue-400 mb-1">No Success, No Fee</p>
            <p className="text-xs text-white/50">R&D claim only charged if successful</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs font-semibold text-amber-400 mb-1">DIY Option</p>
            <p className="text-xs text-white/50">$75/mo bookkeeping via Xero HQ self-service</p>
          </div>
        </div>
      </div>

      <ActionLinks links={[
        { label: 'Standard Ledger — Book a Call', url: 'https://www.standardledger.co/book-a-call' },
        { label: 'Azure Group (R&D specialist)', url: 'https://www.azuregroup.com.au/' },
        { label: 'William Buck', url: 'https://williambuck.com/' },
      ]} />

      <AskAdvisorButton sectionId="accountant" question="Compare Standard Ledger vs Azure Group vs William Buck for our needs: Pty Ltd + 2 family trusts + R&D tax claims (software + physical) + Xero + dormant ACNC charity compliance." />
    </div>
  )
}

function InsuranceSection() {
  const insuranceItems = [
    { type: 'Public Liability', amount: '$20M', required: true, notes: 'Required for Harvest lease (Clause 9)', estimate: '$1,500-3,000/yr' },
    { type: 'Workers Compensation', amount: 'Statutory', required: true, notes: 'Required once employing anyone (QLD WorkCover)', estimate: '$500-2,000/yr' },
    { type: 'Professional Indemnity', amount: '$2-5M', required: false, notes: 'Recommended for Innovation Studio consulting', estimate: '$800-2,000/yr' },
    { type: 'Product Liability', amount: '$10M', required: false, notes: 'Goods marketplace + Harvest food service', estimate: '$500-1,500/yr' },
    { type: 'D&O Insurance', amount: 'Varies', required: false, notes: 'Consider for AKT directors (Nic, Ben, Jessica)', estimate: '$500-1,500/yr' },
  ]

  return (
    <div className="space-y-6">
      <SectionHeader title="Insurance" description="Required and recommended insurance policies for ACT operations." />

      <div className="glass-card p-6">
        <div className="overflow-hidden rounded-xl border border-white/10 mb-5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Policy</th>
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Coverage</th>
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Required</th>
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {insuranceItems.map((item) => (
                <tr key={item.type} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-sm font-medium text-white">{item.type}</span>
                    <p className="text-xs text-white/40">{item.notes}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-white/60">{item.amount}</td>
                  <td className="px-5 py-3">
                    {item.required ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/15 text-red-400">Required</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">Recommended</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-white/60 tabular-nums">{item.estimate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SuggestionsList items={[
          'Get quotes from a commercial insurance broker — they compare across providers',
          'BizCover or CGU for quick online quotes as a starting point',
          'Public liability is non-negotiable — Harvest lease requires $20M',
          'Workers comp is mandatory in QLD once employing anyone',
          'Bundle policies for discounts',
          'Review annually — adjust as operations scale',
        ]} />

        <ActionLinks links={[
          { label: 'BizCover — Quick Quote', url: 'https://www.bizcover.com.au/' },
          { label: 'QLD WorkCover', url: 'https://www.worksafe.qld.gov.au/insurance' },
        ]} />

        <div className="mb-5">
          <BlockedBy dependency="Register with ASIC" />
        </div>

        <AskAdvisorButton sectionId="insurance" question="What insurance policies do we need and roughly what will they cost? We need $20M public liability for The Harvest lease, plus workers comp, professional indemnity, and product liability." />
      </div>
    </div>
  )
}

function BankingSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Banking" description="NAB business accounts, tax reserves, and grant fund segregation." />

      <div className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4">Recommended Account Structure</h3>
        <div className="space-y-2 mb-5">
          <InfoRow label="Operating Account" value="NAB Business Everyday — day-to-day expenses" />
          <InfoRow label="Tax Reserve Account" value="NAB iSaver — BAS/GST/tax provisions" />
          <InfoRow label="Grant Funds Account" value="Separate account — acquittal tracking" />
          <InfoRow label="Trust Accounts (x2)" value="One per family trust for distributions" />
        </div>

        <SuggestionsList items={[
          'NAB is current bank for sole trader — easiest to stay for continuity',
          'Set up PayID and direct debit for client payments',
          'Tax reserve: Transfer 30% of revenue to tax account each BAS period',
          'Grant funds must be segregated — funders may require separate reporting',
          'Connect all accounts to Xero bank feed immediately',
          'Need: ACN, ABN, company constitution, director IDs to open',
        ]} />

        <ActionLinks links={[
          { label: 'NAB Business Accounts', url: 'https://www.nab.com.au/business/accounts' },
        ]} />

        <div className="mb-5">
          <BlockedBy dependency="Get new ABN" />
        </div>

        <AskAdvisorButton sectionId="banking" question="What documents do we need to open a NAB business account for a new Pty Ltd? Should we set up separate accounts for tax reserves and grant funds?" />
      </div>
    </div>
  )
}

function EmploymentSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Employment & Payroll" description="STP compliance, superannuation, and family member employment rules." />

      <div className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4">Employment Setup</h3>
        <div className="space-y-2 mb-5">
          <InfoRow label="Single Touch Payroll (STP)" value="Mandatory — set up via Xero" />
          <InfoRow label="Super Guarantee" value="12% (from 1 Jul 2025)" />
          <InfoRow label="Default Super Fund" value="Employee choice or nominated fund" />
          <InfoRow label="PAYG Withholding" value="Register with ATO" />
          <InfoRow label="Fair Work" value="National Employment Standards apply" />
        </div>

        <SuggestionsList items={[
          'Register as employer via ATO Business Portal — free',
          'STP is mandatory for all employers regardless of size',
          'Xero handles STP reporting automatically with payroll module',
          'Super: 12% of ordinary time earnings from 1 Jul 2025',
          'Family member employment: must be legitimate work at market rates',
          'Create simple timesheet system for family members (ATO scrutiny protection)',
          'Define clear roles, position descriptions, and pay rates for all family members',
          'Keep records of hours worked and tasks performed',
        ]} />

        <h3 className="font-semibold text-white mb-4 mt-6">Family Member Employment (ATO Rules)</h3>
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 mb-5">
          <p className="text-sm text-white/60 leading-relaxed">
            The ATO closely scrutinizes payments to family members. All employment must be genuine —
            real work, real hours, market-rate pay. Keep timesheets, position descriptions, and evidence
            of work performed. Distributions via trusts must also reflect genuine entitlements.
          </p>
        </div>

        <ActionLinks links={[
          { label: 'ATO — Employer Registration', url: 'https://www.ato.gov.au/Business/Registration/Work-out-your-registration/' },
          { label: 'Fair Work — NES', url: 'https://www.fairwork.gov.au/employment-conditions/national-employment-standards' },
        ]} />

        <div className="mb-5">
          <BlockedBy dependency="Register with ASIC" />
        </div>

        <AskAdvisorButton sectionId="employment" question="What do we need for employer registration? Walk through STP setup, super obligations, and what to know about employing family members (ATO compliance)." />
      </div>
    </div>
  )
}

function RdTaxSection({ data }: { data: BusinessData }) {
  return (
    <div className="space-y-6">
      <SectionHeader title="R&D Tax Incentive" description="43.5% refundable offset for eligible R&D activities." />

      <div className="glass-card p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{data.rdTaxCredit.refundRate}</p>
            <p className="text-xs text-white/40 mt-1">Refund Rate</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">${(data.rdTaxCredit.minSpend / 1000).toFixed(0)}K</p>
            <p className="text-xs text-white/40 mt-1">Min Spend Threshold</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-white">{data.rdTaxCredit.ausIndustryRegistered ? 'Yes' : 'No'}</p>
            <p className="text-xs text-white/40 mt-1">AusIndustry Registered</p>
          </div>
        </div>

        <h3 className="font-semibold text-white mb-3">Eligible Activities</h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {data.rdTaxCredit.eligibleActivities.map((activity) => (
            <span key={activity} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
              {activity}
            </span>
          ))}
        </div>

        <SuggestionsList items={[
          "Don't register until after first FY with the Pty Ltd",
          'Start documenting R&D activities NOW — git commits, time logs, hypotheses',
          '43.5% refundable offset for companies with turnover < $20M',
          'Both software and physical R&D (manufacturing, gardens) are eligible',
          'Standard Ledger offers flat-fee R&D claims ($3K-5K)',
          'New AusIndustry application form mandatory from FY25 onwards',
          'World Tour 2026: international field testing may be claimable',
          'Keep experiment logs: hypothesis, method, results, what was learned',
        ]} />

        <ActionLinks links={[
          { label: 'AusIndustry R&D Tax Incentive', url: 'https://business.gov.au/grants-and-programs/research-and-development-tax-incentive' },
        ]} />

        <div className="mb-5">
          <BlockedBy dependency="Register with ASIC" />
        </div>

        <AskAdvisorButton sectionId="rd-tax" question="How do we register for the R&D Tax Incentive? What documentation should we start collecting now? Can we claim international R&D activities from the World Tour?" />
      </div>
    </div>
  )
}

function MigrationSection() {
  const migrationSteps = [
    { category: 'Legal & Admin', items: [
      { task: 'New Harvest lease in Pty Ltd name', notes: 'Talk to philanthropist', done: false },
      { task: 'Farm lease: Nic personal to Pty Ltd', notes: "Arm's length, market rate for ATO", done: false },
      { task: 'Assign IP to Pty Ltd', notes: 'EL, JH, ALMA, LCAA, Goods codebases + brands', done: false },
      { task: 'Update contractor agreements', notes: 'New entity details on all contracts', done: false },
      { task: 'Consider trademark registration', notes: 'Empathy Ledger, JusticeHub, ALMA', done: false },
    ]},
    { category: 'Financial', items: [
      { task: 'Notify grant funders of entity change', notes: 'All active grants', done: false },
      { task: 'Transfer bank accounts or open new', notes: 'NAB business accounts', done: false },
      { task: 'Set up Xero for new entity', notes: 'New org recommended — clean start', done: false },
      { task: 'Transfer Dext integration', notes: 'Receipt scanning', done: false },
      { task: 'Update invoice templates', notes: 'New ABN, entity name, bank details', done: false },
    ]},
    { category: 'Subscriptions to Transfer', items: [
      { task: 'Supabase', notes: 'Database hosting', done: false },
      { task: 'Vercel', notes: 'Frontend hosting', done: false },
      { task: 'GoHighLevel', notes: 'CRM', done: false },
      { task: 'Xero', notes: 'Accounting', done: false },
      { task: 'Notion', notes: 'Wiki/docs', done: false },
      { task: 'Adobe Creative Suite', notes: 'Design tools', done: false },
      { task: 'OpenAI + Anthropic', notes: 'AI APIs', done: false },
      { task: 'GitHub', notes: 'Code hosting', done: false },
      { task: 'Dext', notes: 'Receipt scanning', done: false },
    ]},
  ]

  return (
    <div className="space-y-6">
      <SectionHeader title="Migration Checklist" description="Transfer everything from sole trader to the new Pty Ltd." />

      {migrationSteps.map((group) => (
        <div key={group.category} className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">{group.category}</h3>
          <div className="space-y-1">
            {group.items.map((item) => (
              <div key={item.task} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/5">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded border border-white/20 shrink-0" />
                )}
                <div className="flex-1">
                  <span className="text-sm text-white">{item.task}</span>
                  <span className="text-xs text-white/30 ml-2">{item.notes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mb-5">
        <BlockedBy dependency="Set up Xero for new entity" />
      </div>

      <AskAdvisorButton sectionId="migration" question="Create a detailed migration checklist for transferring from sole trader to Pty Ltd. Include subscriptions, contracts, grants, IP, leases, and banking." />
    </div>
  )
}

function ComplianceSection({ data }: { data: BusinessData }) {
  function getComplianceStatus(item: BusinessData['compliance'][0]): string {
    if (item.status === 'done') return 'done'
    if (!item.dueDate) return item.status
    const due = new Date(item.dueDate)
    const now = new Date()
    if (due < now) return 'overdue'
    const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil <= 14) return 'upcoming'
    return item.status
  }

  const complianceItems = [
    { name: 'BAS Lodgement (Quarterly)', frequency: 'Quarterly', entity: 'Pty Ltd', notes: '28th of month after quarter end' },
    { name: 'ASIC Annual Review', frequency: 'Annual', entity: 'Pty Ltd', notes: '$310/yr — confirm company details' },
    { name: 'ACNC Annual Information Statement', frequency: 'Annual', entity: 'AKT LTD', notes: 'Even if dormant' },
    { name: 'Company Tax Return', frequency: 'Annual', entity: 'Pty Ltd', notes: 'Due 31 Oct (or later via tax agent)' },
    { name: 'Trust Tax Returns (x2)', frequency: 'Annual', entity: 'Family Trusts', notes: 'Due 31 Oct (or later via tax agent)' },
    { name: 'STP Finalisation', frequency: 'Annual', entity: 'Pty Ltd', notes: 'Due 14 Jul — finalise payroll year' },
    { name: 'Superannuation Payments', frequency: 'Quarterly', entity: 'Pty Ltd', notes: '28th after quarter end' },
    { name: 'Insurance Renewal', frequency: 'Annual', entity: 'Pty Ltd', notes: 'PL, WC, PI — check coverage levels' },
    { name: 'Workers Comp Declaration', frequency: 'Annual', entity: 'Pty Ltd', notes: 'QLD WorkCover wages declaration' },
    { name: 'R&D Tax Registration', frequency: 'Annual', entity: 'Pty Ltd', notes: 'Within 10 months of FY end' },
  ]

  return (
    <div className="space-y-6">
      <SectionHeader title="Compliance Calendar" description="All regulatory obligations across entities." />

      {/* Live compliance from API */}
      {data.compliance.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Current Obligations</h3>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Item</th>
                  <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Due</th>
                  <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Owner</th>
                </tr>
              </thead>
              <tbody>
                {data.compliance.map((item) => {
                  const status = getComplianceStatus(item)
                  return (
                    <tr key={item.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {status === 'done' ? <CheckCircle2 className="h-4 w-4 text-green-400" /> :
                           status === 'overdue' ? <AlertTriangle className="h-4 w-4 text-red-400" /> :
                           <Clock className="h-4 w-4 text-indigo-400" />}
                          <span className="text-sm font-medium text-white">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-white/60">{formatDate(item.dueDate)}</td>
                      <td className="px-5 py-3"><StatusBadge status={status} /></td>
                      <td className="px-5 py-3 text-sm text-white/60">{item.owner}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Calendar Reference */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4">Full Compliance Calendar (All Entities)</h3>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Obligation</th>
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Frequency</th>
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Entity</th>
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {complianceItems.map((item) => (
                <tr key={item.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-white">{item.name}</td>
                  <td className="px-5 py-3 text-sm text-white/60">{item.frequency}</td>
                  <td className="px-5 py-3 text-sm text-white/60">{item.entity}</td>
                  <td className="px-5 py-3 text-sm text-white/40">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AskAdvisorButton sectionId="compliance" question="What are all the compliance obligations for a Pty Ltd with 2 family trusts, a dormant ACNC charity, and employees? Give me a complete annual calendar." />
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function BusinessWikiPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  // Sync hash to state
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash && SECTIONS.some(s => s.id === hash)) {
      setActiveSection(hash)
    }

    const onHashChange = () => {
      const h = window.location.hash.replace('#', '')
      if (h && SECTIONS.some(s => s.id === h)) {
        setActiveSection(h)
      } else if (!h) {
        setActiveSection(null)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (sectionId: string | null) => {
    setActiveSection(sectionId)
    if (sectionId) {
      window.history.pushState(null, '', `#${sectionId}`)
    } else {
      window.history.pushState(null, '', window.location.pathname)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['business', 'overview'],
    queryFn: getBusinessOverview,
  })

  if (isLoading) return <LoadingPage />

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
    teal: 'bg-teal-500/20 text-teal-400',
    amber: 'bg-amber-500/20 text-amber-400',
    sky: 'bg-sky-500/20 text-sky-400',
    violet: 'bg-violet-500/20 text-violet-400',
    purple: 'bg-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/20 text-orange-400',
    rose: 'bg-rose-500/20 text-rose-400',
  }

  const borderColorMap: Record<string, string> = {
    blue: 'hover:border-blue-500/30',
    emerald: 'hover:border-emerald-500/30',
    indigo: 'hover:border-indigo-500/30',
    teal: 'hover:border-teal-500/30',
    amber: 'hover:border-amber-500/30',
    sky: 'hover:border-sky-500/30',
    violet: 'hover:border-violet-500/30',
    purple: 'hover:border-purple-500/30',
    orange: 'hover:border-orange-500/30',
    rose: 'hover:border-rose-500/30',
  }

  const sidebarActiveMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-300',
    emerald: 'bg-emerald-500/20 text-emerald-300',
    indigo: 'bg-indigo-500/20 text-indigo-300',
    teal: 'bg-teal-500/20 text-teal-300',
    amber: 'bg-amber-500/20 text-amber-300',
    sky: 'bg-sky-500/20 text-sky-300',
    violet: 'bg-violet-500/20 text-violet-300',
    purple: 'bg-purple-500/20 text-purple-300',
    orange: 'bg-orange-500/20 text-orange-300',
    rose: 'bg-rose-500/20 text-rose-300',
  }

  function renderSection() {
    if (!data) return null
    switch (activeSection) {
      case 'overview': return <OverviewSection data={data} />
      case 'pty-ltd': return <PtyLtdSection />
      case 'trusts': return <TrustsSection data={data} />
      case 'accountant': return <AccountantSection />
      case 'insurance': return <InsuranceSection />
      case 'banking': return <BankingSection />
      case 'employment': return <EmploymentSection />
      case 'rd-tax': return <RdTaxSection data={data} />
      case 'migration': return <MigrationSection />
      case 'compliance': return <ComplianceSection data={data} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/10 bg-black/20 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Business Setup</h1>
              <p className="text-xs text-white/50">Pty Ltd, trusts, compliance</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => navigate(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                    isActive
                      ? sidebarActiveMap[section.color]
                      : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">{section.title}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-white/5">
              <p className="text-lg font-bold text-white">{SECTIONS.length}</p>
              <p className="text-xs text-white/50">Sections</p>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <p className="text-lg font-bold text-white">4</p>
              <p className="text-xs text-white/50">Entities</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {!activeSection ? (
          /* Landing Page */
          <div className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                  <Briefcase className="h-10 w-10 text-blue-400" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">Business Setup</h1>
                <p className="text-lg text-white/60">
                  Everything needed to establish ACT as a registered Pty Ltd with family trusts,
                  insurance, banking, and compliance.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {SECTIONS.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => navigate(section.id)}
                      className={cn(
                        'glass-card p-6 text-left transition-all group',
                        borderColorMap[section.color]
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorMap[section.color])}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold text-white group-hover:text-white/90 transition-colors">
                          {section.title}
                        </h3>
                      </div>
                      <p className="text-sm text-white/50">{section.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Section Content */
          <div className="p-8">
            <div className="max-w-3xl mx-auto">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 mb-6 text-sm">
                <button
                  onClick={() => navigate(null)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  Business Setup
                </button>
                <span className="text-white/30">/</span>
                <span className="text-white">{SECTIONS.find(s => s.id === activeSection)?.title}</span>
              </div>

              {renderSection()}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
