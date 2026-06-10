import {
  Sun,
  Calendar,
  Users,
  Layers,
  Tags,
  FolderKanban,
  Scale,
  Heart,
  ShoppingBag,
  Wheat,
  Apple,
  Palette,
  Brain,
  DollarSign,
  BarChart3,
  Landmark,
  Calculator,
  Handshake,
  MessageSquare,
  Settings,
  BarChart,
  KanbanSquare,
  TrendingUp,
  ClipboardCheck,
  Compass,
  Sparkles,
  Target,
  Receipt,
  Bot,
  Activity,
  Search,
  Building2,
  AlertOctagon,
  CalendarClock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// --- Types ---

export interface SidebarNavItem {
  href: string
  label: string
  icon: LucideIcon
  color?: string
  bg?: string
  children?: SidebarNavItem[]
  /** Render as a non-clickable section header inside a children list. */
  divider?: boolean
}

export interface SidebarNavGroup {
  id: string
  label: string
  items: SidebarNavItem[]
  defaultExpanded?: boolean
}

// --- Navigation Structure ---

export const navStructure: SidebarNavGroup[] = [
  {
    id: 'dashboard',
    label: '',
    items: [
      { href: '/company', label: 'Company', icon: Sparkles, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
      { href: '/api/field/surface?name=whole', label: 'Whole Picture', icon: Compass, color: 'text-sky-400', bg: 'bg-sky-500/20' },
      { href: '/eofy', label: 'EOFY Cutover', icon: CalendarClock, color: 'text-red-400', bg: 'bg-red-500/20' },
      { href: '/today', label: 'Today', icon: Sun },
      { href: '/strategy', label: 'Strategy', icon: Compass, color: 'text-amber-400', bg: 'bg-amber-500/20' },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
    ],
    defaultExpanded: true,
  },
  {
    id: 'relationships',
    label: 'Relationships',
    items: [
      { href: '/supporters', label: 'Supporters', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
      { href: '/pipeline', label: 'Pipeline', icon: Handshake, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
      { href: '/analytics', label: 'Ecosystem Analytics', icon: BarChart3, color: 'text-violet-400', bg: 'bg-violet-500/20' },
      { href: '/people', label: 'People', icon: Users },
    ],
    defaultExpanded: true,
  },
  {
    id: 'projects',
    label: 'Projects',
    items: [
      {
        href: '/projects',
        label: 'All Projects',
        icon: FolderKanban,
        children: [
          { href: '/projects/justicehub', label: 'JusticeHub', icon: Scale, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { href: '/projects/empathy-ledger', label: 'Empathy Ledger', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
          { href: '/projects/goods', label: 'Goods', icon: ShoppingBag, color: 'text-orange-400', bg: 'bg-orange-500/20' },
          { href: '/projects/the-farm', label: 'The Farm', icon: Wheat, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { href: '/projects/the-harvest', label: 'The Harvest', icon: Apple, color: 'text-green-400', bg: 'bg-green-500/20' },
          { href: '/projects/the-studio', label: 'The Studio', icon: Palette, color: 'text-purple-400', bg: 'bg-purple-500/20' },
        ],
      },
    ],
    defaultExpanded: false,
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      {
        href: '/finance',
        label: 'Finance',
        icon: DollarSign,
        children: [
          // 2026-05-08 cleanup — retired: tagger, tagger-bulk, pipeline-viz, pipeline-kanban, project-plan, self-reliance, vendor-rules-suggest.
          // 2026-05-16 cleanup — retired: revenue-planning, review (see thoughts/shared/handoffs/2026-05-16-money-audit/).
          // 2026-05-29 P4 consolidation (finance-cockpit-consolidation plan) — collapsed to
          // State · Operate · Drill · Reports. The operate work-tools (command, money-alignment,
          // workbench, tagger-v2, receipts-triage, reconciliation, ai-suggestions, dext-push-audit,
          // actions) are NOT in the sidebar anymore — they're reached via the Operate surface's
          // tab-bar (/finance/xero-page-copilot). They stay LIVE (no _archived move — the tab-bar
          // links them; the 2026-05-21/05-27 reviews showed naive archiving 404s live pages).
          // command + money-alignment are redirect stubs → /finance/overview (P2).

          // ALIGN — the Xero mirror: tag-alignment + per-project in/out + flags (mirror plan 2026-05-29)
          { href: '/finance/mirror', label: 'Align · Mirror', icon: Tags, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },

          // STATE — where are we right now (trust meters + money state)
          { href: '#state', label: 'State', icon: BarChart3, divider: true },
          { href: '/finance/overview', label: 'State · Cockpit', icon: Layers, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { href: '/finance/project-money', label: 'State · Project Money', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { href: '/finance/close', label: 'State · Close pack', icon: ClipboardCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },

          // OPERATE — get to 100% (full toolset lives in the Operate tab-bar)
          { href: '#operate', label: 'Operate', icon: ClipboardCheck, divider: true },
          { href: '/finance/xero-page-copilot', label: 'Operate · Reconcile', icon: Bot, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },

          // DRILL — per-project P&L + cleanup/exceptions + browse
          { href: '#drill', label: 'Drill', icon: Search, divider: true },
          { href: '/finance/projects', label: 'Projects P&L', icon: BarChart3, color: 'text-green-400', bg: 'bg-green-500/20' },
          { href: '/finance/audit', label: 'Spend Audit', icon: AlertOctagon, color: 'text-red-400', bg: 'bg-red-500/20' },
          { href: '/finance/transactions', label: 'All Transactions', icon: Search, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { href: '/finance/vendors', label: 'Vendors', icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { href: '/finance/funders', label: 'Funders', icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },

          // REPORTS — role/period outputs
          { href: '#reports', label: 'Reports', icon: Landmark, divider: true },
          { href: '/finance/board', label: 'Board Report', icon: Landmark, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { href: '/finance/accountant', label: 'Accountant Pack', icon: Calculator, color: 'text-orange-400', bg: 'bg-orange-500/20' },
          { href: '/finance/revenue', label: 'Revenue Sequencing', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { href: '/finance/pipeline', label: 'Pipeline', icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
          { href: '/finance/invoices', label: 'Invoice Command', icon: Receipt, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },

          { href: '#hub', label: 'Hub', icon: DollarSign, divider: true },
          { href: '/finance', label: 'All finance (hub)', icon: DollarSign, color: 'text-foreground', bg: 'bg-white/10' },
          { href: '/admin/sync-health', label: 'Sync Health', icon: Activity, color: 'text-neutral-400', bg: 'bg-neutral-500/20' },
        ],
      },
    ],
    defaultExpanded: false,
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    items: [
      { href: '/knowledge', label: 'Knowledge', icon: Brain },
    ],
    defaultExpanded: false,
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { href: '/chat', label: 'Chat', icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
      { href: '/system', label: 'System', icon: Settings },
      { href: '/system/usage', label: 'AI Usage', icon: BarChart, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    ],
    defaultExpanded: false,
  },
]

// --- Role-based filtering ---

import type { Role } from '@/lib/role-context'

const roleGroupAccess: Record<Role, string[]> = {
  founder: ['dashboard', 'relationships', 'projects', 'finance', 'knowledge', 'tools'],
  accountant: ['dashboard', 'finance'],
  board: ['finance'],
  team: ['dashboard', 'relationships', 'projects', 'knowledge'],
}

// Board members see the executive State cockpit + board report + finance hub.
// (/finance/command folded into /finance/overview — 2026-05-29 P4 consolidation.)
const boardFinanceHrefs = new Set(['/finance', '/finance/overview', '/finance/board'])

export function filterNavForRole(role: Role): SidebarNavGroup[] {
  const allowedGroups = roleGroupAccess[role]
  return navStructure
    .filter(group => allowedGroups.includes(group.id))
    .map(group => {
      if (role === 'board' && group.id === 'finance') {
        return {
          ...group,
          items: group.items.map(item => ({
            ...item,
            children: item.children?.filter(child => boardFinanceHrefs.has(child.href)),
          })),
        }
      }
      return group
    })
}

// Helper: find which group contains a given pathname
export function findGroupForPath(pathname: string): string | null {
  for (const group of navStructure) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return group.id
      }
      if (item.children) {
        for (const child of item.children) {
          if (pathname === child.href || pathname.startsWith(`${child.href}/`)) {
            return group.id
          }
        }
      }
    }
  }
  return null
}
