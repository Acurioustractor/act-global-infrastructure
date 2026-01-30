import CardGrid from "../../../components/CardGrid";
import PageHero from "../../../components/PageHero";
import SectionHeading from "../../../components/SectionHeading";

const artistProfiles = [
  {
    title: "Resident artists",
    description:
      "Artists working on the farm through long-form residencies and research.",
  },
  {
    title: "Community collaborators",
    description:
      "Local cultural practitioners and storytellers shaping project outcomes.",
  },
  {
    title: "Commissioned partners",
    description:
      "Artists partnering with ACT on social change commissions.",
  },
];

export default function ArtistsPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Artists"
        title="People working with ACT"
        description="This page will host artist profiles, bios, and residency archives."
        actions={[
          { label: "Apply for a residency", href: "/art/residencies" },
          { label: "Back to art", href: "/art", variant: "outline" },
        ]}
        gradientClass="from-[#F4E8DD] via-[#E3C7B4] to-[#CFA989]"
      />

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Artist pathways"
          title="Ways to collaborate"
          description="We work with artists in multiple formats and timeframes."
        />
        <CardGrid cards={artistProfiles} className="grid gap-6 md:grid-cols-3" />
      </section>
    </div>
  );
}
