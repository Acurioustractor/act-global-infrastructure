export type HarvestOffer = {
  id: string
  name: string
  lane: 'Events' | 'Food' | 'Membership' | 'Residency' | 'Experience' | 'Hire'
  cadence: number
  units: number
  price: number
  variableCostRate: number
  fixedCost: number
  labourHours: number
  loadedLabourRate: number
  note: string
  evidence: 'benchmark' | 'assumption'
}

export const DEFAULT_MONTHLY_OPERATING_BASE = 18_170

export const harvestOffers: HarvestOffer[] = [
  {
    id: 'art-dinner', name: 'Art + fire dinner', lane: 'Events', cadence: 4, units: 60, price: 65,
    variableCostRate: 0.30, fixedCost: 950, labourHours: 28, loadedLabourRate: 40,
    note: 'Ticket bundles the work, shared meal and place; strongest repeatable Harvest-shaped offer.', evidence: 'assumption',
  },
  {
    id: 'workshop', name: 'Artist / maker workshop', lane: 'Events', cadence: 4, units: 20, price: 85,
    variableCostRate: 0.18, fixedCost: 600, labourHours: 10, loadedLabourRate: 40,
    note: 'Small capacity, high yield per visitor; facilitator fee sits in fixed cost.', evidence: 'assumption',
  },
  {
    id: 'private-event', name: 'Private event + food', lane: 'Hire', cadence: 2, units: 60, price: 95,
    variableCostRate: 0.30, fixedCost: 700, labourHours: 36, loadedLabourRate: 40,
    note: 'Higher-margin calendar anchor; protect community access with a capped monthly cadence.', evidence: 'assumption',
  },
  {
    id: 'experience-day', name: 'Harvest art experience', lane: 'Experience', cadence: 2, units: 30, price: 180,
    variableCostRate: 0.25, fixedCost: 1_200, labourHours: 24, loadedLabourRate: 40,
    note: 'A destination day: make, eat, walk, meet an artist. Designed for hinterland visitors.', evidence: 'assumption',
  },
  {
    id: 'membership', name: 'Harvest membership', lane: 'Membership', cadence: 1, units: 250, price: 10,
    variableCostRate: 0.12, fixedCost: 250, labourHours: 8, loadedLabourRate: 40,
    note: '$120 annual membership recognised at $10/member/month; benefits must create belonging without unlimited free inventory.', evidence: 'benchmark',
  },
  {
    id: 'commissioned-residency', name: 'Commissioned residency', lane: 'Residency', cadence: 0.5, units: 1, price: 7_500,
    variableCostRate: 0.20, fixedCost: 1_000, labourHours: 20, loadedLabourRate: 45,
    note: 'Partner-funded artist fee, public outcome and documentation; model assumes six per year.', evidence: 'assumption',
  },
  {
    id: 'self-funded-residency', name: 'Self-funded residency week', lane: 'Residency', cadence: 2, units: 1, price: 835,
    variableCostRate: 0.10, fixedCost: 140, labourHours: 6, loadedLabourRate: 45,
    note: 'Price anchored to an Australian self-funded residency benchmark; valuable artist pipeline, modest cash margin.', evidence: 'benchmark',
  },
  {
    id: 'venue-hire', name: 'Space-only venue hire', lane: 'Hire', cadence: 2, units: 1, price: 1_200,
    variableCostRate: 0.05, fixedCost: 200, labourHours: 5, loadedLabourRate: 40,
    note: 'Simple access to an otherwise idle room; add bonds, security and cleaning where risk requires.', evidence: 'benchmark',
  },
  {
    id: 'cafe-day', name: 'Standalone café day', lane: 'Food', cadence: 8, units: 70, price: 24,
    variableCostRate: 0.37, fixedCost: 80, labourHours: 32, loadedLabourRate: 38,
    note: 'Deliberately conservative: café trading is a support layer until actual covers and labour prove otherwise.', evidence: 'benchmark',
  },
]

export function calculateOffer(offer: HarvestOffer) {
  const revenue = offer.cadence * offer.units * offer.price
  const variableCosts = revenue * offer.variableCostRate
  const occurrenceCosts = offer.cadence * (offer.fixedCost + offer.labourHours * offer.loadedLabourRate)
  const contribution = revenue - variableCosts - occurrenceCosts
  const contributionMargin = revenue ? contribution / revenue : 0
  const unitContribution = offer.price * (1 - offer.variableCostRate)
  const breakEvenUnits = unitContribution > 0
    ? Math.ceil((offer.fixedCost + offer.labourHours * offer.loadedLabourRate) / unitContribution)
    : null
  return { revenue, variableCosts, occurrenceCosts, contribution, contributionMargin, breakEvenUnits }
}
