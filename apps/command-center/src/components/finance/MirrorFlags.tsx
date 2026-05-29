'use client'

import { useQuery } from '@tanstack/react-query'
import { Tag, Paperclip, Copy, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/format'

// Mirror surface — "flag issues". Three actionable signals:
//   • Untagged       (rows with no project_code)        → filters the table
//   • Missing receipt (spends with has_attachments=false)→ filters the table
//   • Duplicates      (audit high-severity dup alerts)   → expands an inline list
// Untagged/missing counts are computed by the parent from the live rows; the
// duplicate list comes from /api/finance/audit (the same detector behind
// /finance/audit, incl. the PAID+AUTHORISED Carla/Kirmos pattern).

export type MirrorFlag = 'untagged' | 'missing-receipt' | 'duplicates'

interface AuditAlert {
  severity: 'high' | 'medium' | 'info'
  title: string
  detail: string
  amount?: number
  projectCode?: string | null
  xeroLink?: string
}
interface AuditResponse {
  auditAlerts?: AuditAlert[]
}

function FlagCard({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: typeof Tag
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  const hot = count > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
        active
          ? 'border-cyan-300/60 bg-cyan-500/10'
          : hot
            ? 'border-amber-300/30 bg-amber-500/[0.06] hover:bg-amber-500/10'
            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
      )}
    >
      <Icon className={cn('h-4 w-4', hot ? 'text-amber-300' : 'text-white/40')} />
      <div className="text-left">
        <div className={cn('text-lg font-bold tabular-nums', hot ? 'text-amber-300' : 'text-white/50')}>{count}</div>
        <div className="text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      </div>
    </button>
  )
}

export function MirrorFlags({
  untaggedCount,
  missingReceiptCount,
  activeFlag,
  onSelectFlag,
}: {
  untaggedCount: number
  missingReceiptCount: number
  activeFlag: MirrorFlag | null
  onSelectFlag: (f: MirrorFlag | null) => void
}) {
  const { data } = useQuery<AuditResponse>({
    queryKey: ['finance', 'audit', 'mirror-flags'],
    queryFn: () => fetch('/api/finance/audit').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const dups = (data?.auditAlerts ?? []).filter((a) => a.severity === 'high')
  const toggle = (f: MirrorFlag) => onSelectFlag(activeFlag === f ? null : f)

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <FlagCard icon={Tag} label="Untagged" count={untaggedCount} active={activeFlag === 'untagged'} onClick={() => toggle('untagged')} />
        <FlagCard icon={Paperclip} label="Missing receipt" count={missingReceiptCount} active={activeFlag === 'missing-receipt'} onClick={() => toggle('missing-receipt')} />
        <FlagCard icon={Copy} label="Duplicates" count={dups.length} active={activeFlag === 'duplicates'} onClick={() => toggle('duplicates')} />
      </div>

      {activeFlag === 'duplicates' && (
        <div className="mt-2 space-y-1.5">
          {dups.length === 0 && <div className="text-xs text-white/40 px-1 py-2">No duplicate alerts.</div>}
          {dups.map((a, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-amber-300/20 bg-amber-500/[0.05] px-3 py-2">
              <div>
                <div className="text-xs font-semibold text-amber-200">{a.title}</div>
                <div className="text-[11px] text-white/50">{a.detail}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {a.amount != null && <span className="text-xs font-bold tabular-nums text-amber-300">{formatMoney(a.amount)}</span>}
                {a.xeroLink && (
                  <a href={a.xeroLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:underline">
                    Xero <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
          <div className="px-1 pt-1 text-[10px] text-white/30">For PAID + AUTHORISED pairs, void the AUTHORISED one in Xero, then refresh. Full audit at /finance/audit.</div>
        </div>
      )}
    </div>
  )
}
