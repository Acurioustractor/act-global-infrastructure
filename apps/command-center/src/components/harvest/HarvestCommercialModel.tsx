'use client'

import { useMemo, useState } from 'react'
import { Calculator, Coffee, ExternalLink, Palette, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  calculateOffer,
  DEFAULT_MONTHLY_OPERATING_BASE,
  harvestOffers,
  type HarvestOffer,
} from '@/lib/harvest-commercial-model'

const money = (value: number) => value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

export function HarvestCommercialModel() {
  const [offers, setOffers] = useState(harvestOffers)
  const [operatingBase, setOperatingBase] = useState(DEFAULT_MONTHLY_OPERATING_BASE)

  const rows = useMemo(() => offers.map(offer => ({ offer, result: calculateOffer(offer) })), [offers])
  const totals = rows.reduce((sum, row) => ({
    revenue: sum.revenue + row.result.revenue,
    contribution: sum.contribution + row.result.contribution,
  }), { revenue: 0, contribution: 0 })
  const monthlyNet = totals.contribution - operatingBase

  const update = (id: string, field: keyof Pick<HarvestOffer, 'cadence' | 'units' | 'price'>, value: number) => {
    setOffers(current => current.map(offer => offer.id === id ? { ...offer, [field]: Math.max(0, value || 0) } : offer))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <Palette className="mt-0.5 h-5 w-5 text-amber-300" />
          <div>
            <h2 className="font-medium text-zinc-100">Harvest earns through the whole experience</h2>
            <p className="mt-1 max-w-4xl text-sm text-zinc-400">
              The working thesis is events + experiences + hire create margin; membership creates belonging and dependable cash;
              food increases value and dwell time; residencies create the artistic program. Café-only trade must earn its place with actual covers.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Summary label="Monthly revenue" value={money(totals.revenue)} />
        <Summary label="Contribution before base" value={money(totals.contribution)} />
        <label className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <span className="text-xs text-zinc-500">Monthly operating base</span>
          <span className="mt-1 flex items-center text-xl font-semibold text-zinc-100">
            $<input className="w-full bg-transparent outline-none" type="number" step="500" value={operatingBase} onChange={event => setOperatingBase(Math.max(0, Number(event.target.value)))} />
          </span>
          <span className="text-[11px] text-zinc-600">Legacy forecast; replace with live payroll + occupancy</span>
        </label>
        <Summary label="Modelled monthly net" value={money(monthlyNet)} tone={monthlyNet >= 0 ? 'good' : 'bad'} />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-200"><Calculator className="h-4 w-4 text-emerald-400" /> Play with the offer mix</h3>
          <p className="mt-1 text-xs text-zinc-500">Change runs/month, people and price. Costs are visible assumptions—not forecasts.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <tr><th className="p-3">Offer</th><th className="p-3">Runs/mo</th><th className="p-3">People / units</th><th className="p-3">Price</th><th className="p-3 text-right">Revenue</th><th className="p-3 text-right">Contribution</th><th className="p-3 text-right">Margin</th><th className="p-3 text-right">Break-even units/run</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map(({ offer, result }) => (
                <tr key={offer.id} className="align-top">
                  <td className="p-3"><div className="font-medium text-zinc-200">{offer.name}</div><div className="mt-0.5 max-w-xs text-[11px] leading-4 text-zinc-600">{offer.note}</div><span className="mt-1 inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">{offer.lane} · {offer.evidence}</span></td>
                  <Editable value={offer.cadence} step={offer.cadence < 1 ? 0.25 : 1} onChange={value => update(offer.id, 'cadence', value)} />
                  <Editable value={offer.units} onChange={value => update(offer.id, 'units', value)} />
                  <Editable value={offer.price} prefix="$" onChange={value => update(offer.id, 'price', value)} />
                  <td className="p-3 text-right tabular-nums text-zinc-300">{money(result.revenue)}</td>
                  <td className={cn('p-3 text-right font-medium tabular-nums', result.contribution >= 0 ? 'text-emerald-400' : 'text-red-400')}>{money(result.contribution)}</td>
                  <td className="p-3 text-right tabular-nums text-zinc-400">{Math.round(result.contributionMargin * 100)}%</td>
                  <td className="p-3 text-right tabular-nums text-zinc-400">{result.breakEvenUnits ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Insight icon={Palette} title="Best strategic fit" text="Art dinners and destination experience days combine the site, food and artistic program instead of selling each piece separately." />
        <Insight icon={Users} title="Best dependable layer" text="Membership can underwrite programming, but benefits should be priority, access and belonging—not unlimited free food or tickets." />
        <Insight icon={Coffee} title="Biggest operating risk" text="At the default assumptions a standalone café day needs about 86 covers to break even. Start with event-led service and measure every trading day." />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-500">
        <div className="font-medium text-zinc-300">Benchmark anchors</div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          <Source href="https://www.ato.gov.au/api/public/content/0-ce584ea2-57ac-415c-9f42-ee6d351d9c59" label="ATO coffee-shop cost ranges" />
          <Source href="https://www.sac.org.au/venue/the-artists-cottage/" label="Salamanca residency fees" />
          <Source href="https://www.qagoma.qld.gov.au/membership/" label="QAGOMA membership design" />
          <Source href="https://humanitix.com/au/pricing" label="Humanitix ticket fees" />
          <Source href="https://www.tra.gov.au/content/dam/austrade-assets/global/wip/tra/documents/visiting-farm-2024-factsheet%20.pdf" label="Australian agritourism demand" />
        </div>
      </div>
    </div>
  )
}

function Editable({ value, onChange, prefix, step = 1 }: { value: number; onChange: (value: number) => void; prefix?: string; step?: number }) {
  return <td className="p-3"><div className="flex w-24 items-center rounded border border-zinc-700 bg-zinc-950 px-2 text-zinc-300">{prefix}<input className="w-full bg-transparent p-1.5 outline-none" type="number" min="0" step={step} value={value} onChange={event => onChange(Number(event.target.value))} /></div></td>
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><div className="text-xs text-zinc-500">{label}</div><div className={cn('mt-1 text-xl font-semibold', tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-zinc-100')}>{value}</div></div>
}

function Insight({ icon: Icon, title, text }: { icon: typeof Palette; title: string; text: string }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"><Icon className="h-4 w-4 text-amber-300" /><div className="mt-2 text-sm font-medium text-zinc-200">{title}</div><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div>
}

function Source({ href, label }: { href: string; label: string }) {
  return <a className="flex items-center gap-1 text-blue-400 hover:text-blue-300" href={href} target="_blank" rel="noreferrer">{label}<ExternalLink className="h-3 w-3" /></a>
}
