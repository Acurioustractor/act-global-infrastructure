import CardGrid from "../../components/CardGrid";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const harvestPaths = [
  {
    title: "CSA harvest shares",
    description:
      "Seasonal boxes and shared meals rooted in stewardship of the land.",
    href: "/harvest/csa",
  },
  {
    title: "Seasonal produce",
    description:
      "What we grow, when it arrives, and how we share it with community.",
    href: "/harvest/produce",
  },
  {
    title: "Events + gatherings",
    description:
      "Markets, harvest feasts, and community days on the farm.",
    href: "/events",
  },
];

export default function HarvestPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Harvest"
        title="Food, community, and shared care"
        description="Harvest is how the farm returns value to people and place. We grow seasonal produce, share meals, and host community gatherings."
        actions={[
          { label: "Join the CSA", href: "/harvest/csa" },
          { label: "See produce", href: "/harvest/produce", variant: "outline" },
        ]}
        gradientClass="from-[#FFF2D6] via-[#F5D8A9] to-[#E9BC7D]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Harvest principles
          </p>
          <ul className="space-y-2">
            <li>Shared stewardship and reciprocity</li>
            <li>Seasonal rhythms and regenerative practice</li>
            <li>Community meals and learning</li>
          </ul>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Paths"
          title="How harvest shows up"
          description="Choose how you want to participate in the harvest cycle."
        />
        <CardGrid cards={harvestPaths} />
      </section>
    </div>
  );
}
