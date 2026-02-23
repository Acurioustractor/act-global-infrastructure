import {
  Sun,
  Calendar,
  Rocket,
  Users,
  Layers,
  FolderKanban,
  Scale,
  Heart,
  ShoppingBag,
  Wheat,
  Apple,
  Palette,
  Target,
  Brain,
  MessageSquare,
  ListChecks,
  Gavel,
  DollarSign,
  Wallet,
  BarChart3,
  Landmark,
  Bot,
  Zap,
  Briefcase,
  FileBarChart,
  Code2,
  BookOpen,
  Settings,
  Clock,
  Calculator,
  Database,
  Telescope,
  FlaskConical,
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
      { href: '/today', label: 'Today', icon: Sun },
      { href: '/sprint', label: 'Sprint', icon: Rocket },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
    ],
    defaultExpanded: true,
  },
  {
    id: 'relationships',
    label: 'Relationships',
    items: [
      { href: '/people', label: 'People', icon: Users },
      { href: '/opportunities', label: 'Pipeline & Grants', icon: Telescope },
      { href: '/ecosystem', label: 'Ecosystem', icon: Layers },
    ],
    defaultExpanded: true,
  },
  {
    id: 'work',
    label: 'Work',
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
      { href: '/goals', label: 'Goals', icon: Target },
    ],
    defaultExpanded: false,
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    items: [
      { href: '/knowledge', label: 'Overview', icon: Brain },
      { href: '/compendium/storytellers', label: 'Storytellers', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
      { href: '/knowledge/meetings', label: 'Meetings', icon: MessageSquare },
      { href: '/knowledge/actions', label: 'Actions', icon: ListChecks },
      { href: '/knowledge/decisions', label: 'Decisions', icon: Gavel },
    ],
    defaultExpanded: false,
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        href: '/finance',
        label: 'Finance',
        icon: DollarSign,
        children: [
          { href: '/finance/runway', label: 'Runway', icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { href: '/finance/cashflow', label: 'Cash Flow', icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { href: '/finance/revenue', label: 'Revenue Streams', icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { href: '/finance/tax', label: 'Tax & BAS', icon: Calculator, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { href: '/finance/debt', label: 'Property Payoff', icon: Landmark },
          { href: '/finance/receipts', label: 'Receipts', icon: FileBarChart },
          { href: '/finance/subscriptions', label: 'Subscriptions', icon: DollarSign },
          { href: '/finance/data-quality', label: 'Data Quality', icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
          { href: '/finance/rd-tracking', label: 'R&D Tracking', icon: FlaskConical, color: 'text-lime-400', bg: 'bg-lime-500/20' },
        ],
      },
      { href: '/team', label: 'Team & Resources', icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    ],
    defaultExpanded: false,
  },
  {
    id: 'systems',
    label: 'Systems',
    items: [
      { href: '/chat', label: 'Chat', icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
      { href: '/agent', label: 'Agent', icon: Bot, color: 'text-violet-400', bg: 'bg-violet-500/20' },
      { href: '/intelligence', label: 'Intelligence', icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
      { href: '/business', label: 'Business Setup', icon: Briefcase },
      { href: '/reports', label: 'Reports', icon: FileBarChart },
      { href: '/development', label: 'Development', icon: Code2 },
      { href: '/wiki', label: 'Wiki', icon: BookOpen },
      { href: '/system', label: 'System', icon: Settings },
    ],
    defaultExpanded: false,
  },
]

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
