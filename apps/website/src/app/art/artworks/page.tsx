import CardGrid from "../../../components/CardGrid";
import PageHero from "../../../components/PageHero";
import SectionHeading from "../../../components/SectionHeading";

const artworkSamples = [
  {
    title: "Living ledger installation",
    description:
      "Interactive archive translating community testimony into light and sound.",
  },
  {
    title: "Harvest signal flags",
    description:
      "Textile flags marking seasonal shifts and shared harvest milestones.",
  },
  {
    title: "Justice cartography",
    description:
      "Maps and story fragments charting justice innovation across regions.",
  },
];

export default function ArtworksPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Artworks"
        title="Artifacts from the studio"
        description="A placeholder for the artwork archive. Each piece connects land, story, and systemic change."
        actions={[
          { label: "Commission work", href: "/art/commissions" },
          { label: "Back to art", href: "/art", variant: "outline" },
        ]}
        gradientClass="from-[#F4E8DD] via-[#E3CBB4] to-[#CFA486]"
      />

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Sample works"
          title="Artwork placeholders"
          description="Replace with real artwork entries once the archive is ready."
        />
        <CardGrid cards={artworkSamples} className="grid gap-6 md:grid-cols-3" />
      </section>
    </div>
  );
}
