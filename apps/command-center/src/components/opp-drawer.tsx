'use client'

import { useEffect } from 'react'
import { X, ExternalLink, FileText, User, Mail, Phone, Building2, Clock, Tag } from 'lucide-react'

type PipelineOpp = {
  id: string
  ghl_id: string
  name: string
  stage_name: string
  status: string
  monetary_value: number
  project_code: string | null
  assigned_to: string | null
  days_in_stage: number | null
  is_stale: boolean
  is_demand_signal: boolean
  contact: {
    full_name: string
    company_name: string | null
    email: string | null
    last_contact_date: string | null
    days_since_contact: number | null
  } | null
  invoice: {
    invoice_number: string
    date: string
    total: number
    paid: number
    due: number
    status: string
  } | null
}

function fmtCurrency(n: number): string {
  if (!n) return '—'
  return '$' + n.toLocaleString('en-AU', { maximumFractionDigits: 0 })
}

type Props = {
  opp: PipelineOpp | null
  onClose: () => void
}

export function OppDrawer({ opp, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!opp) return null

  const ghlUrl = `https://app.gohighlevel.com/v2/location/agzsSZWgovjwgpcoASWG/opportunities/${opp.ghl_id}`

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-neutral-900 border-l border-white/10 z-50 overflow-y-auto">
        <div className="sticky top-0 bg-neutral-900 border-b border-white/10 p-4 flex items-start justify-between">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs text-white/40">{opp.stage_name}</span>
              {opp.is_stale && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                  {opp.days_in_stage}d stale
                </span>
              )}
              {opp.is_demand_signal && (
                <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                  demand signal
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white leading-tight">{opp.name}</h3>
            <p className="text-xl font-semibold text-emerald-400 mt-1">{fmtCurrency(opp.monetary_value)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-1 rounded hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">

          {/* Contact */}
          <Section title="Contact" icon={<User className="h-4 w-4" />}>
            {opp.contact ? (
              <div className="space-y-1.5 text-sm">
                <div className="text-white font-medium">{opp.contact.full_name}</div>
                {opp.contact.company_name && (
                  <div className="flex items-center gap-1.5 text-white/70">
                    <Building2 className="h-3.5 w-3.5" /> {opp.contact.company_name}
                  </div>
                )}
                {opp.contact.email && (
                  <a
                    href={`mailto:${opp.contact.email}`}
                    className="flex items-center gap-1.5 text-blue-400 hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" /> {opp.contact.email}
                  </a>
                )}
                {opp.contact.days_since_contact !== null && (
                  <div className="flex items-center gap-1.5 text-white/60 text-xs mt-2">
                    <Clock className="h-3.5 w-3.5" />
                    Last touched {opp.contact.days_since_contact}d ago
                    {opp.contact.days_since_contact > 21 && (
                      <span className="text-amber-400 ml-1">— overdue</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-white/50 text-sm italic">No linked contact.</p>
            )}
          </Section>

          {/* Invoice */}
          <Section title="Linked Xero Invoice" icon={<FileText className="h-4 w-4" />}>
            {opp.invoice ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white font-mono">{opp.invoice.invoice_number}</span>
                  <StatusBadge status={opp.invoice.status} />
                </div>
                <div className="text-white/60 text-xs">
                  Dated {opp.invoice.date}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 p-2 bg-white/5 rounded">
                  <Stat label="Total" value={fmtCurrency(opp.invoice.total)} />
                  <Stat label="Paid" value={fmtCurrency(opp.invoice.paid)} color="text-emerald-400" />
                  <Stat
                    label="Due"
                    value={fmtCurrency(opp.invoice.due)}
                    color={opp.invoice.due > 0 ? 'text-amber-400' : 'text-white/60'}
                  />
                </div>
                {opp.invoice.status === 'DRAFT' && (
                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
                    ⚠ Invoice sits in DRAFT in Xero. Either send it or void — the Xero ↔ GHL Reconciler will flag this daily until resolved.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-white/50 text-sm italic">No linked invoice yet.</p>
            )}
          </Section>

          {/* Meta */}
          <Section title="Pipeline" icon={<Tag className="h-4 w-4" />}>
            <div className="space-y-1.5 text-sm">
              <MetaRow label="Stage" value={opp.stage_name} />
              <MetaRow label="Status" value={opp.status} />
              {opp.project_code && <MetaRow label="Project code" value={opp.project_code} />}
              {opp.days_in_stage !== null && (
                <MetaRow label="Days in stage" value={`${opp.days_in_stage}`} />
              )}
              {opp.assigned_to && <MetaRow label="Assigned to" value={opp.assigned_to} />}
            </div>
          </Section>

          {/* Actions */}
          <Section title="Quick actions" icon={null}>
            <div className="space-y-2">
              <a
                href={ghlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 bg-white/10 hover:bg-white/15 rounded text-sm text-white transition"
              >
                <span>Open in GHL</span>
                <ExternalLink className="h-4 w-4" />
              </a>
              {opp.contact?.email && (
                <a
                  href={`mailto:${opp.contact.email}?subject=Goods%20on%20Country%20%E2%80%94%20${encodeURIComponent(opp.name)}`}
                  className="flex items-center justify-between px-3 py-2 bg-white/10 hover:bg-white/15 rounded text-sm text-white transition"
                >
                  <span>Email {opp.contact.full_name}</span>
                  <Mail className="h-4 w-4" />
                </a>
              )}
              <p className="text-xs text-white/40 pt-2">
                Note: stage changes happen by drag-drop on the kanban. More quick actions (log touch, set next action) in the next iteration.
              </p>
            </div>
          </Section>

        </div>
      </div>
    </>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50 font-semibold mb-2">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  )
}

function Stat({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-xs text-white/40">{label}</div>
      <div className={`text-sm font-medium ${color}`}>{value}</div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400'
    : status === 'AUTHORISED' || status === 'SUBMITTED' ? 'bg-blue-500/20 text-blue-400'
    : status === 'DRAFT' ? 'bg-amber-500/20 text-amber-400'
    : status === 'VOIDED' || status === 'DELETED' ? 'bg-red-500/20 text-red-400'
    : 'bg-white/10 text-white/60'
  return <span className={`text-xs px-2 py-0.5 rounded ${color}`}>{status}</span>
}
