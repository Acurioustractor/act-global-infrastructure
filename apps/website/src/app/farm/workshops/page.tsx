import CardGrid from "../../../components/CardGrid";
import PageHero from "../../../components/PageHero";
import SectionHeading from "../../../components/SectionHeading";

const workshopThemes = [
  {
    title: "Soil to story",
    description:
      "Hands-on soil care, composting, and land-based storytelling methods.",
  },
  {
    title: "Justice innovation labs",
    description:
      "Collaborative systems prototyping grounded in community needs.",
  },
  {
    title: "Art and cultural practice",
    description:
      "Creative workshops that translate listening into shared culture.",
  },
  {
    title: "Co-governance skills",
    description:
      "Tools for shared decision-making and community stewardship.",
  },
];

export default function FarmWorkshopsPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Workshops"
        title="Learning on Country"
        description="Workshops at the farm blend land care, justice practice, and creative inquiry."
        actions={[
          { label: "Host a workshop", href: "/contact" },
          { label: "Back to farm", href: "/farm", variant: "outline" },
        ]}
        gradientClass="from-[#EEF4EA] via-[#D8E7CF] to-[#BED4B2]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Community-led
          </p>
          <p>
            We co-design workshops with local partners and invite facilitators
            who are grounded in place-based practice.
          </p>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Themes"
          title="Workshop streams"
          description="Sample topics that we adapt to each season and group."
        />
        <CardGrid cards={workshopThemes} className="grid gap-6 md:grid-cols-2" />
      </section>
    </div>
  );
}
