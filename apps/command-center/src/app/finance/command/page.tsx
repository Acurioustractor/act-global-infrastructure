import { redirect } from 'next/navigation'

// P2 STATE fold (plan 2026-05-29): the Money Command cockpit is consolidated
// into /finance/overview (trust meters + pile mix folded up; deep work-queue
// panels move to the OPERATE surface in P3). Its API route /api/finance/command
// stays live — overview reads pile mix from it. Original page in git history
// (pre-c593390). Full archive happens in P4.
export default function MoneyCommandRedirect() {
  redirect('/finance/overview')
}
