import { Breadcrumbs } from '@/components/breadcrumbs'
import { FreshnessBadge } from '@/components/finance/FreshnessBadge'

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 px-8 pt-6">
        <Breadcrumbs />
        <FreshnessBadge />
      </div>
      {children}
    </div>
  )
}
