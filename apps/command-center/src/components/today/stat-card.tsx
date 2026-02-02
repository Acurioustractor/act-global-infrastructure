'use client'

import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  color: 'blue' | 'red' | 'orange' | 'purple' | 'pink' | 'green'
  href: string
}

const colorMap: Record<string, string> = {
  blue: 'from-blue-500/20 to-blue-600/10 text-blue-400',
  red: 'from-red-500/20 to-red-600/10 text-red-400',
  orange: 'from-orange-500/20 to-orange-600/10 text-orange-400',
  purple: 'from-purple-500/20 to-purple-600/10 text-purple-400',
  pink: 'from-pink-500/20 to-pink-600/10 text-pink-400',
  green: 'from-green-500/20 to-green-600/10 text-green-400',
}

export function StatCard({ label, value, icon: Icon, color, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="glass-card-sm p-3 md:p-4 hover:border-indigo-500/30 transition-all group"
    >
      <div
        className={cn(
          'w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2 md:mb-3',
          colorMap[color]
        )}
      >
        <Icon className="h-4 w-4 md:h-5 md:w-5" />
      </div>
      <p className="text-lg md:text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-[10px] md:text-xs text-white/50 mt-0.5 md:mt-1 truncate">{label}</p>
    </Link>
  )
}
