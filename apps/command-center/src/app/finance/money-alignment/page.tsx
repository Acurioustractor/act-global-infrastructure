import { redirect } from 'next/navigation'

// P2 STATE fold (plan 2026-05-29): money-alignment is consolidated into
// /finance/overview. Tagging-coverage + source-freshness now live in the
// overview Trust & Coverage strip (/api/finance/trust-meters); the untagged
// review queue moves to the OPERATE surface in P3. Its API route
// /api/finance/money-alignment stays live. Original page in git history.
export default function MoneyAlignmentRedirect() {
  redirect('/finance/overview')
}
