import { Metadata } from 'next';
import CardGrid from '@/components/CardGrid';
import SignalBars from '@/components/impact/SignalBars';
import ImpactSankey from '@/components/impact/ImpactSankey';
import { REAL_INITIATIVES, REAL_CONTEXTS, REAL_EVIDENCE } from '@/data/alma-seeds';

export const metadata: Metadata = {
    title: 'Impact & Evaluation | A Curious Tractor',
    description: 'Tracking the ecological, social, and economic impact of the ACT Ecosystem.',
};

export default function ImpactPage() {
    // Calculate high-level metrics
    const totalInitiatives = REAL_INITIATIVES.length;
    const totalContexts = REAL_CONTEXTS.length;
    const communityLedCount = REAL_INITIATIVES.filter(i => i.community_authority === 'High').length;

    return (
        <div className="space-y-16">
            {/* Header Section */}
            <section className="space-y-8">
                <h1 className="text-4xl md:text-6xl font-[var(--font-display)] text-[#2F3E2E]">
                    Ecosystem Impact
                </h1>
                <p className="max-w-2xl text-lg text-[#4D3F33] leading-relaxed">
                    The ALMA (Adaptive Learning & Measurement Architecture) system visualizes the
                    regenerative outcomes of our work across Land, Studio, and Harvest contexts.
                </p>

                {/* Impact Placemat (Sankey) */}
                <div className="w-full h-[500px] bg-[#F6F1E7] border border-[#E1D3BA] rounded-3xl overflow-hidden p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-6 border-b border-[#E1D3BA]/50 pb-2">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#6B5A45]">Impact Flow</h3>
                        <span className="text-xs text-[#8B4513] bg-[#F0EAE0] px-2 py-1 rounded-full">Live Data</span>
                    </div>
                    <ImpactSankey />
                </div>

                {/* High-level Counters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-6 bg-white/60 rounded-2xl border border-[#E1D3BA] text-center">
                        <div className="text-4xl font-[var(--font-display)] text-[#D87D4A]">{totalInitiatives}</div>
                        <div className="text-xs uppercase tracking-widest mt-2 text-[#6B5A45]">Active Initiatives</div>
                    </div>
                    <div className="p-6 bg-white/60 rounded-2xl border border-[#E1D3BA] text-center">
                        <div className="text-4xl font-[var(--font-display)] text-[#6B5A45]">{totalContexts}</div>
                        <div className="text-xs uppercase tracking-widest mt-2 text-[#6B5A45]">Bioregional Contexts</div>
                    </div>
                    <div className="p-6 bg-white/60 rounded-2xl border border-[#E1D3BA] text-center">
                        <div className="text-4xl font-[var(--font-display)] text-[#4CAF50]">{communityLedCount}</div>
                        <div className="text-xs uppercase tracking-widest mt-2 text-[#6B5A45]">Community Led</div>
                    </div>
                    <div className="p-6 bg-white/60 rounded-2xl border border-[#E1D3BA] flex items-center justify-center">
                        <div className="text-xs text-[#6B5A45] italic">"Regeneration moves at the speed of trust."</div>
                    </div>
                </div>
            </section>

            {/* Initiatives Feed */}
            <section className="space-y-8">
                <div className="flex items-end justify-between border-b border-[#E1D3BA] pb-4">
                    <h2 className="text-2xl font-[var(--font-display)]">Live Initiatives</h2>
                    <span className="text-xs uppercase tracking-widest text-[#6B5A45]">
                        Real-time Portfolio
                    </span>
                </div>

                <CardGrid
                    cards={REAL_INITIATIVES.map((init) => ({
                        title: init.title,
                        description: init.outcome_focus,
                        eyebrow: init.type,
                        theme: init.status === 'active' ? 'Active' : 'Concept',
                        meta: (
                            <div className="mt-4 flex gap-6">
                                <SignalBars label="Evidence" level={init.evidence_strength} color="#4CAF50" />
                                <SignalBars label="Authority" level={init.community_authority} color="#D87D4A" />
                            </div>
                        )
                    }))}
                />
            </section>

            {/* Contexts Map (List for now) */}
            <section className="space-y-8">
                <div className="flex items-end justify-between border-b border-[#E1D3BA] pb-4">
                    <h2 className="text-2xl font-[var(--font-display)]">Bioregional Contexts</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    {REAL_CONTEXTS.map(ctx => (
                        <div key={ctx.name} className="p-6 bg-[#F0EAE0] rounded-2xl border border-transparent hover:border-[#D87D4A] transition">
                            <h3 className="text-xl font-[var(--font-display)] mb-2">{ctx.name}</h3>
                            <p className="text-sm text-[#6B5A45] mb-4 uppercase tracking-widest">{ctx.bioregion} • {ctx.cultural_authority}</p>
                            <p className="text-[#4D3F33]">{ctx.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Evidence Library */}
            <section className="space-y-8">
                <div className="flex items-end justify-between border-b border-[#E1D3BA] pb-4">
                    <h2 className="text-2xl font-[var(--font-display)]">Evidence Library</h2>
                </div>
                <div className="space-y-4">
                    {REAL_EVIDENCE.map((ev, i) => (
                        <div key={i} className="flex flex-col md:flex-row gap-4 p-6 bg-white rounded-xl border border-[#E1D3BA]">
                            <div className="md:w-1/4">
                                <span className="inline-block px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded-full text-xs font-semibold mb-2">
                                    {ev.evidence_type}
                                </span>
                                <h4 className="font-semibold text-lg">{ev.title}</h4>
                            </div>
                            <div className="md:w-3/4">
                                <p className="text-[#4D3F33] italic mb-2">"{ev.findings}"</p>
                                <p className="text-xs text-[#6B5A45] uppercase tracking-wider">{ev.consent_level}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
