import CardGrid from "../../components/CardGrid";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const farmOffers = [
  {
    title: "Stay on the land",
    description:
      "Accommodation, residencies, and seasonal stays designed for deep work.",
    href: "/farm/stay",
  },
  {
    title: "Retreats and intensives",
    description:
      "Curated gatherings for regeneration, governance, and systems practice.",
    href: "/farm/retreats",
  },
  {
    title: "Workshops and learning",
    description:
      "Hands-on learning in soil health, story practice, and collective care.",
    href: "/farm/workshops",
  },
];

const stewardshipCards = [
  {
    title: "Regenerative land care",
    description:
      "Field trials, soil repair, and community-led stewardship on Jinibara Country.",
  },
  {
    title: "R&D + prototyping",
    description:
      "A working lab for justice innovation, shared governance, and new economies.",
  },
  {
    title: "Hospitality as care",
    description:
      "Hosting with intention so learning, rest, and art-making can co-exist.",
  },
];

export default function FarmPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Black Cockatoo Valley"
        title="The farm as a living lab"
        description="ACT stewards a working farm on Jinibara Country. It is a site for regenerative agriculture, research residencies, and gatherings that grow shared governance."
        actions={[
          { label: "Plan a stay", href: "/farm/stay" },
          { label: "Talk with us", href: "/contact", variant: "outline" },
        ]}
        gradientClass="from-[#EDF3E4] via-[#D6E2C5] to-[#B8CEA7]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Stewardship notes
          </p>
          <ul className="space-y-2">
            <li>Working farm and R&D site</li>
            <li>Residencies, accommodation, and retreats</li>
            <li>CSA harvest pilots in partnership with community</li>
          </ul>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Stay + gather"
          title="Ways to be on the land"
          description="Choose the path that matches your season of work, rest, or collaboration."
        />
        <CardGrid cards={farmOffers} />
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Stewardship"
          title="What the farm holds"
          description="Black Cockatoo Valley is a commons for land care, culture, and shared governance practice."
        />
        <CardGrid cards={stewardshipCards} className="grid gap-6 md:grid-cols-3" />
      </section>
    </div>
  );
}
