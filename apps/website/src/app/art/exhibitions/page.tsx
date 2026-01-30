import CardGrid from "../../../components/CardGrid";
import PageHero from "../../../components/PageHero";
import SectionHeading from "../../../components/SectionHeading";

const exhibitionList = [
  {
    title: "Farm gallery season",
    description:
      "On-farm exhibitions showcasing residency outcomes and community work.",
  },
  {
    title: "Traveling installations",
    description:
      "Mobile exhibitions that bring ACT stories into partner spaces.",
  },
  {
    title: "Community pop-ups",
    description:
      "Short-run exhibitions co-designed with local partners and funders.",
  },
];

export default function ExhibitionsPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Exhibitions"
        title="Spaces for collective reflection"
        description="Exhibitions translate listening into public moments. This page will hold upcoming and past shows."
        actions={[
          { label: "Host an exhibition", href: "/contact" },
          { label: "Back to art", href: "/art", variant: "outline" },
        ]}
        gradientClass="from-[#F4E8DD] via-[#DEC3AF] to-[#C89B7F]"
      />

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Formats"
          title="Exhibition models"
          description="The ways we share art across the farm, region, and partner spaces."
        />
        <CardGrid cards={exhibitionList} className="grid gap-6 md:grid-cols-3" />
      </section>
    </div>
  );
}
