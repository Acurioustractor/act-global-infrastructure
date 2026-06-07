import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const lanes = [
  {
    title: "To Us",
    summary: "Director wages and trust distributions.",
    body: "The founders being able to keep showing up for the work. Two humans hold the soul. If they cannot stay, the soul has nowhere to live.",
  },
  {
    title: "To Down",
    summary: "Debts paid, old liabilities cleared, receivables collected.",
    body: "An organisation that owes money cannot move freely. Clearing the past is what frees the future.",
  },
  {
    title: "To Grow",
    summary: "Reinvestment into projects.",
    body: "Equipment, sites, engineering hours, travel. Growth here is not scale. It is depth.",
  },
  {
    title: "To Others",
    summary: "Donations, fellowship payments, anchor partner support.",
    body: "ACT exists in service of communities. A dollar that never reaches a community has not done its job.",
  },
];

const lcaaPhases = [
  { phase: "Listen" },
  { phase: "Curiosity" },
  { phase: "Action" },
  { phase: "Art" },
];

const quarterTemplate = [
  {
    lane: "To Us",
    line: "Director wages and trust distributions for the quarter.",
  },
  {
    lane: "To Down",
    line: "Receivables collected, BAS obligations met, legacy liabilities cleared.",
  },
  {
    lane: "To Grow",
    line: "Site costs, equipment, engineering hours, project travel.",
  },
  {
    lane: "To Others",
    line: "Fellowship payments and partner support.",
  },
];

export default function EconomyPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="How the money moves"
        title="The Four Lanes"
        description="ACT earns money through services, contracts, and grants. This page tells you where it goes, and why we built our economy this way. It is not a P&L. It is the story our money tells."
        actions={[
          { label: "How we work", href: "/how-we-work" },
          { label: "About ACT", href: "/about", variant: "outline" },
        ]}
      />

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Premise"
          title="Most regenerative orgs forget the regenerators"
          description="Why we built our economy the way we did."
        />
        <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
          <p className="text-sm text-[#4D3F33]">
            Most organisations doing this kind of work underpay their founders
            until those founders burn out, then leave. The work either dies
            with them or gets absorbed by a generation of consultants who do
            not carry the soul.
          </p>
          <p className="text-sm text-[#4D3F33]">
            Our economy is built to refuse that pattern. Custodianship over
            ownership only works if the custodians can keep showing up. That
            means money has to flow in four directions, not one. To us. To
            our debts. To our growth. To the communities we serve.
          </p>
        </div>
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="The lanes"
          title="Where every dollar lands"
          description="Each dollar that moves through ACT lands in one of four lanes. None at the expense of the others."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {lanes.map((lane) => (
            <div
              key={lane.title}
              className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-3"
            >
              <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
                {lane.title}
              </h3>
              <p className="text-sm font-semibold text-[#2F3E2E]">
                {lane.summary}
              </p>
              <p className="text-sm text-[#4D3F33]">{lane.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Structure"
          title="Why three companies, not one"
          description="The shape of the entities that hold the four lanes."
        />
        <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
          <p className="text-sm text-[#4D3F33]">
            ACT trades through three Pty Ltd companies plus a charity. A
            Curious Tractor Pty Ltd is the trade muscle. Harvest Pty Ltd and
            Farm Pty Ltd (forming) hold their own ledgers for The Harvest and
            ACT Farm. A Kind Tractor Ltd is the charity, currently dormant,
            ready to activate when the time comes.
          </p>
          <p className="text-sm text-[#4D3F33]">
            The structure costs more in compliance. It saves more in
            legibility. Each project's economic story stays its own. We can
            see whether each one pays its way, where each is growing, where
            each needs help. A single ledger would have hidden all of that.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-[#E3D4BA] bg-gradient-to-br from-[#F6F1E7] via-[#E7DDC7] to-[#D7C4A2] p-8 md:p-12 space-y-8">
        <SectionHeading
          eyebrow="What gets reported"
          title="How a quarter shows up"
          description="The shape of our quarterly reporting. The dollar amounts stay private. The shape is public. Specific projects and quarter-by-quarter detail will populate this section once the lane tagging is wired into our books."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {quarterTemplate.map((row) => (
            <div
              key={row.lane}
              className="rounded-2xl border border-[#D8C7A5] bg-white/70 p-6 space-y-2"
            >
              <h4 className="font-semibold text-[#2F3E2E]">{row.lane}</h4>
              <p className="text-sm text-[#4D3F33]">{row.line}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-[#D8C7A5] bg-white/70 p-6 space-y-3">
          <h4 className="font-semibold text-[#2F3E2E]">
            Listen, Curiosity, Action, Art
          </h4>
          <p className="text-sm text-[#4D3F33]">
            Every dollar is also tagged to one of our four method phases.
            The quarterly split tells us whether we are living the method or
            just talking about it. The percentages will publish here once
            the phase tagging is live.
          </p>
          <div className="grid gap-3 sm:grid-cols-4 pt-2">
            {lcaaPhases.map((entry) => (
              <div
                key={entry.phase}
                className="rounded-xl border border-[#D8C7A5] bg-[#F6F1E7] p-4 text-center"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-[#6B5A45]">
                  {entry.phase}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Discipline"
          title="Built to be handed back"
          description="Beautiful obsolescence applied to money."
        />
        <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
          <p className="text-sm text-[#4D3F33]">
            Same discipline as everything else we do. We are not building a
            financial empire. We are building a system that, if the founders
            stepped away, could still run.
          </p>
          <p className="text-sm text-[#4D3F33]">
            Standalone P&Ls so each project's economy is portable.
            Documentation good enough that someone else could read the
            books. A charity arm ready to absorb the public-good work when
            the time comes. We are not building this to be inherited by
            family. We are building it to be handed back to the work itself.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Transparency"
          title="Why we tell you this"
          description="The case for making the shape of our money public."
        />
        <div className="rounded-3xl border border-[#E1D3BA] bg-white/70 p-8 space-y-4">
          <p className="text-sm text-[#4D3F33]">
            Some of the money that moves through ACT is your money. Government
            grants. Philanthropic capital that would otherwise have funded
            other things. Service revenue from organisations whose missions
            overlap with ours.
          </p>
          <p className="text-sm text-[#4D3F33]">
            Telling you where it lands is the cost of asking for it in the
            first place. If the shape on this page ever stops looking like
            ACT, we owe you and ourselves an explanation.
          </p>
        </div>
      </section>
    </div>
  );
}
