'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sun,
  Users,
  FolderKanban,
  Target,
  Brain,
  Bot,
  DollarSign,
  Briefcase,
  Settings,
  ShoppingBag,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/today', label: 'Today', icon: Sun },
  { href: '/people', label: 'People', icon: Users },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/goods', label: 'Goods', icon: ShoppingBag },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/knowledge', label: 'Knowledge', icon: Brain },
  { href: '/agent', label: 'Agent', icon: Bot },
  { href: '/finance', label: 'Finance', icon: DollarSign },
  { href: '/business', label: 'Business', icon: Briefcase },
]

interface NavigationProps {
  mobile?: boolean
  className?: string
}

export function Navigation({ mobile = false, className }: NavigationProps) {
  const pathname = usePathname()

  if (mobile) {
    return (
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-secondary/95 backdrop-blur-lg',
          className
        )}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg px-3 py-2 transition-colors',
                  isActive ? 'text-listen' : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1 text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  return (
    <nav
      className={cn(
        'sticky top-0 flex h-screen w-16 flex-col items-center border-r border-border bg-bg-secondary py-4',
        className
      )}
    >
      {/* Logo */}
      <Link href="/today" className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-listen">
        <span className="text-lg font-bold text-white">A</span>
      </Link>

      {/* Nav items */}
      <div className="flex flex-1 flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-listen/10 text-listen'
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
              )}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
              {/* Tooltip */}
              <span className="absolute left-full ml-2 hidden rounded-md bg-bg-elevated px-2 py-1 text-xs font-medium text-text-primary shadow-lg group-hover:block">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Bottom - System (always visible) */}
      <Link
        href="/system"
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
          pathname === '/system'
            ? 'bg-listen/10 text-listen'
            : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
        )}
        title="System"
      >
        <Settings className="h-5 w-5" />
      </Link>
    </nav>
  )
}
