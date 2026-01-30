import CardGrid from "../../../components/CardGrid";
import PageHero from "../../../components/PageHero";
import SectionHeading from "../../../components/SectionHeading";

const retreatFormats = [
  {
    title: "Co-stewardship intensives",
    description:
      "Deep dives into governance, shared care, and relational accountability.",
  },
  {
    title: "Regeneration labs",
    description:
      "Systems workshops grounded in soil, food, and place-based repair.",
  },
  {
    title: "Creative sabbaticals",
    description:
      "Space for artists and cultural workers to develop new work on Country.",
  },
];

const retreatFlow = [
  "Arrival and listening walk",
  "Shared meals and community briefing",
  "Studio or field sessions",
  "Collective reflection and art translation",
];

export default function FarmRetreatsPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Retreats"
        title="Gatherings for regeneration"
        description="Retreats at Black Cockatoo Valley are built around learning, rest, and shared governance practice."
        actions={[
          { label: "Plan a retreat", href: "/contact" },
          { label: "Back to farm", href: "/farm", variant: "outline" },
        ]}
        gradientClass="from-[#F0E6DA] via-[#E4D2C2] to-[#D4B79B]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Designed for
          </p>
          <ul className="space-y-2">
            <li>Community partners and teams</li>
            <li>Artists and researchers</li>
            <li>Funders seeking grounded practice</li>
          </ul>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Formats"
          title="Retreat options"
          description="Choose a structure and we will co-design the rest with you."
        />
        <CardGrid cards={retreatFormats} className="grid gap-6 md:grid-cols-3" />
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Flow"
          title="Sample retreat rhythm"
          description="A gentle cadence that keeps listening and action in balance."
        />
        <CardGrid
          cards={retreatFlow.map((step) => ({
            title: step,
            description: "",
          }))}
          className="grid gap-4 md:grid-cols-2"
        />
      </section>
    </div>
  );
}
