import GHLEmbed from "../../../components/GHLEmbed";
import CardGrid from "../../../components/CardGrid";
import PageHero from "../../../components/PageHero";
import SectionHeading from "../../../components/SectionHeading";

const shareTypes = [
  {
    title: "Weekly share",
    description:
      "A steady rhythm of fresh produce and seasonal pantry items.",
  },
  {
    title: "Fortnightly share",
    description:
      "Flexible share size for households that travel or cook less often.",
  },
  {
    title: "Community share",
    description:
      "Sponsored boxes for neighbors and partners in the region.",
  },
];

const csaUrl = "https://app.gohighlevel.com/v2/preview/CSA_INTEREST";

export default function HarvestCsaPage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="CSA"
        title="Harvest shares"
        description="Community Supported Agriculture shares connect you to the land and to each other. We pilot small batches while we build the long-term model."
        actions={[
          { label: "Register interest", href: "/contact" },
          { label: "Back to harvest", href: "/harvest", variant: "outline" },
        ]}
        gradientClass="from-[#FFF2D6] via-[#F0D4A3] to-[#E2B47A]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Current pilot
          </p>
          <p>
            Harvest shares are in pilot phase. We will refine the model with
            community partners before scaling.
          </p>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Share types"
          title="Choose your rhythm"
          description="We will match share sizes with the season and community needs."
        />
        <CardGrid cards={shareTypes} className="grid gap-6 md:grid-cols-3" />
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="GHL"
          title="CSA interest form"
          description="Placeholder for the CSA form. Replace with the final link when ready."
        />
        <GHLEmbed
          title="Join the harvest"
          description="Add your name to the CSA waitlist and choose your share type."
          src={csaUrl}
        />
      </section>
    </div>
  );
}
