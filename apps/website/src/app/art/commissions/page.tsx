import CardGrid from "../../../components/CardGrid";
import PageHero from "../../../components/PageHero";
import SectionHeading from "../../../components/SectionHeading";

const commissionTypes = [
  {
    title: "Public installations",
    description:
      "Site-responsive work that brings community stories into public view.",
  },
  {
    title: "Research artifacts",
    description:
      "Visual systems, maps, and storytelling objects for R&D projects.",
  },
  {
    title: "Community commissions",
    description:
      "Collaborative commissions shaped by local partners and residents.",
  },
];

export default function ArtCommissionsPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Commissions"
        title="Commission art with ACT"
        description="We create commissions that translate research, justice work, and community stories into culture."
        actions={[
          { label: "Start a commission", href: "/contact" },
          { label: "Back to art", href: "/art", variant: "outline" },
        ]}
        gradientClass="from-[#F4E8DD] via-[#E1C6B0] to-[#C7997A]"
      />

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Commission types"
          title="Ways we collaborate"
          description="Choose a commission pathway or propose a new format."
        />
        <CardGrid cards={commissionTypes} className="grid gap-6 md:grid-cols-3" />
      </section>
    </div>
  );
}
