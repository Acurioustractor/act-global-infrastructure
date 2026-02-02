'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Wallet, DollarSign, Receipt, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBookkeepingProgress } from '@/lib/api'

const REFRESH_INTERVAL = 30 * 1000

export function FinanceSummary() {
  const { data: financeData, isLoading } = useQuery({
    queryKey: ['bookkeeping', 'progress'],
    queryFn: getBookkeepingProgress,
    refetchInterval: REFRESH_INTERVAL,
  })

  const finance = financeData?.summary || null
  const overdueInvoices = financeData?.overdueInvoices || { count: 0, total: 0 }

  if (isLoading) {
    return (
      <div className="glass-card p-5 glow-green">
        <div className="h-5 w-32 bg-white/5 rounded mb-4 animate-pulse" />
        <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="glass-card p-5 glow-green">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Wallet className="h-4 w-4 text-green-400" />
          Cash Position
        </h2>
        <Link href="/finance" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
          Details <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {finance ? (
        <div className="space-y-3">
          <Link href="/finance" className="glass-card-sm p-3 block hover:border-green-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Bank Balance</span>
              <span className="text-lg font-bold text-green-400">
                ${(finance.bankBalance || 0).toLocaleString()}
              </span>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/finance" className="glass-card-sm p-2 text-center hover:border-emerald-500/30 transition-all">
              <p className="text-sm font-semibold text-emerald-400">
                ${(finance.receivables?.total || 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/40">Receivable</p>
            </Link>
            <Link href="/finance" className="glass-card-sm p-2 text-center hover:border-orange-500/30 transition-all">
              <p className="text-sm font-semibold text-orange-400">
                ${(finance.payables?.total || 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/40">Payable</p>
            </Link>
          </div>

          {overdueInvoices.count > 0 && (
            <Link href="/finance" className="glass-card-sm p-2 bg-red-500/10 border-red-500/20 block hover:bg-red-500/20 transition-all">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-red-400" />
                <span className="text-xs text-red-400">
                  {overdueInvoices.count} overdue (${overdueInvoices.total.toLocaleString()})
                </span>
              </div>
            </Link>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-white/40">
          <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Finance data loading...</p>
        </div>
      )}
    </div>
  )
}
