import {
  Sun,
  Calendar,
  Users,
  Layers,
  FolderKanban,
  Scale,
  Heart,
  ShoppingBag,
  Wheat,
  Apple,
  Palette,
  Brain,
  DollarSign,
  CircleDollarSign,
  BarChart3,
  Landmark,
  Calculator,
  Handshake,
  MessageSquare,
  Settings,
  BarChart,
  KanbanSquare,
  TrendingUp,
  Tag,
  ClipboardCheck,
  Compass,
  Sparkles,
  Target,
  Receipt,
  ClipboardList,
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
      { href: '/pipeline', label: 'Pipeline', icon: Handshake, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
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
          { href: '/finance/review', label: 'The Review', icon: ClipboardList, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { href: '/finance/money-alignment', label: 'Money Alignment', icon: CircleDollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { href: '/finance/overview', label: 'Overview', icon: Layers, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { href: '/finance/project-plan', label: 'Project Plans', icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
          { href: '/finance/projects', label: 'Projects P&L', icon: BarChart3, color: 'text-green-400', bg: 'bg-green-500/20' },
          { href: '/finance/pipeline-kanban', label: 'Pipeline Kanban', icon: KanbanSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
          { href: '/finance/board', label: 'Board Report', icon: Landmark, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { href: '/finance/tagger-v2', label: 'Rapid Tagger', icon: Tag, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { href: '/finance/tagger-bulk', label: 'Bulk Tagger', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { href: '/finance/reconciliation', label: 'Receipt Intelligence', icon: ClipboardCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
          { href: '/finance/accountant', label: 'Accountant', icon: Calculator, color: 'text-orange-400', bg: 'bg-orange-500/20' },
          { href: '/finance/invoices', label: 'Invoice Command', icon: Receipt, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { href: '/finance/pipeline', label: 'Pipeline Confidence', icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
          { href: '/finance/revenue', label: 'Revenue Sequencing', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { href: '/finance/revenue-planning', label: 'Revenue Planning', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/20' },
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

// Board members only see overview + board report within finance
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
