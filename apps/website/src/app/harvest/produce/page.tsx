import CardGrid from "../../../components/CardGrid";
import PageHero from "../../../components/PageHero";
import SectionHeading from "../../../components/SectionHeading";

const seasonalRhythms = [
  {
    title: "Autumn",
    description: "Roots, herbs, and storage crops for shared pantries.",
  },
  {
    title: "Winter",
    description: "Leafy greens, brassicas, and warming staples.",
  },
  {
    title: "Spring",
    description: "Tender shoots, early fruit, and planting days.",
  },
  {
    title: "Summer",
    description: "Tomatoes, corn, berries, and gathering events.",
  },
];

const practices = [
  {
    title: "Regenerative soil care",
    description:
      "We invest in soil health, water retention, and biodiversity each season.",
  },
  {
    title: "Community harvests",
    description:
      "Harvest days invite neighbors and partners into the field and kitchen.",
  },
];

export default function HarvestProducePage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Produce"
        title="Seasonal rhythms"
        description="A snapshot of what grows across the year and how we share it with community."
        actions={[
          { label: "Back to harvest", href: "/harvest" },
          { label: "Join the CSA", href: "/harvest/csa", variant: "outline" },
        ]}
        gradientClass="from-[#FFF4DE] via-[#F0D9B7] to-[#DCC29A]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Crop planning
          </p>
          <p>
            Seasonal planning is collaborative. Crop mixes respond to community
            needs, soil health, and learning goals.
          </p>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Calendar"
          title="What grows when"
          description="A placeholder seasonal calendar for upcoming harvests."
        />
        <CardGrid cards={seasonalRhythms} className="grid gap-6 md:grid-cols-2" />
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Practice"
          title="How we grow"
          description="Land care practices that keep harvest aligned with stewardship."
        />
        <CardGrid cards={practices} className="grid gap-6 md:grid-cols-2" />
      </section>
    </div>
  );
}
