import { Breadcrumbs } from '@/components/breadcrumbs'

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="px-8 pt-6">
        <Breadcrumbs />
      </div>
      {children}
    </div>
  )
}
