import Link from 'next/link'
import {
  DollarSign,
  Receipt,
  ScrollText,
  PieChart,
  GitBranch,
  Target,
  ExternalLink,
  Tag,
  Layers,
  ClipboardList,
  ShieldAlert,
  Bot,
} from 'lucide-react'

// Canonical /finance index page (2026-05-08 cleanup).
// Per the 4-surface model in CLAUDE.md: command-center owns *operate* tasks.
// This page is the front door to the keeper routes. Notion/scripts/Telegram
// links sit in the footer for cross-surface awareness.

const cards: Array<{
  title: string
  href: string
  description: string
  icon: typeof DollarSign
  accent: string
}> = [
  {
    title: 'Finance workbench',
    href: '/finance/workbench',
    description: 'One table for receipts, project codes, income/outgoing, and R&D review.',
    icon: ClipboardList,
    accent: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/30',
  },
  {
    title: 'Dext push audit',
    href: '/finance/dext-push-audit',
    description: 'Audit Dext-created Xero bills before Find & Match. Prevent duplicate spend.',
    icon: ShieldAlert,
    accent: 'from-red-500/10 to-red-500/5 border-red-500/30',
  },
  {
    title: 'Xero page copilot',
    href: '/finance/xero-page-copilot',
    description: 'Paste one Xero Reconcile page and get a safe row-by-row action queue.',
    icon: Bot,
    accent: 'from-cyan-500/10 to-amber-500/5 border-cyan-500/30',
  },
  {
    title: 'CEO money cockpit',
    href: '/finance/overview',
    description: 'Founder pay · receipts · 7 anchor rails. Open here first.',
    icon: DollarSign,
    accent: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30',
  },
  {
    title: 'Money alignment',
    href: '/finance/money-alignment',
    description: 'Money in / money out alignment cockpit. Audit reconciled vs not.',
    icon: GitBranch,
    accent: 'from-blue-500/10 to-blue-500/5 border-blue-500/30',
  },
  {
    title: 'Reconciliation',
    href: '/finance/reconciliation',
    description: '95.3% receipt match rate. Drill into unmatched, fix mismatches.',
    icon: Receipt,
    accent: 'from-amber-500/10 to-amber-500/5 border-amber-500/30',
  },
  {
    title: 'Tag a transaction',
    href: '/finance/tagger-v2',
    description: 'Assign project codes + R&D eligibility to Xero transactions.',
    icon: Tag,
    accent: 'from-purple-500/10 to-purple-500/5 border-purple-500/30',
  },
  {
    title: 'Receipts triage',
    href: '/finance/receipts-triage',
    description: 'Process inbound receipts, fix mismatches, push to Xero.',
    icon: ScrollText,
    accent: 'from-rose-500/10 to-rose-500/5 border-rose-500/30',
  },
  {
    title: 'Pipeline',
    href: '/finance/pipeline',
    description: 'Open opportunities by pile (Voice / Flow / Ground / Grants).',
    icon: PieChart,
    accent: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/30',
  },
  {
    title: 'Per-project drill',
    href: '/finance/projects',
    description: 'Budget vs actual per project code. Click a project to drill in.',
    icon: Layers,
    accent: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/30',
  },
]

const otherSurfaces: Array<{
  title: string
  description: string
  href: string
  external: boolean
  icon: typeof DollarSign
}> = [
  {
    title: 'Notion — ACT Money Framework',
    description: 'Read · plan · capture · decide. Daily glance + Today’s Pulse + year plan.',
    href: 'https://www.notion.so/357ebcf981cf8101bc12dd5eab9ebec5',
    external: true,
    icon: ScrollText,
  },
  {
    title: 'Notion — Money Dashboard',
    description: 'Trend charts: bank, runway, FY26 net, pile mix.',
    href: 'https://www.notion.so/807d55fb86f34edf8e92c82696ebd750',
    external: true,
    icon: PieChart,
  },
  {
    title: 'Notion — FY26-27 Plan',
    description: 'Year plan: cutover · founder pay · trust distributions · R&D · BAS.',
    href: 'https://www.notion.so/358ebcf981cf817884c5decc1d2a96a2',
    external: true,
    icon: Target,
  },
]

export default function FinanceIndexPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Finance</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Operate</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          This is the <em>operate</em> surface. Tag transactions, fix receipts, run reconciliation,
          drill into a project. For reading and planning use Notion. For pushes use Telegram.
        </p>
      </header>

      <section aria-labelledby="cards" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <h2 id="cards" className="sr-only">Operate</h2>
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`group relative rounded-xl border bg-gradient-to-br ${card.accent} p-5 transition hover:shadow-md`}
            >
              <Icon className="mb-3 h-5 w-5 text-foreground/80" />
              <h3 className="text-base font-semibold">{card.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
              <span className="mt-3 inline-block text-xs font-medium text-foreground/60 group-hover:text-foreground">
                Open →
              </span>
            </Link>
          )
        })}
      </section>

      <hr className="my-10 border-border" />

      <section aria-labelledby="other-surfaces" className="space-y-4">
        <h2 id="other-surfaces" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Other surfaces
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {otherSurfaces.map((s) => {
            const Icon = s.icon
            return (
              <a
                key={s.href}
                href={s.href}
                target={s.external ? '_blank' : undefined}
                rel={s.external ? 'noopener noreferrer' : undefined}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition hover:border-foreground/30"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-medium">
                    {s.title}
                    {s.external && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                </div>
              </a>
            )
          })}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Scripts &amp; Telegram</p>
        <p className="mt-1">
          For automation: <code className="rounded bg-muted px-1 py-0.5 text-xs">node scripts/populate-money-dashboards.mjs</code>{' '}
          (full Notion refresh), <code className="rounded bg-muted px-1 py-0.5 text-xs">node scripts/daily-money-briefing.mjs</code>{' '}
          (Telegram briefing), <code className="rounded bg-muted px-1 py-0.5 text-xs">node scripts/money-status.mjs</code>{' '}
          (alignment + audit). Full runbook in <code className="rounded bg-muted px-1 py-0.5 text-xs">thoughts/shared/handoffs/2026-05-08-money-brain-runbook.md</code>.
        </p>
        <p className="mt-2">
          Telegram bot: daily briefing 8am AEST, afternoon alert 1pm, Friday digest 3pm. On-demand commands: <code className="rounded bg-muted px-1 py-0.5 text-xs">/money-status</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">/standup</code>.
        </p>
      </section>
    </main>
  )
}
