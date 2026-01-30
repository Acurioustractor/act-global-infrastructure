import GHLEmbed from "../../../components/GHLEmbed";
import CardGrid from "../../../components/CardGrid";
import PageHero from "../../../components/PageHero";
import SectionHeading from "../../../components/SectionHeading";

const residencyFormats = [
  {
    title: "Studio residency",
    description:
      "Solo or small team residencies with studio access and land-based research time.",
  },
  {
    title: "Community co-design",
    description:
      "Residencies that embed with community partners and shared governance pilots.",
  },
  {
    title: "Public showcase",
    description:
      "Residencies that culminate in an exhibition, performance, or open studio.",
  },
];

const residencyUrl =
  "https://app.gohighlevel.com/v2/preview/ART_RESIDENCY";

export default function ArtResidenciesPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Art residencies"
        title="Residencies for art and social change"
        description="Residencies invite artists to work alongside ACT, land, and community."
        actions={[
          { label: "Apply now", href: "/contact" },
          { label: "Back to art", href: "/art", variant: "outline" },
        ]}
        gradientClass="from-[#F4E8DD] via-[#E3C8B2] to-[#CFA486]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Residency focus
          </p>
          <p>
            We prioritize projects that honor Country, community governance, and
            regenerative practice.
          </p>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Formats"
          title="Residency models"
          description="Choose the residency structure that matches your practice."
        />
        <CardGrid cards={residencyFormats} className="grid gap-6 md:grid-cols-3" />
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Apply"
          title="Residency intake"
          description="Placeholder for the residency form. Replace when ready."
        />
        <GHLEmbed
          title="Residency interest"
          description="Tell us about your practice, timing, and needs."
          src={residencyUrl}
        />
      </section>
    </div>
  );
}
