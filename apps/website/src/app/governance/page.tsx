import CardGrid from "../../components/CardGrid";
import PageHero from "../../components/PageHero";
import SectionHeading from "../../components/SectionHeading";

const governancePrinciples = [
  {
    title: "Shared decision-making",
    description:
      "Governance is built with community partners, artists, and land stewards.",
  },
  {
    title: "Transparency",
    description:
      "We document commitments, outcomes, and learning in public ways.",
  },
  {
    title: "Reciprocity",
    description:
      "Benefits return to the people and place that make the work possible.",
  },
];

const governancePractices = [
  {
    title: "Listening councils",
    description:
      "Seasonal gatherings to listen, review, and set priorities together.",
  },
  {
    title: "Shared stewardship agreements",
    description:
      "Formal agreements that outline shared responsibility and care.",
  },
  {
    title: "Community accountability",
    description:
      "Structures for feedback, consent, and cultural protocols.",
  },
];

export default function GovernancePage() {
  return (
    <div className="space-y-20">
      <PageHero
        eyebrow="Governance"
        title="Growing shared stewardship"
        description="ACT is evolving toward co-stewardship. Governance is practiced through listening, transparency, and shared care."
        actions={[
          { label: "Talk with us", href: "/contact" },
          { label: "Back to about", href: "/about", variant: "outline" },
        ]}
        gradientClass="from-[#EDEBE4] via-[#E3D8C7] to-[#D2C0A3]"
      >
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
            Governance intent
          </p>
          <p>
            We are building governance models that are land-based, community-led,
            and grounded in cultural respect.
          </p>
        </div>
      </PageHero>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Principles"
          title="How we govern"
          description="Commitments that guide our decision-making."
        />
        <CardGrid cards={governancePrinciples} className="grid gap-6 md:grid-cols-3" />
      </section>

      <section className="space-y-10">
        <SectionHeading
          eyebrow="Practice"
          title="Governance in action"
          description="The working practices we are piloting and refining."
        />
        <CardGrid cards={governancePractices} className="grid gap-6 md:grid-cols-3" />
      </section>
    </div>
  );
}
